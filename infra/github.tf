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

  # Names can be reused after deletion; also bind the immutable repository ID.
  # PRs, other branches, and other workflow files cannot exchange OIDC tokens.
  # Enforce attempt 1 at the cloud trust boundary: reruns execute historical YAML.
  # Retry via a fresh dispatch on main, not Re-run jobs on an older execution.
  attribute_condition = join(" && ", [
    "assertion.repository == '${var.github_repository}'",
    "assertion.repository_id == '${var.github_repository_id}'",
    "assertion.ref == 'refs/heads/main'",
    "assertion.workflow_ref == '${var.github_repository}/.github/workflows/deploy.yml@refs/heads/main'",
    "assertion.event_name in ['push', 'workflow_dispatch']",
    "assertion.environment == 'production'",
    "assertion.run_attempt == '1'",
  ])

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

# CI only publishes to this application's existing image repository.
resource "google_artifact_registry_repository_iam_member" "deployer_ar" {
  count = local.github_enabled

  project    = var.project_id
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer[0].email}"
}

# CI updates this existing service; bootstrap and IAM changes remain administrative.
resource "google_cloud_run_v2_service_iam_member" "deployer_run" {
  count = local.github_enabled

  project  = var.project_id
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Deploying requires acting as the Cloud Run runtime service account
resource "google_service_account_iam_member" "deployer_act_as_runtime" {
  count = local.github_enabled

  service_account_id = google_service_account.run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Retain the retired identity for audit correlation, with no IAM grants.
resource "google_service_account" "planner" {
  count = local.github_enabled

  account_id   = "${var.service_name}-planner"
  display_name = "Retired Terraform planner (disabled)"
  disabled     = true
}
