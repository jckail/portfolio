# Repository and cloud security review — 2026-09-05

No confirmed compromise or secret exfiltration was found in the inspected evidence.
A serious cloud identity trust flaw and an inverted uptime alert were confirmed
and corrected. Negative scans and incomplete audit logging cannot establish that
secrets were never accessed.

## Scope and evidence

- Reviewed all 35 PR records, fetched their heads, and inspected every changed file
  in the eight open PRs: #4, #5, #6, #8, #9, #33, #34, #35. All eight were opened
  by `dependabot[bot]`; action PRs change upstream action versions, #33 changes the
  Google provider constraint, and #34/#35 update dependency manifests/locks.
  The complete #35 npm lock uses `registry.npmjs.org` and has integrity hashes.
  No unrelated code, workflow payload, alternate registry, or injected script was
  identified. This is not a source audit of every third-party package release.
- Inspected metadata for all 168 retained Actions runs and downloaded their logs,
  including 48 Dependabot service runs. Actors were owner, Dependabot, and Cursor.
  No `pull_request_target` or `workflow_run` execution was present in run metadata.
- Gitleaks 8.30.1 with redacted reports found zero findings in Git history
  (617 non-merge commits scanned, including fetched PR/branch refs) and all
  downloaded Actions logs. Historical `.streamlit/secrets.toml` contained a backend
  URL configuration, not an identified credential.
- Reviewed workflow history, cloud IAM/monitoring configuration, Docker contexts,
  cache boundaries, repository protections, and current dependency advisories.
  No repository webhooks, deploy keys, or self-hosted runners were configured;
  the sole repository collaborator was the owner. Existing workflow token defaults
  were read-only and could not approve PRs. Main already required four CI checks,
  disallowed force pushes/deletion, and allowed administrator bypass.
- Reviewed live WIF, service-account and bucket IAM, Cloud Run request/runtime logs,
  Monitoring probe series, and retained cloud administrative audit records.
  Raw/redacted investigation artifacts are outside Git under
  `/tmp/portfolio-security-review`; they should be retained privately if needed.

## Confirmed findings and remediation

### Cloud credentials could cross the PR trust boundary — critical

The original provider accepted any OIDC token whose repository claim matched
`jckail/portfolio`. Both deployer and planner impersonation bindings selected that
repository, without a branch or workflow restriction. An OIDC-enabled PR job could
therefore request deployer access even without repository secret values: WIF
provider/service-account identifiers are not authentication secrets.

The purportedly read-only planner also had `roles/storage.admin` on the state
bucket, and Terraform state includes runtime secret values. The live state was inspected in memory:
all five secret-version resources contain nonempty secret data, including
Anthropic, SendGrid, and Supabase service-role credentials. No values were saved. Terraform init/plan
executes providers/data sources; placeholder input values do not make this safe.

Actions taken:

- Disabled and removed credentialed PR planning; ordinary CI retains backend-free
  Terraform format/validation without cloud credentials.
- Applied and verified the live provider condition binding repository name and
  immutable ID `866788248`, `refs/heads/main`, the `deploy.yml` workflow on main,
  and push/manual-dispatch events. Terraform contains the same restriction.
- Disabled the planner account and removed its repository impersonation, project
  viewer, and state-bucket storage-admin grants. The disabled identity is retained
  for audit correlation; Terraform reflects this retired state.
- Created the production GitHub environment with a main-branch-only rule. Image
  building runs in a separate job without OIDC, credentials, or deployment caches.
  The deployment job downloads only its own run's artifact and authenticates there.

Recent Dependabot Terraform runs failed before authentication because secrets were
not supplied. Owner PR planning previously authenticated. There is no demonstrated
exploit in the retained logs, but the historical trust configuration was unsafe.

### Mutable Actions and credential/build boundaries

All external Actions are now pinned to full upstream commit hashes; checkout does
not persist credentials, and CI explicitly requests only read access. Generated
`gha-creds-*.json` files are excluded from Git and Docker contexts, including nested
paths. Nested environment files are excluded from Docker contexts. CI image caches
use their own scope; deployment builds do not consume them. Deployment promotes
the exact revision health-checked, rather than whichever revision is latest.

The Trivy incident advisory was checked against run dates and resolved action
commits. Retained runs used `trivy-action@v0.36.0` at
`ed142fd0673e97e23eac54620cfb913e5ce36c25`, with its SHA-pinned setup dependency.
The repo's Actions usage began after the March incident. No advisory C2/domain or
fallback-repository markers were identified. A tag name alone was not treated as
proof of safety.

Repository policy now requires full Action commit pins, and the retired planner
repository secret was removed. GitHub secret scanning and push protection were
enabled and verified; the initial
scan reported no open alerts. These controls were previously disabled.

### September 1 uptime incident

The 18:15 UTC email was not evidence of compromise. Live monitoring used
`REDUCE_COUNT_FALSE` with `COMPARISON_LT 1`, which fires when failed-probe count is
zero. The live policy was changed to `COMPARISON_GT 0`, preserving other settings;
Terraform contains the same correction.

There was also a real earlier availability failure: 56 startup-probe failures
occurred September 1. The application repeatedly exceeded its roughly 30-second
startup allowance. It recovered at about 18:04 UTC; all six check locations were
healthy by 18:05:10. The 18:15 alert is consistent with the inverted rule firing
following recovery. The underlying reason for slow initialization is unproven;
targeted logs contained no OOM, dependency timeout, or Python traceback.

The deployment and Terraform configuration enable startup CPU boost and extend
the startup probe allowance to roughly 120 seconds, with a three-second probe
timeout. Minimum instances remains zero. The next normal canary deployment applies
these settings and verifies health before routing traffic.

Incident-hour traffic included 130 PHP/webshell probes that returned 404. No
successful execution or secret extraction through those paths was demonstrated.
The latest pre-review deployment was July 20, not September 1.

### Dependencies

Updated compatible npm dependencies; upgraded React Router to patched 7.18.3
(the existing BrowserRouter/useLocation usage passes type checking and tests).
Frontend npm audit now reports zero vulnerabilities. Removed unused `python-jose`
and its unpatched `ecdsa` dependency; upgraded locked cryptography and h2, retaining
hash-verified installation. Image scanning additionally found vulnerable vendored
packages inside pip itself; upgrading standalone setuptools did not remove those
findings. The final runtime image now checks dependency consistency and removes
pip, setuptools, wheel, and ensurepip after installation. No scan exclusions were
added. The deployment build now scans the image before upload/authentication.
E2E overrides update tmp, uuid, and qs to patched
versions while preserving Lighthouse functionality.

E2E audit still reports six high dependency entries, all caused by one upstream
`extract-zip` symlink traversal advisory through Lighthouse/Puppeteer. No patched
release is advertised. These tools run only in unprivileged CI against the local
test image and the Playwright-managed browser, not in production or the cloud-
authenticated deployment job. Do not use them to unpack untrusted browser archives.
The audit's suggested downgrade of Lighthouse CI to 0.1.0 is not an appropriate
fix. Recheck when a patched upstream dependency is available.

## Verification and remaining limits

Local workflow lint (actionlint 1.7.12), Terraform 1.9.8 format/validation,
frontend lint/type-check/coverage tests/build, and backend lint/coverage tests pass.
Frontend: 66 tests passed across 14 files. Backend: 43 passed, 2 skipped;
62.81% coverage. Production requirements installed
successfully using hashes. GitHub CI/canary deployment results will provide the
Linux image/E2E and live rollout verification.

Cloud Data Access logging was not configured, so historical secret reads and
federated-token usage cannot be comprehensively reconstructed. Administrative logs
inspected showed expected owner/deployer principals. Legacy `svc-app-dev` has two never-expiring keys from 2023 and broad project
permissions. No retained activity identifies their current application dependence,
so they were not revoked. Identify their owner/use and migrate away from these
keys before removing legacy access.

Because real secrets were reachable through the old PR trust configuration,
rotate Anthropic, SendGrid, and Supabase service-role credentials using their
provider consoles. Update Secret Manager and the privately managed Terraform
inputs together, then roll a verified revision and revoke old credentials.
Supabase rotation must account for its JWT/signing-key setup and any existing
clients. Do not copy secrets into Git, logs, or this report.

Forward Data Access logging was enabled and verified for Secret Manager, STS, IAM
Credentials (under `iam.googleapis.com`), and Cloud Storage; STS also records
`ADMIN_READ` token exchanges. Matching audit settings are in `infra/audit.tf`.
Cloud audit logs can contain sensitive metadata and incur normal logging charges. No secret values were printed or
committed, and no blanket credential rotation or history rewrite was performed.

## References

- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Security Lab: untrusted PR execution](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
- [Google WIF deployment pipelines](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [Trivy incident advisory](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
- [Cloud Monitoring reducer/comparison semantics](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies)
- [extract-zip advisory](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)

## September 6 follow-up: deny deployment reruns at the cloud boundary

A main-branch/workflow restriction alone does not reject an older execution's
rerun. GitHub keeps the original SHA and ref when rerunning a workflow, and the
old workflow does not acquire guards added later. The provider condition now also
requires the production environment and `run_attempt == '1'`. Terraform and the
workflow retry instructions match this policy. Both build and deploy jobs reject
reruns early; the GCP condition also applies to historical workflows.

To retry a failed deployment, start a **new** Deploy workflow dispatch on main.
Do not use **Re-run jobs**. CI-only reruns remain available. This restriction
prevents new WIF exchanges for deployment reruns; it does not revoke issued
access tokens, stop use of an already stolen application key, or authorize every
fresh main push. It is not evidence that a malicious rerun occurred.

References: [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc)
and [rerun semantics](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

### Require tested, current source and verify the deployed image

Deployment now checks the active `ci.yml` workflow's latest push run for the exact
main commit before cloud authentication and again immediately before promotion.
The run and all four expected jobs must succeed; an older successful run cannot
hide a newer failed or pending run. Missing/incomplete API results, a changed CI
attempt, or a moved main branch prevent promotion. A fresh manual deployment may
reuse successful CI for its unchanged main commit. The guard's failure-case tests
run in backend CI.

The registry digest recorded by the local Docker engine after pushing this run's
image is validated and passed
to Cloud Run as `image@sha256:...`. The new revision must resolve that exact image
before its health check and promotion. Mutable SHA/latest tags are not deployment
identifiers. The final GitHub check and cloud promotion are separate operations:
a main push in that short interval cannot be ruled out atomically. These checks
also do not establish the safety of code an authorized maintainer puts on main.

### Restrict the deployment identity to this application

The deployer now has Cloud Run Developer on the existing `quickresume` service
and Artifact Registry Writer on the `portfolio` image repository. Its former
project-wide Cloud Run Admin and Artifact Registry Writer memberships were
removed after the narrower grants were added and read back. Public invocation
and Service Account User on the exact runtime identity are preserved. Terraform
uses resource-scoped IAM members and documents migration from the old bindings.

This removes deployment reach to unrelated services/repositories and service IAM
administration. It does not remove the authority to deploy application code with
the runtime identity or revoke application credentials. Cloud Run Developer also
retains powerful operations on the target service; it is not a custom minimal
permission set.
