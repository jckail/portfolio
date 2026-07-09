locals {
  # Keys of var.secrets; kept as a static list because for_each cannot
  # iterate a sensitive value directly
  secret_names = [
    "supabase_url",
    "supabase_anon_key",
    "supabase_service_role",
    "anthropic_api_key",
    "sendgrid_api_key",
  ]

  # Environment variables sourced from Secret Manager
  secret_env = {
    SUPABASE_URL          = google_secret_manager_secret.secrets["supabase_url"].secret_id
    SUPABASE_ANON_KEY     = google_secret_manager_secret.secrets["supabase_anon_key"].secret_id
    SUPABASE_SERVICE_ROLE = google_secret_manager_secret.secrets["supabase_service_role"].secret_id
    ANTHROPIC_API_KEY     = google_secret_manager_secret.secrets["anthropic_api_key"].secret_id
    SENDGRID_API_KEY      = google_secret_manager_secret.secrets["sendgrid_api_key"].secret_id
  }

  # Plain (non-secret) environment variables
  plain_env = {
    ALLOWED_ORIGINS = var.allowed_origins
    PRODUCTION_URL  = var.production_url
    ADMIN_EMAIL     = var.admin_email
    RESUME_FILE     = var.resume_file
    GIT_COMMIT      = var.image_tag
  }

  image_uri = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_repository}/${var.service_name}:${var.image_tag}"
}

# ---------------------------------------------------------------------------
# Project services
# ---------------------------------------------------------------------------

resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "monitoring.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}

# ---------------------------------------------------------------------------
# Artifact Registry
# ---------------------------------------------------------------------------

resource "google_artifact_registry_repository" "images" {
  location      = var.region
  repository_id = var.artifact_repository
  description   = "Container images for the portfolio app"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.services]
}

# ---------------------------------------------------------------------------
# Service account for Cloud Run
# ---------------------------------------------------------------------------

resource "google_service_account" "run" {
  account_id   = "${var.service_name}-run"
  display_name = "Cloud Run runtime for ${var.service_name}"
}

# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------

resource "google_secret_manager_secret" "secrets" {
  for_each = toset(local.secret_names)

  secret_id = replace(each.key, "_", "-")

  replication {
    auto {}
  }

  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "secret_versions" {
  for_each = toset(local.secret_names)

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = var.secrets[each.key]
}

resource "google_secret_manager_secret_iam_member" "run_access" {
  for_each = toset(local.secret_names)

  secret_id = google_secret_manager_secret.secrets[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run service
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.run.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = local.image_uri

      resources {
        limits = {
          memory = var.memory
          cpu    = var.cpu
        }
        cpu_idle = true
      }

      dynamic "env" {
        for_each = local.plain_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 6
      }
    }
  }

  depends_on = [
    google_project_service.services,
    google_secret_manager_secret_version.secret_versions,
  ]
}

# Public website: allow unauthenticated invocations
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
