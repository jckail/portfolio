# ---------------------------------------------------------------------------
# Depot CI deployment via Workload Identity Federation (JCK-2034)
#
# The production deploy runs in Depot CI (.depot/workflows/ci.yml, job
# `deploy`, after `ci-result`). Depot issues each job a short-lived OIDC token
# from https://identity.depot.dev with GitHub-Actions-compatible claims plus
# `org_id`. Only this repository's main branch in the Quarg Depot org may
# exchange it for the deployer service account. Depot CI has no `environment:`;
# the main-branch condition plays that role, as the GitHub environment's
# branch policy did.
# ---------------------------------------------------------------------------

resource "google_iam_workload_identity_pool" "depot" {
  count = local.github_enabled

  workload_identity_pool_id = "depot-ci"
  display_name              = "Depot CI"
  description               = "Identity pool for Depot CI deployments"

  depends_on = [google_project_service.services]
}

resource "google_iam_workload_identity_pool_provider" "depot" {
  count = local.github_enabled

  workload_identity_pool_id          = google_iam_workload_identity_pool.depot[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "depot-oidc"
  display_name                       = "Depot CI OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Pushes to main and manual dispatches of main in the Quarg Depot org only;
  # PR runs and `depot ci run` from a workstation (ref = a commit SHA) cannot.
  attribute_condition = join(" && ", [
    "assertion.org_id == 'f3bqc4vdfr'",
    "assertion.repository == '${var.github_repository}'",
    "assertion.ref == 'refs/heads/main'",
    "assertion.event_name in ['push', 'workflow_dispatch']",
  ])

  oidc {
    issuer_uri = "https://identity.depot.dev"
  }
}

# Allow Depot CI runs of the configured repository to impersonate the deployer
resource "google_service_account_iam_member" "deployer_depot_wif" {
  count = local.github_enabled

  service_account_id = google_service_account.deployer[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.depot[0].name}/attribute.repository/${var.github_repository}"
}

# Created out of band with gcloud on 2026-10-23 (JCK-2034) because a plain
# apply here can revert production (HANDOFF.md). The owner's next reviewed,
# targeted apply adopts them instead of recreating them.
import {
  to = google_iam_workload_identity_pool.depot[0]
  id = "projects/portfolio-383615/locations/global/workloadIdentityPools/depot-ci"
}

import {
  to = google_iam_workload_identity_pool_provider.depot[0]
  id = "projects/portfolio-383615/locations/global/workloadIdentityPools/depot-ci/providers/depot-oidc"
}

import {
  to = google_service_account_iam_member.deployer_depot_wif[0]
  id = "projects/portfolio-383615/serviceAccounts/quickresume-deployer@portfolio-383615.iam.gserviceaccount.com roles/iam.workloadIdentityUser principalSet://iam.googleapis.com/projects/292025398859/locations/global/workloadIdentityPools/depot-ci/attribute.repository/jckail/portfolio"
}
