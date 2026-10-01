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

variable "github_repository" {
  description = "GitHub repository (owner/repo) allowed to deploy via Workload Identity Federation. Leave empty to skip creating WIF resources."
  type        = string
  default     = ""
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

variable "github_repository_id" {
  description = "Immutable GitHub repository ID for WIF trust. Override when deploying a different repository."
  type        = string
  default     = "866788248"

  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "github_repository_id must be the numeric GitHub repository ID."
  }
}

# ---------------------------------------------------------------------------
# Artifact Registry cleanup
# ---------------------------------------------------------------------------

variable "artifact_cleanup_dry_run" {
  description = "When true, Artifact Registry only logs what the cleanup policies WOULD delete. Apply with true, review the audit log, then set false."
  type        = bool
  default     = true
}

variable "artifact_keep_count" {
  description = "Newest image versions the cleanup policy always keeps (covers the serving and previous revisions)"
  type        = number
  default     = 10

  validation {
    condition     = var.artifact_keep_count >= 5
    error_message = "Keep at least 5 versions so rollback targets survive."
  }
}

variable "artifact_delete_after_days" {
  description = "Image versions older than this (and outside the keep set) are deleted"
  type        = number
  default     = 30

  validation {
    condition     = var.artifact_delete_after_days >= 7
    error_message = "Delete threshold must be at least 7 days."
  }
}

# ---------------------------------------------------------------------------
# Observability
# ---------------------------------------------------------------------------

variable "extra_uptime_hosts" {
  description = "Additional hostnames that map to the service and get their own /api/health/ready uptime check"
  type        = list(string)
  default     = ["jckail.com", "jordan-kail.com", "www.jordan-kail.com"]
}

variable "alert_5xx_ratio" {
  description = "Alert when the share of 5xx responses exceeds this for 10 minutes. Traffic is about 3 requests a minute, so keep this well above 1 error in 20."
  type        = number
  default     = 0.05
}

variable "alert_latency_p95_seconds" {
  description = "Alert when HTTP (non-WebSocket) p95 latency stays above this for 10 minutes"
  type        = number
  default     = 3
}

variable "exclude_health_probe_logs" {
  description = "Exclude successful /api/health* request log lines (mostly uptime probes) from the _Default bucket. Log-based metrics still count them."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Spend guardrails
# ---------------------------------------------------------------------------

variable "billing_account_id" {
  description = "Billing account id (e.g. 01A57F-4268F1-EE57B3). Leave empty to skip budgets: creating one needs billing.budgets.create on the account."
  type        = string
  default     = ""
}

variable "budget_monthly_usd" {
  description = "Overall monthly budget for this project, in USD"
  type        = number
  default     = 15
}

variable "vertex_budget_monthly_usd" {
  description = "Monthly budget for the Vertex AI / Generative Language services, in USD"
  type        = number
  default     = 5
}

variable "vertex_budget_service_ids" {
  description = "Cloud Billing catalog service ids (services/XXXX-XXXX-XXXX) of Vertex AI and Generative Language. Empty skips the filtered budget. See infra/README.md for how to look them up."
  type        = list(string)
  default     = []
}
