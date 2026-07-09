# ---------------------------------------------------------------------------
# GitHub Actions deployment via Workload Identity Federation
#
# Created only when var.github_repository is set (e.g. "owner/repo").
# This lets the deploy workflow authenticate to GCP with short-lived OIDC
# tokens instead of exported service-account keys.
# ---------------------------------------------------------------------------

locals {
  github_enabled = var.github_repository != "" ? 1 : 0
}

resource "google_iam_workload_identity_pool" "github" {
  count = local.github_enabled

  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Identity pool for GitHub Actions deployments"

  depends_on = [google_project_service.services]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count = local.github_enabled

  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Only tokens issued for this repository may authenticate
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "deployer" {
  count = local.github_enabled

  account_id   = "${var.service_name}-deployer"
  display_name = "GitHub Actions deployer for ${var.service_name}"
}

# Allow workflows from the configured repository to impersonate the deployer
resource "google_service_account_iam_member" "deployer_wif" {
  count = local.github_enabled

  service_account_id = google_service_account.deployer[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repository}"
}

# Push images to Artifact Registry
resource "google_project_iam_member" "deployer_ar" {
  count = local.github_enabled

  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Deploy new Cloud Run revisions
resource "google_project_iam_member" "deployer_run" {
  count = local.github_enabled

  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Deploying requires acting as the Cloud Run runtime service account
resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  count = local.github_enabled

  service_account_id = google_service_account.run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[0].email}"
}

# ---------------------------------------------------------------------------
# Read-only planner identity for `terraform plan` on pull requests.
#
# Scoped to project Viewer (no write access to any resource) plus just
# enough Storage access to read/lock the remote state object — it can never
# create, modify, or destroy infrastructure.
# ---------------------------------------------------------------------------

resource "google_service_account" "planner" {
  count = local.github_enabled

  account_id   = "${var.service_name}-planner"
  display_name = "Read-only Terraform planner for ${var.service_name} PRs"
}

resource "google_service_account_iam_member" "planner_wif" {
  count = local.github_enabled

  service_account_id = google_service_account.planner[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "planner_viewer" {
  count = local.github_enabled

  project = var.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.planner[0].email}"
}

resource "google_storage_bucket_iam_member" "planner_state" {
  count = local.github_enabled

  # storage.admin (not objectAdmin) because `terraform plan` needs to read
  # this binding's own IAM policy on the bucket (storage.buckets.getIamPolicy),
  # which objectAdmin doesn't grant. Scoped to only this one state bucket,
  # not project-wide.
  bucket = "${var.project_id}-terraform-state"
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.planner[0].email}"
}
