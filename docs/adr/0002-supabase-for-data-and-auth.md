# 0002: Supabase for data, auth, and chat logging

**Status:** Accepted (reflects the current implementation)

## Context

The backend needs: a place to persist chat transcripts and telemetry
events, admin authentication for `/api/admin/*`, and structured queries
without standing up and operating a separate database service.

## Decision

Use Supabase (`backend/app/utils/supabase_client.py`) as the Postgres
backend, accessed through its Python client with both an anon key
(RLS-scoped reads) and a service-role key (server-side writes/admin
queries) — never exposing the service-role key to the browser.

## Consequences

- No self-managed database: no Cloud SQL instance, connection pooling,
  or backup schedule to operate for a project at this scale.
- `/api/health` treats "can query the `logs` table" as the DB health
  signal — a Supabase outage or misconfigured credentials directly fails
  the health check (and therefore the CI/CD deploy gate and the uptime
  alert), which is intentional: the site depends on it.
- Two credential tiers (anon vs. service-role) require care to keep the
  service-role key server-side only — it lives in Secret Manager, never
  in a frontend bundle or GitHub Actions log.
- Ties the project to Supabase's availability and pricing; acceptable
  for current traffic, would need reassessment at a much larger scale.
