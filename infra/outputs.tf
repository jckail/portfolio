output "service_url" {
  description = "Public URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "image_uri" {
  description = "Container image the service was deployed with"
  value       = local.image_uri
}

output "artifact_registry_repository" {
  description = "Docker repository for pushing images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "runtime_service_account" {
  description = "Service account the Cloud Run service runs as"
  value       = google_service_account.run.email
}
