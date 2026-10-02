# Data Playground operations workbench

The portfolio lab becomes a navigable operating workspace. Overview shows measured
record movement; Operations runs the producer, consumer, DAG, and models; SQL exposes
the visitor's SQLite warehouse. Lifecycle, Architecture, and Explore retain the
existing deeper demonstrations. A persistent Data Copilot explains the current
workspace, runs bounded read-only queries, inspects task results, and proposes changes
that the visitor explicitly applies.

Each visitor receives an unguessable workspace capability. State is process-local,
expires, and is bounded in rows, query work, history, and concurrent sessions. Tokens
travel in authorization headers, never URLs. Restarting a service loses this lab state.
Background execution is best effort while the serving instance has CPU; refreshes
show observed progress rather than promising a wall-clock throughput SLA.

Sankey bands represent record counts, with labeled edges and an equivalent exact
table. Rejected, duplicate, queued, and accepted records remain distinguishable.
Model counts are labeled separately when their grain differs from event counts.
Changing controls must change server state and subsequent SQL results. Replay must
not duplicate warehouse events. Task failures must prevent downstream publication.

Airflow, Kafka, and dbt concepts are demonstrated through local scheduler, partitioned
event-log, and SQL transformation implementations. Their names do not establish that
external daemons are deployed. Native integration should have explicit connection
status and server-controlled configuration; visitors never choose upstream URLs.

The copilot runs an actual Pi Agent SDK tool loop in a private Node subprocess. The
Python provider bridge retains model credentials and provider-specific tool state.
The only tools inspect this lab, run read-only SQL, or create bounded action proposals.
No shell, filesystem, host session discovery, or portfolio contact tools are enabled.
Offline tests exercise multi-round reasoning, tool calls, state isolation, query
boundaries, and single-use confirmations. Production release uses existing CI and
the guarded Cloud Run workflow.

Acceptance requires keyboard and mobile navigation, deep links and browser history,
preserved state when changing views, honest runtime availability, flow conservation,
observable backend control effects, SQL results and errors, DAG retry/failure behavior,
model test outcomes, and copilot tool evidence with explicit change confirmation.
