# ---------------------------------------------------------------------------
# Uptime monitoring + alerting for the production health endpoint
# ---------------------------------------------------------------------------

resource "google_monitoring_notification_channel" "admin_email" {
  display_name = "Portfolio admin email"
  type         = "email"

  labels = {
    email_address = var.admin_email
  }
}

resource "google_monitoring_uptime_check_config" "health" {
  display_name = "${var.service_name} /api/health"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/api/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(replace(var.production_url, "https://", ""), "http://", "")
    }
  }

  depends_on = [google_project_service.services]
}

resource "google_monitoring_alert_policy" "health_down" {
  display_name          = "${var.service_name} health check failing"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.admin_email.id]

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter          = <<-EOT
        resource.type = "uptime_url"
        AND metric.type = "monitoring.googleapis.com/uptime_check/check_passed"
        AND metric.label.check_id = "${google_monitoring_uptime_check_config.health.uptime_check_id}"
      EOT
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host", "resource.label.project_id"]
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
}
