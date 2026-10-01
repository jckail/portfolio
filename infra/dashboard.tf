# ---------------------------------------------------------------------------
# Cloud Monitoring dashboard. Tiles are generated from a list so adding a panel
# is one entry. Layout is two charts per row on a 12-column grid.
# ---------------------------------------------------------------------------

locals {
  run_filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.service_name}\""

  # Helper shapes: a built-in Cloud Run metric series, and a log-based event series.
  dash_charts = [
    {
      title = "Requests by status class"
      plot  = "STACKED_BAR"
      sets = [{
        filter  = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\""
        aligner = "ALIGN_RATE", reducer = "REDUCE_SUM", group = ["metric.labels.response_code_class"], legend = "{{metric.labels.response_code_class}}"
      }]
    },
    {
      title = "5xx ratio"
      plot  = "LINE"
      ratio = {
        numerator   = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
        denominator = "${local.run_filter} AND metric.type=\"run.googleapis.com/request_count\""
      }
      sets = []
    },
    {
      title = "HTTP latency p50 / p95 / p99 (excludes WebSocket)"
      plot  = "LINE"
      sets = [
        for p in ["50", "95", "99"] : {
          filter  = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.http_latency.name}\" AND resource.type=\"cloud_run_revision\""
          aligner = "ALIGN_PERCENTILE_${p}", reducer = "REDUCE_MAX", group = [], legend = "p${p}"
        }
      ]
    },
    {
      title = "Container startup latency p95 (cold starts)"
      plot  = "LINE"
      sets = [{
        filter  = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/startup_latencies\""
        aligner = "ALIGN_PERCENTILE_95", reducer = "REDUCE_MAX", group = [], legend = "p95"
      }]
    },
    {
      title = "Instances (active / idle)"
      plot  = "STACKED_AREA"
      sets = [{
        filter  = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/instance_count\""
        aligner = "ALIGN_MAX", reducer = "REDUCE_SUM", group = ["metric.labels.state"], legend = "{{metric.labels.state}}"
      }]
    },
    {
      title = "CPU and memory utilization p95"
      plot  = "LINE"
      sets = [
        for m in ["cpu", "memory"] : {
          filter  = "${local.run_filter} AND metric.type=\"run.googleapis.com/container/${m}/utilizations\""
          aligner = "ALIGN_PERCENTILE_95", reducer = "REDUCE_MAX", group = [], legend = m
        }
      ]
    },
    {
      title = "Chat funnel (events per 5 min)"
      plot  = "STACKED_BAR"
      sets = [
        for e in ["chat.session_open", "chat.message", "chat.tool_call", "chat.confirm_requested", "chat.confirm_accepted", "chat.confirm_cancelled"] : {
          filter  = "metric.type=\"${local.metric_type[e]}\" AND resource.type=\"cloud_run_revision\""
          aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = [], legend = e
        }
      ]
    },
    {
      title = "Chat tool calls by tool"
      plot  = "STACKED_BAR"
      sets = [{
        filter  = "metric.type=\"${local.metric_type["chat.tool_call"]}\" AND resource.type=\"cloud_run_revision\""
        aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = ["metric.labels.tool"], legend = "{{metric.labels.tool}}"
      }]
    },
    {
      title = "Contact and phone funnel"
      plot  = "STACKED_BAR"
      sets = [
        for e in ["contact.sent", "contact.failed", "phone.requested", "phone.revealed", "phone.failed"] : {
          filter  = "metric.type=\"${local.metric_type[e]}\" AND resource.type=\"cloud_run_revision\""
          aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = [], legend = e
        }
      ]
    },
    {
      title = "Chat provider errors by kind"
      plot  = "STACKED_BAR"
      sets = [{
        filter  = "metric.type=\"${local.metric_type["chat.provider_error"]}\" AND resource.type=\"cloud_run_revision\""
        aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = ["metric.labels.kind"], legend = "{{metric.labels.kind}}"
      }]
    },
    {
      title = "Chat circuit open / token budget exhausted"
      plot  = "STACKED_BAR"
      sets = [
        for e in ["chat.circuit_open", "chat.budget_exhausted"] : {
          filter  = "metric.type=\"${local.metric_type[e]}\" AND resource.type=\"cloud_run_revision\""
          aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = [], legend = e
        }
      ]
    },
    {
      title = "Rate-limited requests by limiter"
      plot  = "STACKED_BAR"
      sets = [{
        filter  = "metric.type=\"${local.metric_type["rate_limit.blocked"]}\" AND resource.type=\"cloud_run_revision\""
        aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = ["metric.labels.limiter"], legend = "{{metric.labels.limiter}}"
      }]
    },
    {
      title = "Admin logins and rejected WebSocket origins"
      plot  = "STACKED_BAR"
      sets = [
        for e in ["auth.login_failed", "auth.login_succeeded", "ws.rejected_origin"] : {
          filter  = "metric.type=\"${local.metric_type[e]}\" AND resource.type=\"cloud_run_revision\""
          aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = [], legend = e
        }
      ]
    },
    {
      title = "First-party events by name"
      plot  = "STACKED_BAR"
      sets = [{
        filter  = "metric.type=\"${local.metric_type["event.received"]}\" AND resource.type=\"cloud_run_revision\""
        aligner = "ALIGN_SUM", reducer = "REDUCE_SUM", group = ["metric.labels.name"], legend = "{{metric.labels.name}}"
      }]
    },
  ]

  dash_tiles = [
    for i, c in local.dash_charts : {
      xPos   = (i % 2) * 6
      yPos   = floor(i / 2) * 4
      width  = 6
      height = 4
      widget = {
        title = c.title
        xyChart = {
          chartOptions = { mode = "COLOR" }
          yAxis        = { scale = "LINEAR" }
          dataSets = concat(
            [
              for r in slice([lookup(c, "ratio", null)], 0, lookup(c, "ratio", null) == null ? 0 : 1) : {
                plotType       = c.plot
                legendTemplate = "ratio"
                timeSeriesQuery = {
                  timeSeriesFilterRatio = {
                    numerator = {
                      filter      = r.numerator
                      aggregation = { alignmentPeriod = "300s", perSeriesAligner = "ALIGN_RATE", crossSeriesReducer = "REDUCE_SUM" }
                    }
                    denominator = {
                      filter      = r.denominator
                      aggregation = { alignmentPeriod = "300s", perSeriesAligner = "ALIGN_RATE", crossSeriesReducer = "REDUCE_SUM" }
                    }
                  }
                }
              }
            ],
            [
              for s in c.sets : {
                plotType       = c.plot
                legendTemplate = s.legend
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = s.filter
                    aggregation = {
                      alignmentPeriod    = "300s"
                      perSeriesAligner   = s.aligner
                      crossSeriesReducer = s.reducer
                      groupByFields      = s.group
                    }
                  }
                }
              }
            ]
          )
        }
      }
    }
  ]
}

resource "google_monitoring_dashboard" "portfolio" {
  dashboard_json = jsonencode({
    displayName = "Portfolio (${var.service_name})"
    mosaicLayout = {
      columns = 12
      tiles   = local.dash_tiles
    }
  })

  depends_on = [google_logging_metric.app_event, google_logging_metric.http_latency]
}
