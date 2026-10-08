# Dependency hygiene — 2026-10-08

The frontend lockfile now resolves source-map-js >=1.2.2 and
postcss-selector-parser >=7.1.6 through explicit overrides. The Lighthouse/E2E
lockfile resolves proxy-addr >=2.0.8 and compression >=1.8.2. These are tooling
dependencies; no runtime dependency was added.

Verified repository advisories: source-map-js
[GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q),
postcss-selector-parser
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf),
proxy-addr [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h),
and compression [GHSA-vc2v-76pw-4v95](https://github.com/advisories/GHSA-vc2v-76pw-4v95).

Lockfiles were generated with guarded, sequential
`npm install --package-lock-only --ignore-scripts --no-fund --no-audit`.
The parent verification run must install those locks before running tests.

## Remaining advisories

sprintf-js 1.0.3 remains in the development dependency tree. The audit reported
no patched release for
[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Do not silence the advisory globally or substitute an
unrelated formatter. Treat external Lighthouse inputs as untrusted, run the
tool only in ephemeral CI without production credentials, and keep report
processing separate from privileged deployment. Track the upstream fix or
remove the containing tool when a compatible replacement is validated.

### Braces: development glob processing

A full `npm audit --json` after the four fixes also reports 12 high findings in
the frontend. These are one root advisory,
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), propagated
through braces, micromatch, chokidar, fast-glob, globby, Tailwind and ESLint
dependencies. The registry's latest braces release remains 3.0.3, which is
affected; 3.0.4 was not available on 2026-10-08.

Do not feed visitor-provided glob patterns to the build, lint or watcher tools.
Run builds from reviewed source in isolated CI without production credentials.
These tools are not request-handling runtime dependencies. The suggested
automatic fix includes major Tailwind and TypeScript ESLint migrations, so it
was not applied as a blind audit fix. The existing Tailwind integration uses
`@apply`; removing it is not a safe lockfile-only change.

The E2E audit reports five moderate findings, all from the sprintf-js root
advisory propagated through argparse, js-yaml and Lighthouse CI. Overriding
js-yaml to a new major would break Lighthouse's `yaml.safeLoad` call. Do not
downgrade Lighthouse to the old version suggested by npm's aggregate remediation.

The audit totals therefore remain **frontend: 12 high tooling findings; E2E:
5 moderate tooling findings**. Neither set is suppressed. Recheck upstream
patch availability regularly and test an intentional tooling migration
separately if patches remain unavailable.

## Operational acceptance

The lockfile change is complete locally. CI must validate application build,
frontend tests, and Lighthouse/E2E compatibility (the selector parser override
crosses a major version). Dependabot closure is only confirmed after the
updated default branch is rescanned.


## Default-branch rescan receipt

After PR115 deployed, GitHub's live Dependabot API returned one open alert:
#169, sprintf-js, moderate, development scope, with no patched version listed.
The original four patchable repository alerts are closed. This is GitHub's
repository-alert count, distinct from npm's propagated tooling findings above;
no claim is made that all npm advisories are resolved. CI application, image,
browser and Lighthouse checks passed with the updated lockfiles.
