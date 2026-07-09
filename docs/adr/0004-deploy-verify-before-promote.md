# 0004: Deploy with zero traffic, verify, then promote

**Status:** Accepted (2026-07)

## Context

The original `deploy.yml` ran `gcloud run deploy` (which by default
routes 100% of traffic to the new revision immediately) and *then* health
-checked it. If the new image was broken, real visitors could hit it
before the check caught the problem and failed the workflow — the
previous revision was never brought back automatically.

## Decision

Deploy the new revision with `--no-traffic --tag=gh-<short-sha>`, health
-check that revision's own tagged URL directly (zero live-traffic
exposure), and only run `gcloud run services update-traffic --to-latest`
if that check passes. A final health check confirms the production URL
after promotion.

## Consequences

- A failed deploy never serves real traffic — the previous revision keeps
  serving 100% throughout, with no manual intervention needed.
- Adds one extra `gcloud` round-trip (health-checking a revision-specific
  URL) to every deploy, a few seconds of added CI time.
- Rollback if a *promoted* revision turns out to be bad in ways the
  health check didn't catch is still manual:
  `gcloud run services update-traffic quickresume --to-revisions
  <PREVIOUS_REVISION>=100` (documented in `HANDOFF.md`).
- Verified end-to-end via manual `workflow_dispatch` against the live
  service before merging, not just reviewed as YAML.
