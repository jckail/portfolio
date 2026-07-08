variable "project_id" {
  description = "GCP project id"
  type        = string
  default     = "portfolio-383615"
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "quickresume"
}

variable "artifact_repository" {
  description = "Artifact Registry repository for container images"
  type        = string
  default     = "portfolio"
}

variable "image_tag" {
  description = "Image tag (usually the git commit SHA) to deploy"
  type        = string
  default     = "latest"
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed CORS origins"
  type        = string
  default     = ""
}

variable "production_url" {
  description = "Public URL of the deployed service"
  type        = string
  default     = ""
}

variable "admin_email" {
  description = "Admin user email for the admin panel"
  type        = string
}

variable "resume_file" {
  description = "Resume file name served by the backend"
  type        = string
  default     = "JordanKailResume.pdf"
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 3
}

variable "memory" {
  description = "Memory per Cloud Run instance"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU per Cloud Run instance"
  type        = string
  default     = "1"
}

# Secret values are provided out-of-band (TF_VAR_..., tfvars file excluded
# from git, or a CI secret store) and written to Secret Manager.
variable "secrets" {
  description = "Sensitive configuration written to Secret Manager and mounted as env vars"
  type = object({
    supabase_url          = string
    supabase_anon_key     = string
    supabase_service_role = string
    anthropic_api_key     = string
    sendgrid_api_key      = string
  })
  sensitive = true
}
