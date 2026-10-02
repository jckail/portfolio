# GCP project hosting and release runbook

Status: staged delivery plan, 2026-10-02. GCP is the primary hosting direction;
the linked applications and proposed subdomains are not all deployed. This
document changes no resources, DNS, credentials, records, or traffic. The release coordinator owns
integration and cloud cutovers; each application's existing owner retains its
source and data release gates.

## Observed services and proposed destinations

The observations below come from the release coordinator's read-only cloud/DNS inventory on this
date. Recheck them before execution. A Cloud Run `Ready=True` condition does not
prove a particular source SHA or application journey is deployed.

| Application / hostname | Observed state | Next gate |
| --- | --- | --- |
| Portfolio: `jckail.com`, `www.jckail.com` | Domain mappings target `quickresume`, project `portfolio-383615`; service is ready. | Preserve existing routing; release through guarded main CI/CD and verify the exact deployed SHA. |
| Portfolio aliases: `jordan-kail.com`, `www.jordan-kail.com` | Included in the project's six existing mappings. | Preserve the aliases; verify their actual mapping targets and canonical redirects during inventory. |
| Legacy teacher site: `the-super-teacher.com`, `www.the-super-teacher.com` | Both map to old `edutrack`, not the new Superteacher service. | Leave them intact until a separately reviewed data-preserving teacher-site cutover is ready. |
| Proposed `superteacher.jckail.com` | DNS lookup returned NXDOMAIN; no new hostname cutover verified. New Superteacher staging hit Litestream root-file permissions; packaging PR is pending. | Qualify the staging packaging fix, persistence/restore and data lineage, accounts and email before production. |
| Proposed `jobbr.jckail.com` | NXDOMAIN; existing Jobbr source sessions remain active. No GCP target is verified. | Freeze reviewed source, identify runtime/database/identity requirements, then qualify a GCP candidate. |
| Proposed `atlas.jckail.com` | NXDOMAIN; no hostname cutover verified. | Preserve OpenDataCenter's source-rights and private-canary gates before public hosting or gateway activation. |
| Proposed `links.jckail.com` | NXDOMAIN. Project `linksaver-445700` exists, but Run, Artifact Registry and SQL APIs are disabled; current artifact storage is local. Extension delivery is in progress. | Review the runtime/storage plan and extension release separately; provision only the candidate's required services after review. |

The inventory found no Compute URL maps or Cloud DNS zones in
`portfolio-383615`. `jckail.com` nameservers are
`ns-cloud-d1.googledomains.com` through `ns-cloud-d4.googledomains.com`.
Nameservers alone do not identify the managing account or GCP project. The release coordinator has
requested the authoritative DNS provider/account; that answer is pending.
Proposed hostname labels are planning choices, not existing reservations.

## Inventory before any change

The active gcloud account was verified, but there is no global default project.
Use explicit projects and regions; do not set a global project to run this plan.
These commands inspect metadata and do not read secret payloads or student data:

```sh
gcloud auth list --filter=status:ACTIVE --format='value(status)'
gcloud run services list --project portfolio-383615 --region us-central1
# Optional: use only if the required beta component is already installed.
gcloud beta run domain-mappings list --project portfolio-383615 --region us-central1
gcloud compute url-maps list --project portfolio-383615
gcloud dns managed-zones list --project portfolio-383615
gcloud services list --enabled --project linksaver-445700
```

The beta domain-mapping command was unavailable in the inspected CLI. Do not
install a component merely for inventory: use Cloud Run's Domain mappings page
in the Console with the explicit project/region, or the official
[domain-mapping list REST API](https://docs.cloud.google.com/run/docs/reference/rest/v1/namespaces.domainmappings/list).
Check response pagination and unreachable locations before claiming complete
coverage.

Record exact service/revision identities, image digests, current traffic splits,
mapping targets and public health/version responses. Identify the DNS zone owner,
existing records/TTL and domain-verification authority. Do not infer permission
to replace an existing mapping from access to a service or registrar.

## Immutable release contract

1. Freeze the application's acceptance checks and source SHA. Distinguish
   synthetic browser demos/forward links from independently hosted applications.
   Portfolio source instructions prohibit changing another application's service
   or domain mapping from this repository.
2. Run exact-head hosted checks before release. Build/scan a run-bound artifact
   without deploy credentials; publish an immutable image digest. Use GitHub
   Workload Identity Federation and a dedicated scoped deployer rather than
   exported service-account keys. Repository identity, main branch, approved
   workflow and production environment belong in the trust condition. See
   [Google's deployment-pipeline WIF guidance](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).
3. Preserve Portfolio's successful-current-main CI gate, rerun refusal, pushed
   digest/revision equality and freshness recheck immediately before promotion.
   [PR #76](https://github.com/jckail/portfolio/pull/76) proposes bounded canary and
   production probes requiring the health version hash to equal `$GITHUB_SHA`;
   it is pending integration at this document's source base. Recheck its merged
   status before treating that extra guard as active workflow behavior.
4. Stage a no-traffic candidate on its tagged Cloud Run URL before DNS. Validate
   liveness, exact source/artifact identity, dependency readiness and the relevant
   authenticated journeys. Portfolio liveness can be `degraded` with HTTP 200;
   `/api/health/ready` reports dependency failure separately. A liveness pass does
   not satisfy another application's database/identity readiness gate.
5. Identify durable storage and its owner before replacing a stateful service.
   Verify export/backup provenance, migrations and a restore drill against a
   separate target; preserve the original data and rollback window. Container
   filesystem success is not a durable-storage receipt. Linksaver local artifacts
   and Superteacher legacy/new datasets require explicit migration decisions.
6. Record the previous revision and a traffic rollback plan. App rollback does
   not roll back schema/data changes. Google documents that traffic adjustments
   are not instantaneous, so bounded post-promotion checks must verify the intended
   revision rather than accepting an old healthy response.
   [Cloud Run traffic migration guidance](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)
   describes staged traffic and rollback behavior.

## Hostnames, sessions and DNS cutover

Keep the existing Portfolio and legacy teacher mappings serving while preparing
candidates. Do not force-override, delete or reuse the two teacher mappings as a
shortcut to publishing Superteacher. A new staging hostname does not authorize
migration of those legacy hostnames or student records.

Cloud Run direct domain mappings remain Preview with limited regional support
and are not recommended by Google for production. They map a hostname to a
service root, not a path; they do not support wildcard certificates. Managed
certificate provisioning can take up to 24 hours. `us-central1` is supported.
Review direct mapping, Firebase Hosting or a load-balancer design only after a
verified candidate and DNS owner exist; this runbook does not provision a new
load balancer or assume its cost is approved. Preserve existing mappings during
that design review. See [Google's custom-domain options and limitations](https://docs.cloud.google.com/run/docs/mapping-custom-domains).

Before routing a new hostname:

1. Confirm the chosen label, DNS zone/account, exact serving service/project,
   domain ownership verification and TLS approach. Export the existing records
   and prepare specific proposed changes, TTL and rollback records for review.
2. Validate the candidate on its service/tag URL and test its canonical host
   handling. Use only DNS records emitted by the chosen serving configuration;
   do not copy another project's IP or overwrite unrelated records/nameservers.
3. Review each application's session boundary. Prefer host-scoped Secure,
   HttpOnly cookies with an explicit SameSite/CSRF policy. Do not automatically
   widen cookies to `.jckail.com` to share auth between unrelated applications.
   Register exact new OAuth redirect URLs and trusted HTTPS origins; test login,
   logout, callback and cross-account denial. Credentialed CORS needs explicit
   reviewed origins; WebSocket origin checks and CSP need their own review.
4. After authorized DNS changes, wait for DNS and certificate readiness before
   advertising the URL. Check authoritative and public resolver answers, TLS,
   canonical redirects, exact release identity, assets, API errors and authenticated
   journeys on the actual hostname. Confirm existing aliases still work.
5. Promote only the qualified revision. Keep before/after mapping and traffic
   receipts and use the reviewed rollback if qualification fails. DNS rollback
   can be delayed by cached records; keep the previous serving target available.

For Atlas, preserve the separate gateway gate in [DEPLOYMENT.md](../DEPLOYMENT.md):
`OPENDATACENTER_UPSTREAM_URL` remains unset until source rights and the canary pass.
The gateway uses a canonical HTTPS `*.run.app` origin and does not forward
Portfolio credentials or mint a Cloud Run identity token. A proposed Atlas
subdomain is a separate public-release decision.

## Next handoffs

- Release coordinator: resolve the authoritative DNS account; qualify pending Portfolio delivery
  changes and retain exact deployment receipts before any hostname cutover.
- Superteacher owner: finish packaging/staging, durable-data lineage and restore,
  accounts and email gates; separately propose legacy-domain migration.
- Jobbr owner: supply a reviewed GCP runtime/data/identity candidate from the
  current source session; existing hosting is not a GCP deployment receipt.
- Atlas owner: supply source-rights and private-canary evidence before public
  upstream/domain activation.
- Linksaver owner: supply the artifact-persistence and API/runtime plan plus
  extension qualification; a project ID alone is not provisioned hosting.

Record source SHA, checks, image digest, target/project, data gates, DNS/mapping
changes and remaining blockers in each actual repository's checkpoint. Keep
credentials, private records and raw investigation material out of release notes.
