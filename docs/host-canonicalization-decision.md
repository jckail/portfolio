# Host canonicalization decision (audit I-9)

Status: undecided. The mechanism exists and is off. This memo is the owner's
decision aid.

## Current state

- Four hostnames reach the `quickresume` Cloud Run service with no redirect:
  `www.jckail.com`, `jckail.com`, `jordan-kail.com`, `www.jordan-kail.com`.
- Canonical tags, the sitemap and JSON-LD all say `https://www.jckail.com`, so
  search engines are told which one to index. The other hosts are duplicates
  that rely on that hint.
- `backend/app/data/contact.json` has `"website": "https://jordan-kail.com/"`.
  `helpers/build_resume_pdf.py` prints it as the third contact link, so the
  resume PDF advertises `jordan-kail.com`, not `www.jckail.com`. Not edited
  here; report only. The contact sender default is `assistant@jordan-kail.com`
  (email on that domain is a separate matter from web redirects).
- Monitoring: `infra/monitoring.tf` probes the host from `production_url` at the
  health path. `infra/observability.tf` probes `/api/health/ready` on each of
  `extra_uptime_hosts` (`jckail.com`, `jordan-kail.com`, `www.jordan-kail.com`)
  and alerts if any fails. `/api/health*` is never redirected, so those checks
  keep working with a redirect enabled and still prove the domain mapping and
  certificate are live. A check with `validate_ssl` on a redirected path would
  otherwise report only the redirect.
- `deploy.yml` verifies the tagged revision URL and the service URL (`run.app`).
  Neither is an alias host.

## Options

### A. Redirect `jordan-kail.com` and `www.jordan-kail.com` to `www.jckail.com`

`ALIAS_HOSTS=jordan-kail.com,www.jordan-kail.com`.

- SEO: consolidates signals onto one host; removes duplicate content; 301 passes
  ranking. Low risk because canonical tags already point there.
- UX: anyone using the old domain lands on the jckail.com site. The URL bar
  changes.
- Cost: the resume PDF and `contact.json` still print `jordan-kail.com`; the
  link keeps working through the redirect, but the printed domain is not the
  canonical one. Decide whether to update the contact data and regenerate the
  PDF (the PDF is an Enhancv export, see repo memory, so that is manual).
- Keeps the bare apex `jckail.com` serving content, which some browsers and
  links will hit.

### B. A, plus redirect the apex `jckail.com` to `www`

`ALIAS_HOSTS=jckail.com,jordan-kail.com,www.jordan-kail.com`.

- Cleanest end state: exactly one host serves content.
- Same SEO benefit as A plus no apex duplicate. Apex users get one extra hop.
- Risk: the apex is the one people type; if the redirect misbehaves it affects
  them. The mechanism is guarded (GET/HEAD only, health exempt) and reversible
  with one env change. HSTS is already sent on responses; redirects are cached
  for an hour, so a rollback takes up to an hour to reach cached clients.

### C. Do nothing

- Zero risk and zero work. Canonical tags already carry the SEO weight.
- Leaves four live origins, split analytics host dimension, and the open audit
  finding. Cookie/localStorage state (consent, theme) is per host, so a visitor
  who switches hosts is asked again.

## Recommendation

Do B, in two steps. First enable A (`jordan-kail.com`, `www.jordan-kail.com`),
verify on a tagged no-traffic revision and in production, then add `jckail.com`
after a day if nothing regressed. Before or alongside, decide whether the resume
contact link should become `https://www.jckail.com/` (owner decision, requires a
PDF re-export). If the owner prefers minimal change, C is acceptable because the
canonical hint is already correct; do not half-enable (alias list including the
canonical host is rejected at boot).

How to enable: `infra/README.md`, section "Host canonicalization".
