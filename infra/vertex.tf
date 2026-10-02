# ---------------------------------------------------------------------------
# Vertex AI chat provider
#
# Everything here was created by hand on 2026-10-01 while the chat was being
# moved to Gemini. The import blocks adopt it so a future plan is a no-op.
#
# DELIBERATELY NOT MANAGED: the API keys. A google_apikeys_key resource would
# write the key string into Terraform state, and the state bucket is already a
# known exposure (HANDOFF.md). Create and rotate keys with gcloud, see
# infra/README.md "Vertex API key".
# ---------------------------------------------------------------------------

locals {
  # Only the inference API. apikeys.googleapis.com is deliberately not listed:
  # keys are created with gcloud (see above), and `terraform plan` showed the
  # import of that service fails here because it is not an enabled service.
  vertex_services = ["aiplatform.googleapis.com"]
}

import {
  for_each = toset(local.vertex_services)
  to       = google_project_service.vertex[each.key]
  id       = "${var.project_id}/${each.key}"
}

resource "google_project_service" "vertex" {
  for_each = toset(local.vertex_services)

  service            = each.value
  disable_on_destroy = false
}

# The service account the Vertex API key is bound to. A bound key acts as this
# identity and nothing else; an unbound key is rejected with 401.
import {
  to = google_service_account.vertex
  id = "projects/${var.project_id}/serviceAccounts/portfolio-vertex@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_service_account" "vertex" {
  account_id   = "portfolio-vertex"
  display_name = "Vertex AI caller for the portfolio chat"

  lifecycle {
    # Cosmetic fields were typed by hand in the console or CLI.
    ignore_changes = [display_name, description]
  }
}

import {
  to = google_project_iam_member.vertex_user
  id = "${var.project_id} roles/aiplatform.user serviceAccount:portfolio-vertex@${var.project_id}.iam.gserviceaccount.com"
}

# Needed to call generateContent. The narrower alternative is a custom role
# holding only aiplatform.endpoints.predict; see README before swapping, since
# a wrong permission set breaks the chat.
resource "google_project_iam_member" "vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.vertex.email}"
}

# Container and runtime binding only. The value is a secret version added with
#   printf '%s' "$KEY" | gcloud secrets versions add vertex-api-key --data-file=-
# so it never touches git or state.
import {
  to = google_secret_manager_secret.vertex_api_key
  id = "projects/${var.project_id}/secrets/vertex-api-key"
}

resource "google_secret_manager_secret" "vertex_api_key" {
  secret_id = "vertex-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

import {
  to = google_secret_manager_secret_iam_member.vertex_api_key_run_access
  id = "projects/${var.project_id}/secrets/vertex-api-key roles/secretmanager.secretAccessor serviceAccount:${var.service_name}-run@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "vertex_api_key_run_access" {
  secret_id = google_secret_manager_secret.vertex_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}
