terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Recommended: store state in a GCS bucket instead of locally.
  # Create the bucket once, then uncomment:
  #
  backend "gcs" {
    bucket = "portfolio-383615-terraform-state"
    prefix = "portfolio"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
