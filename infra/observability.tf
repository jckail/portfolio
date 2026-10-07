# ---------------------------------------------------------------------------
# Observability: log-based metrics, alert policies, dashboard, log hygiene
#
# The application emits one JSON line per event with an `event` field (see
# backend/app/utils/events.py). Cloud Run turns stdout JSON into jsonPayload,
# so every metric below filters on jsonPayload.event and never needs the
# message text. No event field may carry an email, a message body, a raw IP or
# a secret; labels are limited to the small closed sets named here.
#
# Alerts use only status >= 500, ERROR severity or application events. Never
# alert on 404s: scanners probing /.env and /wp-config.php produce a steady
# stream of them.
# ---------------------------------------------------------------------------

locals {
  run_scope = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${var.service_name}"
  EOT

  # event name => labels extracted from jsonPayload.<label>
  app_events = {
    "agent.access_granted"   = []
    "agent.access_failed"    = []
    "auth.login_failed"      = []
    "auth.login_succeeded"   = []
    "rate_limit.blocked"     = ["limiter"]
    "ws.rejected_origin"     = []
    "chat.session_open"      = []
    "chat.message"           = ["len_bucket"]
    "chat.tool_call"         = ["tool"]
    "chat.confirm_requested" = ["tool"]
    "chat.confirm_accepted"  = ["tool"]
    "chat.confirm_cancelled" = ["tool"]
    "chat.provider_error"    = ["kind"]
    "chat.circuit_open"      = []
    "chat.budget_exhausted"  = []
    "contact.sent"           = []
    "contact.failed"         = []
    "phone.requested"        = []
    "phone.revealed"         = []
    "phone.failed"           = []
    "event.received"         = ["name"]
  }

  metric_name = { for e, _ in local.app_events : e => "portfolio_${replace(e, ".", "_")}" }
  metric_type = { for e, n in local.metric_name : e => "logging.googleapis.com/user/${n}" }

  notify = [google_monitoring_notification_channel.admin_email.id]

  # Secrets whose access should only ever come from the runtime service account.
  runtime_secret_ids = concat(
    [for s in local.secret_names : replace(s, "_", "-")],
    ["contact-phone", "vertex-api-key", "portfolio-agent-access"],
  )
}

# ---------------------------------------------------------------------------
# Log-based metrics (counters)
# ---------------------------------------------------------------------------

resource "google_logging_metric" "app_event" {
  for_each = local.app_events

  name        = local.metric_name[each.key]
  description = "Count of '${each.key}' application events on ${var.service_name}"

  filter = join(" AND ", [
    "resource.type=\"cloud_run_revision\"",
    "resource.labels.service_name=\"${var.service_name}\"",
    "jsonPayload.event=\"${each.key}\"",
  ])

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"

    dynamic "labels" {
      for_each = each.value
      content {
        key         = labels.value
        value_type  = "STRING"
        description = "jsonPayload.${labels.value}"
      }
    }
  }

  label_extractors = { for l in each.value : l => "EXTRACT(jsonPayload.${l})" }

  depends_on = [google_project_service.services]
}

# HTTP latency without WebSocket sessions. Cloud Run's built-in
# request_latencies counts a chat socket as one request lasting as long as the
# socket (up to 300s), which would pin p95 at minutes. This distribution comes
# from the request log with /ws/ excluded.
resource "google_logging_metric" "http_latency" {
  name        = "portfolio_http_latency"
  description = "Request latency in seconds for non-WebSocket requests"

  filter = join(" AND ", [
    "resource.type=\"cloud_run_revision\"",
    "resource.labels.service_name=\"${var.service_name}\"",
    "log_id(\"run.googleapis.com/requests\")",
    "NOT httpRequest.requestUrl:\"/ws/\"",
    "NOT httpRequest.requestUrl:\"/api/health\"",
  ])

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "DISTRIBUTION"
    unit        = "s"
  }

  value_extractor = "EXTRACT(httpRequest.latency)"

  bucket_options {
    exponential_buckets {
      num_finite_buckets = 24
      growth_factor      = 1.6
      scale              = 0.01
    }
  }

  depends_on = [google_project_service.services]
}

# ---------------------------------------------------------------------------
# Uptime checks for the other hostnames. www.jckail.com is covered by the check
# in monitoring.tf. Probe readiness: it returns 503 when Supabase is down.
# ---------------------------------------------------------------------------

resource "google_monitoring_uptime_check_config" "extra_hosts" {
  for_each = toset(var.extra_uptime_hosts)

  display_name = "${each.value} /api/health/ready"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/api/health/ready"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = each.value
    }
  }

  depends_on = [google_project_service.services]
}

resource "google_monitoring_alert_policy" "extra_hosts_down" {
  count = length(var.extra_uptime_hosts) > 0 ? 1 : 0

  display_name          = "${var.service_name} secondary hostname check failing"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "A non-primary hostname (jckail.com, jordan-kail.com, ...) fails `/api/health/ready`. If www.jckail.com is healthy this is a domain mapping or certificate problem, not an outage."
  }

  conditions {
    display_name = "Secondary host uptime failure"

    condition_threshold {
      filter = <<-EOT
        resource.type = "uptime_url"
        AND metric.type = "monitoring.googleapis.com/uptime_check/check_passed"
        AND metric.label.check_id = one_of(${join(", ", [for c in google_monitoring_uptime_check_config.extra_hosts : "\"${c.uptime_check_id}\""])})
      EOT

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.host"]
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

# ---------------------------------------------------------------------------
# Alert policies
# ---------------------------------------------------------------------------

resource "google_monitoring_alert_policy" "http_5xx" {
  display_name          = "${var.service_name} 5xx responses"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "More than ${var.alert_5xx_ratio * 100}% of responses were 5xx for 10 minutes. Contact and phone endpoints return 502 when SendGrid fails, so check the `contact.failed` and `phone.failed` panels on the dashboard before suspecting the app."
  }

  conditions {
    display_name = "5xx ratio above threshold"

    condition_threshold {
      filter             = <<-EOT
        resource.type="cloud_run_revision" AND resource.labels.service_name="${var.service_name}"
        AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"
      EOT
      denominator_filter = <<-EOT
        resource.type="cloud_run_revision" AND resource.labels.service_name="${var.service_name}"
        AND metric.type="run.googleapis.com/request_count"
      EOT
      comparison         = "COMPARISON_GT"
      threshold_value    = var.alert_5xx_ratio
      duration           = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
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

resource "google_monitoring_alert_policy" "latency_p95" {
  display_name          = "${var.service_name} p95 latency high"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "p95 latency of non-WebSocket requests exceeded ${var.alert_latency_p95_seconds}s for 10 minutes. Cold starts show on the dashboard's startup latency panel; with min instances 0 a quiet period followed by one request can be slow without being an incident."
  }

  conditions {
    display_name = "p95 request latency"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.http_latency.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.alert_latency_p95_seconds
      duration        = "600s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MAX"
        group_by_fields      = ["resource.label.service_name"]
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

# Crash loop, OOM kill or failed startup. These are Cloud Run system log lines.
resource "google_monitoring_alert_policy" "container_crash" {
  display_name          = "${var.service_name} container crashed or restarted"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "Cloud Run logged a container exit, an out-of-memory kill or a failed startup probe. Roll back by shifting traffic to the previous revision (HANDOFF.md)."
  }

  conditions {
    display_name = "Container exit or OOM in system log"

    condition_matched_log {
      filter = <<-EOT
        ${trimspace(local.run_scope)}
        (textPayload:"Container called exit(" OR textPayload:"Memory limit of" OR textPayload:"Container terminated on signal" OR textPayload:"failed to start and listen on the port")
      EOT
    }
  }

  alert_strategy {
    auto_close = "1800s"
    notification_rate_limit {
      period = "1800s"
    }
  }
}

resource "google_monitoring_alert_policy" "instances_at_max" {
  display_name          = "${var.service_name} scaled to max instances"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "Active instances have been at the configured maximum (${var.max_instances}) for 10 minutes. At about 4,000 requests a day that is a traffic spike or a scraper, not organic load. Check `rate_limit.blocked` and the request panel."
  }

  conditions {
    display_name = "Active instances at max"

    condition_threshold {
      filter          = <<-EOT
        resource.type="cloud_run_revision" AND resource.labels.service_name="${var.service_name}"
        AND metric.type="run.googleapis.com/container/instance_count" AND metric.labels.state="active"
      EOT
      comparison      = "COMPARISON_GE"
      threshold_value = var.max_instances
      duration        = "600s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MAX"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
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

# One policy per threshold shape for application events. `window` is the
# alignment period and duration in seconds, `threshold` the event count.
locals {
  event_alerts = {
    auth_failure_burst = {
      name      = "${var.service_name} admin login failures"
      events    = ["auth.login_failed"]
      threshold = 5
      window    = 600
      doc       = "Five or more failed admin logins in 10 minutes. Login is gated on ADMIN_EMAIL then Supabase; check whether the attempts are one source (rate_limit.blocked) and whether any auth.login_succeeded followed."
    }
    chat_circuit_open = {
      name      = "${var.service_name} chat circuit breaker opened"
      events    = ["chat.circuit_open"]
      threshold = 0
      window    = 300
      doc       = "The chat provider circuit opened after repeated failures; chat reports unavailable and the button hides. Look at chat.provider_error by kind."
    }
    chat_budget_exhausted = {
      name      = "${var.service_name} chat daily token budget exhausted"
      events    = ["chat.budget_exhausted"]
      threshold = 0
      window    = 300
      doc       = "CHAT_DAILY_TOKEN_BUDGET was reached on an instance, so chat is off until the budget resets. If this is not explained by real use, treat it as abuse and see the spend guardrails in infra/README.md."
    }
    rate_limit_burst = {
      name      = "${var.service_name} rate limiting burst"
      events    = ["rate_limit.blocked"]
      threshold = 50
      window    = 600
      doc       = "More than 50 requests were rate limited in 10 minutes. Break it down by the limiter label on the dashboard."
    }
    vertex_errors = {
      name      = "${var.service_name} chat provider errors (Vertex 4xx/5xx)"
      events    = ["chat.provider_error"]
      threshold = 4
      window    = 600
      doc       = "More than 4 provider errors in 10 minutes. The kind label says whether it is auth (401/403, key revoked or unbound), quota (429) or upstream (5xx). A 401 right after a key rotation means the new secret version was not deployed."
    }
    delivery_failures = {
      name      = "${var.service_name} contact or phone delivery failing"
      events    = ["contact.failed", "phone.failed"]
      threshold = 1
      window    = 900
      doc       = "More than one contact or phone request failed in 15 minutes. These return 502 to the visitor; check the SendGrid key and quota."
    }
    ws_origin_spike = {
      name      = "${var.service_name} WebSocket origin rejections"
      events    = ["ws.rejected_origin"]
      threshold = 20
      window    = 600
      doc       = "More than 20 chat sockets were rejected for their Origin in 10 minutes. Either a hostile page is embedding the chat, or a legitimate hostname is missing from the same-origin check (the chat was dead on three of four hostnames once)."
    }
  }
}

resource "google_monitoring_alert_policy" "app_event" {
  for_each = local.event_alerts

  display_name          = each.value.name
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = each.value.doc
  }

  dynamic "conditions" {
    for_each = toset(each.value.events)
    content {
      display_name = "${conditions.value} count"

      condition_threshold {
        filter          = "metric.type=\"${local.metric_type[conditions.value]}\" AND resource.type=\"cloud_run_revision\""
        comparison      = "COMPARISON_GT"
        threshold_value = each.value.threshold
        duration        = "0s"

        aggregations {
          alignment_period     = "${each.value.window}s"
          per_series_aligner   = "ALIGN_SUM"
          cross_series_reducer = "REDUCE_SUM"
        }

        trigger {
          count = 1
        }
      }
    }
  }

  # notification_rate_limit is only valid on log-match conditions, so
  # metric-threshold policies throttle through auto_close instead.
  alert_strategy {
    auto_close = "3600s"
  }

  depends_on = [google_logging_metric.app_event]
}

# A secret was read by something other than the runtime service account. Needs
# the DATA_READ audit config in audit.tf. Cloud Run reads secrets as the
# runtime SA, so any other principal here is a human, a script or a leaked
# credential. The project-wide secretAccessor grants on legacy identities
# (HANDOFF.md, audit GCP-05) make this the compensating control until they are
# removed.
resource "google_monitoring_alert_policy" "secret_access" {
  display_name          = "${var.service_name} secret read by unexpected principal"
  combiner              = "OR"
  notification_channels = local.notify

  documentation {
    mime_type = "text/markdown"
    content   = "A portfolio secret was accessed by a principal other than the Cloud Run runtime service account. If it was you, ignore it; if not, rotate the secret and review audit logs."
  }

  conditions {
    display_name = "AccessSecretVersion by non-runtime principal"

    condition_matched_log {
      filter = <<-EOT
        protoPayload.serviceName="secretmanager.googleapis.com"
        protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"
        protoPayload.resourceName=~"/secrets/(${join("|", local.runtime_secret_ids)})/versions/"
        NOT protoPayload.authenticationInfo.principalEmail="${google_service_account.run.email}"
      EOT
    }
  }

  alert_strategy {
    auto_close = "3600s"
    notification_rate_limit {
      period = "3600s"
    }
  }
}

# ---------------------------------------------------------------------------
# Log hygiene
# ---------------------------------------------------------------------------

# Successful health probes (four uptime checks from several regions) outnumber
# real traffic. Keep failures and everything else. Log-based metrics are
# evaluated before exclusions, so counting is unaffected.
resource "google_logging_project_exclusion" "health_probe_ok" {
  count = var.exclude_health_probe_logs ? 1 : 0

  name        = "cloud-run-health-probes-ok"
  description = "Successful /api/health* request log lines"
  filter      = <<-EOT
    resource.type="cloud_run_revision"
    resource.labels.service_name="${var.service_name}"
    log_id("run.googleapis.com/requests")
    httpRequest.requestUrl:"/api/health"
    httpRequest.status=200
  EOT
}
