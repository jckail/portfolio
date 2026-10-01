# ---------------------------------------------------------------------------
# Spend guardrails
#
# Created ONLY when var.billing_account_id is set, because a budget needs
# billing.budgets.create (Billing Account Costs Manager or Admin) on the
# billing account, which the project owner role does not grant. If apply
# reports a 403, create the budgets once from the console (steps in
# infra/README.md) and set billing_account_id back to "".
#
# A budget NOTIFIES; it does not stop spend. The hard limits are the Vertex
# quota caps and the in-app CHAT_DAILY_TOKEN_BUDGET documented in README.md.
# ---------------------------------------------------------------------------

provider "google" {
  alias = "billing"

  project = var.project_id
  region  = var.region

  # The Billing Budget API rejects calls made without a quota project.
  user_project_override = true
  billing_project       = var.project_id
}

locals {
  budgets_enabled = var.billing_account_id != "" ? 1 : 0
  thresholds      = [0.5, 0.9, 1.0]
}

resource "google_project_service" "billing_budgets" {
  count = local.budgets_enabled

  service            = "billingbudgets.googleapis.com"
  disable_on_destroy = false
}

data "google_project" "this" {
  count = local.budgets_enabled

  project_id = var.project_id
}

resource "google_billing_budget" "project" {
  provider = google.billing
  count    = local.budgets_enabled

  billing_account = var.billing_account_id
  display_name    = "${var.service_name} project monthly"

  budget_filter {
    projects               = ["projects/${data.google_project.this[0].number}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_monthly_usd)
    }
  }

  dynamic "threshold_rules" {
    for_each = local.thresholds
    content {
      threshold_percent = threshold_rules.value
    }
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = local.notify
    disable_default_iam_recipients   = false
  }

  depends_on = [google_project_service.billing_budgets]
}

resource "google_billing_budget" "vertex" {
  provider = google.billing
  count    = local.budgets_enabled == 1 && length(var.vertex_budget_service_ids) > 0 ? 1 : 0

  billing_account = var.billing_account_id
  display_name    = "${var.service_name} Vertex AI monthly"

  budget_filter {
    projects               = ["projects/${data.google_project.this[0].number}"]
    services               = var.vertex_budget_service_ids
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.vertex_budget_monthly_usd)
    }
  }

  dynamic "threshold_rules" {
    for_each = local.thresholds
    content {
      threshold_percent = threshold_rules.value
    }
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = local.notify
    disable_default_iam_recipients   = false
  }

  depends_on = [google_project_service.billing_budgets]
}
