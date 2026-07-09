# 0003: Cloud Run over GKE/App Engine for hosting

**Status:** Accepted (reflects the current implementation)

## Context

The app is a single FastAPI service serving both the API and the built
SPA (`frontend/dist` mounted as static files). It needs to run
containerized, scale to zero when idle (a personal portfolio has bursty,
low-baseline traffic), and support WebSocket connections for the chat
assistant.

## Decision

Deploy as a single Cloud Run v2 service (`infra/main.tf`), built from
`helpers/Dockerfile.prod` and pushed to Artifact Registry, authenticated
via Workload Identity Federation from GitHub Actions (no service-account
keys).

## Consequences

- Scale-to-zero (`min_instances = 0`) means near-zero cost during idle
  periods, at the expense of cold-start latency on the first request
  after a quiet period.
- No cluster to operate (unlike GKE) — Cloud Run manages the container
  runtime, TLS, and autoscaling. Trade-off: less control over networking
  primitives than GKE would offer, which this project doesn't need.
- WebSockets work natively; no separate load balancer or sticky-session
  configuration was required.
- One service currently serves both static assets and the API. Fronting
  static assets with Cloud CDN or a separate storage-backed origin
  (ROADMAP.md "CDN for static assets") would reduce global latency but
  isn't done yet — not needed at current traffic.
