# Secret contents are provisioned out of band, never in Terraform state.
import {
  to = google_secret_manager_secret.agent_access
  id = "projects/${var.project_id}/secrets/portfolio-agent-access"
}

resource "google_secret_manager_secret" "agent_access" {
  secret_id = "portfolio-agent-access"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

import {
  to = google_secret_manager_secret_iam_member.agent_access_run
  id = "projects/${var.project_id}/secrets/portfolio-agent-access roles/secretmanager.secretAccessor serviceAccount:${var.service_name}-run@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "agent_access_run" {
  secret_id = google_secret_manager_secret.agent_access.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}
