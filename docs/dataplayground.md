# Data Playground integration

`/dataplayground` is a lazy React page with its own indexable document, canonical URL,
and sitemap entry. Its default experience is an offline-generated synthetic dataset.
The homepage does not import the lab's chart/table code or catalog.

## Dataset ownership and refresh

The independent engine is in [jckail/data_playground](https://github.com/jckail/data_playground),
package `playground`, engine version `1.0.0`. From a checkout of that repository:

```bash
python -m playground export --output /path/to/portfolio/backend/app/data/dataplayground.json
```

Commit the generated artifact with the engine change when refreshing it. Never edit
its numbers manually. The portfolio validates it through `LabCatalog`; unknown schema
versions and invalid values fail validation. Current scenarios are baseline,
acquisition, stronger retention, and a data-quality incident. Duplicate/bad-record
injection changes quality counts but leaves the valid business stream unchanged.

Metrics are derived by SQLite over validated events. Amounts are integer USD cents;
collected revenue is not MRR. Cohorts group customers by first-payment date and measure
retention at weekly ages. Null cells have not yet been observed. Event and quarantine
views are samples, not complete datasets; counts describe the full run.

## Optional custom runs

Start the separate Python service with its `requirements-lab.txt` environment:

```bash
uvicorn playground.api:app --host 127.0.0.1 --port 8010 --workers 1
```

Configure the portfolio backend with `DATAPLAYGROUND_API_URL=http://127.0.0.1:8010`.
Use an HTTPS origin for a hosted service, with no credentials, path, query, or fragment.
This setting belongs to the existing frozen Settings object. The browser always calls
the same-origin adapter; it never chooses an upstream URL.

`GET /api/dataplayground` returns the catalog and whether custom runs are configured.
`POST /api/dataplayground/simulate` validates a maximum 4 KB JSON body, caps simulation
parameters, and admits two concurrent upstream requests per instance. Its existing
rate limiter admits six requests/minute per client and thirty/minute per instance.
Upstream calls have a 20-second wall-clock ceiling, refuse redirects, cap decoded
responses at 2 MB, and validate the returned configuration and result contract.
Failures preserve the current UI result and do not masquerade as saved runs.

Leaving the setting empty is supported: all four saved runs, comparisons, quality
reports, event exploration, and SQL lineage still work. The page explains that custom
runs can be performed locally. No simulation service is automatically provisioned.

## Validation and release

Run normal frontend lint, type-check, tests, coverage, and build; run backend Ruff and
pytest. `backend/tests/test_dataplayground.py` checks the generated artifact and proxy
boundaries, with fake upstream responses. SPA/discovery tests cover direct navigation,
canonical metadata, ETags, no-JavaScript content, and sitemap inclusion.

The portfolio refresh is integrated into `main`; review this feature against `main`.
Do not copy these changes onto the older audit checkout.
Production release uses `.github/workflows/deploy.yml` after integration into `main`.
Never use `helpers/deploy.sh` or a laptop deploy command.

## Graph and vector dataset

The catalog also includes an independent, seeded commerce dataset under the optional
`exploration` field. It is separate from the lifecycle scenarios: switching a scenario
or running custom lifecycle parameters does not regenerate these products or purchases.
The same export command regenerates both datasets.

The exploration contains 48 products across six categories, 32 synthetic customers,
and 160 purchase rows. Graph nodes represent customers, products, and categories.
Customer-to-product edges aggregate purchased quantities; product-to-category edges
represent category membership. The graph view shows a bounded one-hop neighborhood,
with the relationship table providing the complete selected neighborhood.

Each product carries an eight-dimensional, nonnegative unit vector. The six category
features plus portability and premium positioning are deliberately handcrafted.
They are not language-model embeddings. The browser ranks other products by cosine
similarity, excludes the selected product, and breaks ties by product ID. Feature
contributions explain the score; similarity is not a probability or a learned
recommendation. No graph database, vector database, external API, or paid service is
required for this small reproducible example.

Backend validation checks IDs, references, vector dimensions and normalization, and
graph consistency before serving the artifact. Frontend and browser tests cover
selection, product search, graph neighborhoods, similarity rankings, and mobile layout.

## Orchestration and data models

The engineering workbench is exported under the optional `architecture` field.
It connects actual Python callbacks to dependency edges and saved execution traces.
The browser replays recorded traces; it does not start an Airflow job or execute SQL.
Normal execution, a transient analytics failure, and a permanent validation failure
show bounded retries, dependency blocking, and an independent branch continuing.
Successful retry and normal runs must produce the same publication fingerprint.
Publication in this demonstration is an in-memory candidate; catalog file export
still uses the existing atomic writer.

Model inspection exposes grain, fields, logical keys, contracts, dependencies,
materialization, source paths, and SQL. Lifecycle warehouse tables and query-result
artifacts are distinct from the independent shopping graph/vector dataset. Logical
relationships enforced in Python are identified separately from physical SQLite
constraints. No warehouse, dbt project, or scheduler is implied to be provisioned.

Decision records explain current choices, evidence, and costs alongside proposed
production changes. The principal engineering examples focus on deterministic replay,
contract boundaries, failure isolation, reproducible publication, and choosing storage
and orchestration to fit the workload. Proposed partitioning, distributed execution,
service-level objectives, and larger storage systems remain design directions unless
explicitly implemented and verified.

Reproduce the DAG locally from the engine checkout:

```bash
python -m playground orchestrate --failure none
python -m playground orchestrate --failure analytics-transient
python -m playground orchestrate --failure validation-permanent
```

`--output path.json` writes a trace with the same atomic artifact writer. These
commands use bounded, seven-day synthetic inputs and perform no external I/O.

## Visitor operating workspaces

The workbench now has focused Overview, Operations, SQL console, Lifecycle,
Architecture, and Explore views. Legacy section links still reveal the right view;
changing views preserves the selected scenario, query, and exploration state.
Explicitly showing the copilot focuses and scrolls to its landmark, including when
the mobile layout places it below the active panel. Hiding it returns focus to the
toggle; initial desktop opening and later evidence updates do not move focus.

Create workspace explicitly allocates a visitor-specific SQLite database. The initial
warehouse contains the saved **event sample**, not the full lifecycle run. Independent
commerce, graph, and handcrafted vector fixtures are also queryable. The inventory
exposes exact row counts and schemas. No real customer records are involved.

Operations runs a partitioned in-memory event log with real producer/consumer state:
batch size, batches per second, partitions, deterministic duplicate/invalid injection,
consumer batch size/rate, pause/resume, drain, and replay. Changing partitions requires
resetting an existing log. Producer log capacity is 2,000 rows. Consumer offsets and
backlog are observed state. Replaying attempts increases attempt counts while primary
keys prevent duplicate warehouse inserts. Quarantine rows retain rejection reasons.

Flow diagrams use proportional record counts and exact tables. Produced-record
accounting and consumer-attempt accounting have separate boundaries, because replay
can produce more consumption attempts than original records. Materialized model rows
have different grains and do not pretend to be additional event throughput.

Build SQL models executes four transformations and SQL contracts: runtime_customers,
runtime_daily, runtime_cohorts, and product_sales. Run workspace DAG executes callbacks
over current tables, supports transient analytics and permanent validation faults,
blocks dependent tasks, and publishes a reproducible in-memory fingerprint only after
reconciliation. The Architecture view retains the full source-qualified saved DAG
and model descriptions as a separate explanation.

Guided incident investigations offer two manual experiments: consumer lag and recovery,
and failed publication and repair. Each button performs one bounded workspace action;
the guide advances only after its returned state meets the checkpoint. Lag recovery
stops production, pauses consumption, produces one controlled batch, and drains up to
500 records per click. Publication repair observes failed validation and blocked
publication, then reruns without the injected fault and checks publication and SQL
contracts. Checkpoints record action responses rather than continuing health checks.
Restart guide clears those checkpoints; it does not reset data or controls.
After an observed checkpoint, keyboard focus moves to the next action or the final
status when the originating button still owns focus. Moving focus or clicking
elsewhere during the request cancels that handoff; workspace replacement or unmount
also clears it.
An unsuccessful action returns focus to its retry button only while that button
still owns the interaction; moving elsewhere during the request preserves focus.

The execution summary distinguishes failed attempts, successful retries, blocked
tasks, publication, and model contract outcomes. Accepted warehouse inserts advance
the data revision; producing backlog, rejecting invalid records, and deduplicating
replay do not. Models and the latest DAG record their input revisions. New accepted
rows mark older results stale while retaining their historical status and fingerprint.
Build SQL models or rerun the DAG to verify current inputs; streaming progress does
not automatically rerun either operation. Reset replaces the workspace and increments
its generation, independently of its new data revision.
If a later DAG fails before executing analytics, preceding SQL model evidence and
its input revision remain available. A failed publication does not establish that
model tables were rebuilt or removed; check the recorded revision and freshness.

Named run snapshots preserve up to six observed workspace states in the current
browser tab. Capture a named state before a controlled change, execute the change,
then capture another state and compare their record counts, partition offsets,
accepted-data revisions, task attempts, model contracts, and publication evidence.
Duplicate display names are distinguished with their snapshot IDs. Model contract
details retain each recorded test's name, pass/fail status, and failed-row count;
an absent model run or empty test list does not invent passing contracts.
Capture timestamps use the browser's clock and are not server execution timings.
Captured values remain unchanged when the live workspace refreshes. Failed attempts
and replay consumption attempts retain their own accounting boundaries; they are
not additional accepted warehouse rows. A numerical difference shows what was
observed at the two captures, not proof that a particular action caused it.

Snapshot JSON downloads use an explicit allowlist of lab evidence. They contain no
workspace capability, provider credentials, copilot conversation, raw event payloads,
or private provider state. Snapshots live in memory and clear when the workspace is
replaced, reset, or expires, and when the page reloads or the tab closes;
they are not server-side run history, durable storage, or an offline replay log.
Missing revisions or freshness flags remain unknown rather than asserting a fresh
run. Bounded evidence discloses omitted entries and cannot establish a complete table
inventory or task trace beyond its captured bounds. A missing table or model in a
comparison is not interpreted as zero rows.

This is a local educational scheduler and event log with SQLite transformations;
Airflow, Kafka, and dbt daemons are not deployed. State lives on one serving process,
is limited to 32 visitor workspaces, and expires after 20 minutes without a visitor
request. A restart or replica change can lose the workspace. The page explains how
to create another. The guarded deployment enables best-effort Cloud Run session
affinity to keep sequential visitor requests together; it does not make memory
durable. Background progress is best effort while the instance has CPU;
requests advance at most one due batch instead of inventing a catch-up burst.

SQL accepts a single SELECT/WITH query against allowlisted lab tables. A SQLite
read-only authorizer, restricted functions, execution deadline/step ceiling, bounded
rows/columns/cells/output, and two query slots constrain work. Text cells are limited
to 2,000 Unicode code points, including any clipping ellipsis. A truncated result can reflect
row limits, clipped cells, or the output-size ceiling; increasing a row limit does
not restore clipped cell contents. Results identify truncation and elapsed query
time. Workspace capabilities travel only in bearer
headers, remain in browser memory, and never appear in URLs. All runtime and copilot
responses are no-store.

SQL results display the executed query, columns, returned rows, elapsed time, limit
truncation, and the workspace generation/data revision observed during locked query
execution. Returned row counts are bounded query output, not counts of all matching
rows. Download query evidence creates a local JSON file with this query, bounded
result and provenance; it contains no workspace capability or provider credentials.
The same evidence table and download are available for copilot SQL results. Those
may display a smaller sample of the returned rows, with explicit sample and shortened
SQL notices. Downloads preserve the evidence actually shown rather than fetching
additional records or publishing a dataset.
Previously executed queries remain historical evidence when accepted-data revisions
advance. The console discloses the recorded and current revisions and requires an
explicit rerun to update rows; it does not silently execute edited SQL. Missing
revision metadata is disclosed rather than asserting freshness.

## Data Copilot

The private `copilot/` package uses the actual Pi Agent SDK, pinned in its npm lockfile.
Each investigation creates a private Node process. Python owns the existing Vertex
or Anthropic provider connection; Node receives no credentials, HOME, host sessions,
shell tools, filesystem tools, or cloud tools. The production image contains Node
and the locked package; no separate public service is exposed.

Six custom tools are registered: `inspect_catalog`, `inspect_workspace`,
`inspect_run`, `inspect_incident`, `query_sql`, and `propose_runtime_change`.
Incident inspection reads partition lag, cumulative replay counters, up to ten
stored quarantine reasons, current run contracts/freshness, and twenty recent logs
without advancing background execution. Replay can increase quarantine attempt
counts while stored quarantine records remain deduplicated. Named run inspection
selects saved catalog runs; without a name it inspects the latest workspace run.
The UI shows bounded tool evidence, including SQL and sampled query results.
SQL evidence includes elapsed time, requested limit, returned row count, sample
count, limit/sample truncation flags, and locked-query generation/data revision.
At most ten sample rows and 4,000 SQL characters are shown, under a 12 KB evidence
ceiling; omitted samples and shortened SQL are marked explicitly.

Proposed changes are workspace-bound,
expire, and require a separate Apply click. Dismiss performs no write. Confirmations
are consumed atomically once; the model never applies a proposal itself.
Once the server consumes a confirmation, it stays consumed even if execution fails.
The browser retires an attempted confirmation. If the response is lost, it cannot
establish whether the change ran; it marks the outcome unknown rather than offering
another Apply for the same confirmation. Inspect the current workspace before
requesting a fresh proposal. An unsuccessful or uncertain confirmation is not
evidence that no mutation occurred.
Proposals also bind to their workspace generation. Confirmation rejects an old
proposal after reset before applying its action. Investigations retain their starting
generation across tool calls and stop safely when reset replaces the workspace.
The browser clears old conversations, proposals, query results, and incident
checkpoints when the generation changes.

The copilot shares the configured model provider but has an independent per-instance
UTC-day token ceiling, `DATAPLAYGROUND_COPILOT_DAILY_TOKENS` (default 40,000; zero
disables it). Per-client/global rate limits, two concurrent investigations, one per
workspace, capped tool rounds/calls, bounded history and outputs, and deadlines limit
cost and work. Provider usage is reconciled against reservations. Stop aborts the
request and the server cancels/reaps the private agent process. Missing credentials,
SDK, or budget disables the copilot while all direct lab tools keep working.

Offline verification includes the genuine Pi loop with a fake provider, opaque
provider tool-state round trips, query evidence, proposal isolation/single use,
cancellation, budgets, SQL limits, lifecycle cleanup, UI races, and browser controls.
CI audits and tests the Node package as well as the normal Python/frontend checks.

## Optional next capabilities

Native Airflow, Kafka, and dbt integration remains deferred. A reproducible isolated
stack would need explicit connection status, server-controlled configuration, and
adapters preserving the current bounded controls and result contracts. It would
extend the running local scheduler, event log, and SQL transformations; those tools
already execute real work without native daemons.

Portable investigation evidence and offline action replay could extend today's
bounded run snapshots and SQL-result JSON exports, with explicit implementation
versions, input provenance, action order, and limits. Durable run history and offline
action replay are not implemented. Representative
scale measurements, query plans, index tradeoffs, and compute/retention costs would
provide evidence before selecting larger storage or execution systems. The graph and
handcrafted vector dataset and their exploration are already implemented; native
graph/vector stores and learned embeddings are separate optional directions.
