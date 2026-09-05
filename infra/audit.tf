# Record future access to secrets, state, and federated credentials. These logs
# are security-sensitive; retain them privately under the project's log policy.
resource "google_project_iam_audit_config" "sensitive_access" {
  for_each = {
    "secretmanager.googleapis.com" = ["DATA_READ"]
    "sts.googleapis.com"           = ["ADMIN_READ", "DATA_READ"]
    "iam.googleapis.com"           = ["DATA_READ"]
    "storage.googleapis.com"       = ["DATA_READ", "DATA_WRITE"]
  }

  project = var.project_id
  service = each.key

  dynamic "audit_log_config" {
    for_each = each.value
    content {
      log_type = audit_log_config.value
    }
  }
}
