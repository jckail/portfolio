# Changelog

Notable changes to the portfolio app and its infrastructure. Format
loosely follows [Keep a Changelog](https://keepachangelog.com/); this
project doesn't cut version tags, so entries are grouped by date instead.

## Unreleased

### Fixed
- Production white-screen crash: the `mui`/`@emotion` Rollup manual
  chunk had a circular chunk dependency causing `Cannot access 'qt'
  before initialization` at load time, blanking the entire page for
  every visitor. Merged that chunk back into `vendor`.
- Flaky test `test_hashed_assets_are_immutable_and_gzipped`: picked an
  arbitrary (unsorted) built JS file that could fall under GZipMiddleware's
  1KB compression threshold. Now picks the largest chunk.

### Added
- Terraform-managed infrastructure on GCP: Cloud Run, Artifact Registry,
  Secret Manager, Workload Identity Federation for keyless GitHub Actions
  deploys, remote state in GCS.
- Cloud Monitoring uptime check on `/api/health` + email alert policy.
- CI: coverage gates (vitest + pytest, modest floors below current
  numbers), Trivy image vulnerability scanning (fails on fixable
  CRITICAL/HIGH CVEs), a read-only `terraform plan` job on PRs touching
  `infra/**`, and a Playwright E2E smoke test against the built image.
- Deploy pipeline now deploys new revisions with zero traffic, verifies
  the tagged revision directly, and only promotes to 100% traffic if
  healthy — a broken image is never live.
- `requirements.lock.txt`: hash-pinned dependencies so the production
  Docker image installs reproducibly (`pip install --require-hashes`).
- Branch protection on `main` requiring the 4 CI checks.
- `docs/adr/`: architecture decision records for the WebSocket chat
  transport, Supabase, Cloud Run, and the deploy-verify-promote pattern.

### Changed
- Production base image `python:3.12.3-slim` → `python:3.12-slim` (patch
  version unpinned to track Debian's security-patched slim builds) plus
  pinned `setuptools`/`wheel` versions, closing several fixable CVEs.

## 2026-07-08 — Modernization

Claude Haiku 4.5 assistant with conversation memory, prompt caching, and
tool-calling (site navigation, resume download, contact-form prefill);
command palette; interactive doodle canvas with party mode; project/skill/
experience detail modals with shareable deep links; cookie consent;
backend pytest suite; structured JSON logging with request IDs; CSP and
other security headers; optimized images (11 MB → 1.1 MB); initial
Terraform IaC and CI/CD pipeline. See `ROADMAP.md` for the full list.
