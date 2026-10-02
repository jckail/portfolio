"""Bounded visitor workspaces with real SQLite queries and background stream controls.

This adapter intentionally owns no network clients. External Kafka/dbt adapters
must preserve the same control/result contract while supplying their own durable
offsets, credentials and execution isolation; this local implementation claims none.
"""

import hashlib
import json
import math
import re
import secrets
import sqlite3
import threading
import time
from collections import deque
from contextlib import contextmanager
from functools import lru_cache

from ..models.dataplayground import LabCatalog
from ..models.dataplayground_runtime import (
    FlowLink,
    ModelRun,
    ModelTest,
    PartitionState,
    QueryRequest,
    QueryResult,
    RuntimeAction,
    RuntimeColumn,
    RuntimeLog,
    RuntimeState,
    RuntimeTable,
    RuntimeTrace,
    SessionRequest,
    SessionResponse,
    StreamingState,
)
from .dataplayground import load_catalog

MAX_EVENTS = 2000
MAX_RESULT_BYTES = 256 * 1024
TTL_SECONDS = 1200
QUERY_SECONDS = 0.25
TABLE_SOURCES = {
    "events": "Catalog accepted event sample, then consumed local event-log records",
    "products": "Catalog exploration.products",
    "shoppers": "Catalog exploration.customers (independent identity domain)",
    "purchases": "Catalog exploration.purchases",
    "graph_nodes": "Catalog exploration.graph.nodes",
    "graph_edges": "Catalog exploration.graph.edges",
    "event_log": "Process-local partitioned producer log",
    "quarantine": "Rejected local event-log records, unique by partition and offset",
    "runtime_customers": "GROUP BY events.user_id; one sampled lifecycle user",
    "runtime_daily": "GROUP BY event UTC date; days represented in sampled events",
    "runtime_cohorts": "GROUP BY runtime_customers.first_payment; sampled payer cohorts",
    "product_sales": "JOIN products/purchases; one purchased product",
}
MODEL_SQL = {
    "runtime_customers": "SELECT user_id, MIN(CASE WHEN event_type='payment' THEN substr(occurred_at,1,10) END) AS first_payment, MIN(CASE WHEN event_type='churn' THEN substr(occurred_at,1,10) END) AS churn_date FROM events GROUP BY user_id",
    "runtime_daily": "SELECT substr(occurred_at,1,10) AS date, SUM(event_type='signup') AS signups, SUM(event_type='activation') AS activations, SUM(event_type='payment') AS payments, SUM(event_type='churn') AS churns, SUM(amount_cents) AS revenue_cents FROM events GROUP BY date ORDER BY date",
    "runtime_cohorts": "SELECT first_payment AS cohort, COUNT(*) AS size FROM runtime_customers WHERE first_payment IS NOT NULL GROUP BY first_payment ORDER BY first_payment",
    "product_sales": "SELECT p.id AS product_id,p.name,SUM(b.quantity) AS units,SUM(b.quantity*p.price_cents) AS value_cents FROM purchases b JOIN products p ON p.id=b.product_id GROUP BY p.id,p.name",
}
ALLOWED_FUNCTIONS = frozenset(
    {
        "abs",
        "avg",
        "coalesce",
        "count",
        "date",
        "datetime",
        "dense_rank",
        "first_value",
        "group_concat",
        "ifnull",
        "instr",
        "json",
        "json_array_length",
        "json_extract",
        "json_type",
        "json_valid",
        "julianday",
        "lag",
        "last_value",
        "lead",
        "length",
        "lower",
        "ltrim",
        "max",
        "min",
        "nullif",
        "rank",
        "replace",
        "round",
        "row_number",
        "rtrim",
        "strftime",
        "substr",
        "substring",
        "sum",
        "total",
        "trim",
        "typeof",
        "upper",
    }
)


class RuntimeError(ValueError):
    """A safe, visitor-facing failure; never contains tokens or provider details."""


class Workspace:
    def __init__(self, catalog: LabCatalog, scenario_id: str, now: float):
        run = next((run for run in catalog.runs if run.scenario.id == scenario_id), None)
        if run is None:
            raise RuntimeError("Unknown saved scenario.")
        self.scenario_id = scenario_id
        self.last_seen = now
        self.lock = threading.RLock()
        self.db = sqlite3.connect(":memory:", check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 16384)
        self.db.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 20000)
        self.db.setlimit(sqlite3.SQLITE_LIMIT_COLUMN, 100)
        self.db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, 20)
        self.db.setlimit(sqlite3.SQLITE_LIMIT_VARIABLE_NUMBER, 100)
        self.db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 50)
        self.templates = [event.model_dump() for event in run.events]
        self.db.execute(
            "CREATE TABLE events(event_id TEXT PRIMARY KEY NOT NULL,occurred_at TEXT,user_id TEXT,event_type TEXT,amount_cents INTEGER,channel TEXT,plan TEXT)"
        )
        self.db.executemany(
            "INSERT INTO events VALUES(:event_id,:occurred_at,:user_id,:event_type,:amount_cents,:channel,:plan)",
            self.templates,
        )
        self.db.executescript("""
            CREATE TABLE products(id TEXT PRIMARY KEY,name TEXT,category TEXT,description TEXT,price_cents INTEGER,vector_json TEXT);
            CREATE TABLE shoppers(id TEXT PRIMARY KEY,name TEXT,segment TEXT);
            CREATE TABLE purchases(id TEXT PRIMARY KEY,customer_id TEXT,product_id TEXT,quantity INTEGER);
            CREATE TABLE graph_nodes(id TEXT PRIMARY KEY,label TEXT,kind TEXT);
            CREATE TABLE graph_edges(source TEXT,target TEXT,relation TEXT,weight INTEGER,PRIMARY KEY(source,target,relation));
            CREATE TABLE event_log(partition INTEGER,offset INTEGER,event_id TEXT,payload TEXT,PRIMARY KEY(partition,offset));
            CREATE TABLE quarantine(partition INTEGER,offset INTEGER,event_id TEXT,reason TEXT,payload TEXT,PRIMARY KEY(partition,offset));
        """)
        if catalog.exploration:
            e = catalog.exploration
            self.db.executemany(
                "INSERT INTO products VALUES(?,?,?,?,?,?)",
                [(p.id, p.name, p.category, p.description, p.price_cents, json.dumps(p.vector)) for p in e.products],
            )
            self.db.executemany("INSERT INTO shoppers VALUES(?,?,?)", [(c.id, c.name, c.segment) for c in e.customers])
            self.db.executemany(
                "INSERT INTO purchases VALUES(?,?,?,?)",
                [(p.id, p.customer_id, p.product_id, p.quantity) for p in e.purchases],
            )
            self.db.executemany(
                "INSERT INTO graph_nodes VALUES(?,?,?)", [(n.id, n.label, n.kind) for n in e.graph.nodes]
            )
            self.db.executemany(
                "INSERT INTO graph_edges VALUES(?,?,?,?)",
                [(n.source, n.target, n.relation, n.weight) for n in e.graph.edges],
            )
        self.db.commit()
        self.partitions: list[list[dict]] = [[], [], []]
        self.offsets = [0, 0, 0]
        self.batch_size, self.rate = 10, 5
        self.consumer_batch_size, self.consumer_rate = 100, 5
        self.producer_running, self.consumer_paused = False, True
        self.produced = self.consumed = self.inserted = self.duplicates = 0
        self.quarantined = 0
        self.duplicate_rate = self.invalid_rate = 0.0
        self.previous_event: dict | None = None
        self.next_batch = now
        self.next_consume = now
        self.logs: deque[RuntimeLog] = deque(maxlen=100)
        self.sequence = 0
        self.dag_trace: list[RuntimeTrace] = []
        self.dag_published = False
        self.fingerprint: str | None = None
        self.model_runs: list[ModelRun] = []
        self.log(
            "workspace",
            "ready",
            f"Loaded {len(self.templates)} catalog event sample rows; these are not the complete scenario population.",
        )

    def log(self, component: str, status: str, detail: str) -> None:
        self.sequence += 1
        self.logs.append(RuntimeLog(sequence=self.sequence, component=component, status=status, detail=detail[:1500]))

    def close(self) -> None:
        self.db.close()

    def produce(self, count: int) -> int:
        count = min(count, MAX_EVENTS - self.produced)
        if not self.templates or count == 0:
            self.producer_running = False
            self.log("producer", "capacity", "Local log capacity reached or no source events available.")
            return 0
        for _ in range(count):
            index = self.produced
            event = dict(self.templates[index % len(self.templates)])
            event["event_id"] = f"runtime-{index + 1}"
            if self.invalid_rate and (index + 1) % max(1, round(1 / self.invalid_rate)) == 0:
                event["amount_cents"] = -1
            elif (
                self.duplicate_rate
                and self.previous_event
                and (index + 1) % max(1, round(1 / self.duplicate_rate)) == max(1, round(1 / self.duplicate_rate)) - 1
            ):
                event = dict(self.previous_event)
            self.previous_event = event
            partition = int(hashlib.sha256(event["user_id"].encode()).hexdigest()[:8], 16) % len(self.partitions)
            offset = len(self.partitions[partition])
            self.partitions[partition].append(event)
            self.db.execute(
                "INSERT INTO event_log VALUES(?,?,?,?)", (partition, offset, event["event_id"], json.dumps(event))
            )
            self.produced += 1
        self.db.commit()
        self.log("producer", "success", f"Appended {count} records across {len(self.partitions)} partitions.")
        return count

    def drain(self, limit: int) -> int:
        consumed = 0
        for partition, events in enumerate(self.partitions):
            while self.offsets[partition] < len(events) and consumed < limit:
                event = events[self.offsets[partition]]
                if event["amount_cents"] < 0:
                    self.quarantined += 1
                    self.db.execute(
                        "INSERT OR IGNORE INTO quarantine VALUES(?,?,?,?,?)",
                        (
                            partition,
                            self.offsets[partition],
                            event["event_id"],
                            "Negative amount_cents",
                            json.dumps(event),
                        ),
                    )
                    self.log(
                        "quality", "quarantined", "Rejected injected negative amount; partition offset still advances."
                    )
                else:
                    cursor = self.db.execute(
                        "INSERT OR IGNORE INTO events VALUES(:event_id,:occurred_at,:user_id,:event_type,:amount_cents,:channel,:plan)",
                        event,
                    )
                    self.inserted += cursor.rowcount
                    self.duplicates += 1 - cursor.rowcount
                self.offsets[partition] += 1
                self.consumed += 1
                consumed += 1
        self.db.commit()
        if consumed:
            self.log("consumer", "success", f"Consumed {consumed} records; offsets advanced after insert-or-ignore.")
        return consumed

    def tick(self, now: float) -> None:
        if self.producer_running and now >= self.next_batch:
            self.produce(self.batch_size)
            self.next_batch = now + 1 / self.rate
        if not self.consumer_paused and now >= self.next_consume:
            self.drain(self.consumer_batch_size)
            self.next_consume = now + 1 / self.consumer_rate

    def models(self) -> None:
        self.model_runs = []
        for name, sql in MODEL_SQL.items():
            self.db.execute(f'DROP TABLE IF EXISTS "{name}"')
            self.db.execute(f'CREATE TABLE "{name}" AS {sql}')
            grain = {
                "runtime_customers": "user_id",
                "runtime_daily": "date",
                "runtime_cohorts": "cohort",
                "product_sales": "product_id",
            }[name]
            test_sql = f'SELECT COUNT(*) FROM (SELECT "{grain}" FROM "{name}" GROUP BY "{grain}" HAVING "{grain}" IS NULL OR COUNT(*) > 1)'
            failures = self.db.execute(test_sql).fetchone()[0]
            tests = [
                ModelTest(
                    name="unique_non_null_grain",
                    status="fail" if failures else "pass",
                    failed_rows=failures,
                    sql=test_sql,
                )
            ]
            if name == "product_sales":
                references_sql = "SELECT COUNT(*) FROM purchases p LEFT JOIN products d ON d.id=p.product_id LEFT JOIN shoppers s ON s.id=p.customer_id WHERE d.id IS NULL OR s.id IS NULL"
                failures = self.db.execute(references_sql).fetchone()[0]
                tests.append(
                    ModelTest(
                        name="purchase_relationships",
                        status="fail" if failures else "pass",
                        failed_rows=failures,
                        sql=references_sql,
                    )
                )
            rows = self.db.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
            self.model_runs.append(
                ModelRun(
                    name=name,
                    status="success" if all(t.status == "pass" for t in tests) else "failed",
                    row_count=rows,
                    sql=sql,
                    source=TABLE_SOURCES[name],
                    tests=tests,
                )
            )
            self.log(
                "models", self.model_runs[-1].status, f"Materialized {name}: {rows} rows; SQL contract tests executed."
            )
        self.db.commit()

    def dag(self, failure: str) -> None:
        self.dag_trace, self.dag_published, self.fingerprint = [], False, None
        self.model_runs = []
        statuses: dict[str, str] = {}
        tasks = [
            ("generate", []),
            ("validate", ["generate"]),
            ("analytics", ["validate"]),
            ("exploration", []),
            ("reconcile", ["analytics", "exploration"]),
            ("publish", ["reconcile"]),
        ]
        payload: dict = {}

        def callback(task: str, attempt: int) -> str:
            if task == "generate":
                payload["events"] = [dict(r) for r in self.db.execute("SELECT * FROM events ORDER BY event_id")]
                return f"Read {len(payload['events'])} current workspace rows."
            if task == "validate":
                if failure == "permanent":
                    raise RuntimeError("Injected permanent validation failure; no retry.")
                bad = self.db.execute(
                    "SELECT COUNT(*) FROM events WHERE event_id IS NULL OR user_id IS NULL OR occurred_at IS NULL OR channel IS NULL OR plan IS NULL OR amount_cents IS NULL OR amount_cents < 0 OR event_type IS NULL OR event_type NOT IN ('signup','activation','payment','churn')"
                ).fetchone()[0]
                if bad:
                    raise RuntimeError("Workspace event field contract failed.")
                return "Checked workspace event IDs, types and nonnegative cents; sample replay is not a full lifecycle simulation."
            if task == "analytics":
                if failure == "transient" and attempt == 1:
                    raise RuntimeError("Injected transient analytics availability fault before SQL execution.")
                self.models()
                payload["models"] = {
                    name: [dict(r) for r in self.db.execute(f'SELECT * FROM "{name}" ORDER BY 1')] for name in MODEL_SQL
                }
                return "Executed four SQLite model transformations and SQL contract tests."
            if task == "exploration":
                payload["commerce"] = {
                    name: [dict(r) for r in self.db.execute(f'SELECT * FROM "{name}" ORDER BY 1')]
                    for name in ("products", "shoppers", "purchases", "graph_nodes", "graph_edges")
                }
                return "Read current independent commerce fixture tables."
            if task == "reconcile":
                revenue = self.db.execute("SELECT COALESCE(SUM(amount_cents),0) FROM events").fetchone()[0]
                daily = self.db.execute("SELECT COALESCE(SUM(revenue_cents),0) FROM runtime_daily").fetchone()[0]
                graph_sql = "SELECT COUNT(*) FROM (SELECT customer_id,product_id,SUM(quantity) weight FROM purchases GROUP BY customer_id,product_id) p LEFT JOIN graph_edges g ON g.source=p.customer_id AND g.target=p.product_id AND g.relation='purchased' WHERE g.weight IS NULL OR g.weight != p.weight"
                if (
                    revenue != daily
                    or self.db.execute(graph_sql).fetchone()[0]
                    or any(r.status == "failed" for r in self.model_runs)
                ):
                    raise RuntimeError("Publication reconciliation or model contracts failed.")
                return "Reconciled event revenue, daily SQL outputs and purchase-edge units."
            self.fingerprint = hashlib.sha256(
                json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
            ).hexdigest()
            self.dag_published = True
            return "Published current in-memory payload fingerprint; no external writes."

        for task, dependencies in tasks:
            if any(statuses[d] != "success" for d in dependencies):
                statuses[task] = "blocked"
                self.dag_trace.append(
                    RuntimeTrace(
                        task_id=task,
                        attempt=0,
                        status="blocked",
                        detail="Unsuccessful dependency; callback not executed.",
                    )
                )
                continue
            for attempt in range(1, 3 if task == "analytics" else 2):
                try:
                    detail = callback(task, attempt)
                except RuntimeError as exc:
                    statuses[task] = "failed"
                    self.dag_trace.append(RuntimeTrace(task_id=task, attempt=attempt, status="failed", detail=str(exc)))
                    if task == "analytics" and failure == "transient" and attempt == 1:
                        continue
                    break
                statuses[task] = "success"
                self.dag_trace.append(RuntimeTrace(task_id=task, attempt=attempt, status="success", detail=detail))
                break
        for entry in self.dag_trace:
            self.log("dag", entry.status, f"{entry.task_id} attempt {entry.attempt}: {entry.detail}")

    def action(self, request: RuntimeAction, now: float) -> None:
        action = request.action
        if action in {"producer_start", "produce"}:
            if request.partitions != len(self.partitions):
                if self.produced:
                    raise RuntimeError("Reset the workspace before changing partitions of an existing log.")
                self.partitions = [[] for _ in range(request.partitions)]
                self.offsets = [0] * request.partitions
            self.batch_size, self.rate = request.batch_size, request.rate_per_second
            self.duplicate_rate, self.invalid_rate = request.duplicate_rate, request.invalid_rate
            if action == "produce":
                self.produce(request.batch_size)
            else:
                self.producer_running, self.next_batch = True, now
                self.log(
                    "producer",
                    "running",
                    f"Background producer: {self.batch_size} records per batch, {self.rate} batches per second.",
                )
        elif action == "producer_stop":
            self.producer_running = False
            self.log("producer", "stopped", "Background production stopped.")
        elif action in {"consumer_pause", "consumer_resume"}:
            self.consumer_paused = action == "consumer_pause"
            if not self.consumer_paused:
                self.consumer_batch_size, self.consumer_rate = request.limit, request.rate_per_second
                self.next_consume = now
            self.log("consumer", "paused" if self.consumer_paused else "running", "Consumer background state changed.")
        elif action == "consumer_drain":
            self.drain(request.limit)
        elif action == "consumer_replay":
            self.offsets = [0] * len(self.partitions)
            self.log("consumer", "replay", "Offsets reset; subsequent consumption deduplicates existing event IDs.")
        elif action == "models_run":
            self.models()
        elif action == "dag_run":
            self.dag(request.failure)

    def state(self, now: float, ttl: int) -> RuntimeState:
        partitions = [
            PartitionState(
                partition=i, produced_offset=len(p), consumed_offset=self.offsets[i], backlog=len(p) - self.offsets[i]
            )
            for i, p in enumerate(self.partitions)
        ]
        tables = []
        names = {r[0] for r in self.db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for name, source in TABLE_SOURCES.items():
            if name not in names:
                continue
            columns = [
                RuntimeColumn(name=r[1], type=r[2], nullable=not bool(r[3] or r[5]), key="primary" if r[5] else "none")
                for r in self.db.execute(f'PRAGMA table_info("{name}")')
            ]
            tables.append(
                RuntimeTable(
                    name=name,
                    row_count=self.db.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0],
                    columns=columns,
                    source=source,
                )
            )
        backlog = sum(p.backlog for p in partitions)
        return RuntimeState(
            scenario_id=self.scenario_id,
            expires_in_seconds=max(0, math.ceil(ttl - (now - self.last_seen))),
            tables=tables,
            streaming=StreamingState(
                producer_running=self.producer_running,
                consumer_paused=self.consumer_paused,
                batch_size=self.batch_size,
                rate_per_second=self.rate,
                partitions=partitions,
                produced=self.produced,
                consumed=self.consumed,
                inserted=self.inserted,
                duplicates=self.duplicates,
                quarantined=self.quarantined,
                accepted=self.inserted,
                duplicate_rate=self.duplicate_rate,
                invalid_rate=self.invalid_rate,
                consumer_batch_size=self.consumer_batch_size,
                consumer_rate_per_second=self.consumer_rate,
                backlog=backlog,
                capacity=MAX_EVENTS,
            ),
            dag_trace=self.dag_trace,
            dag_published=self.dag_published,
            dag_fingerprint=self.fingerprint,
            model_runs=self.model_runs,
            logs=list(self.logs),
            flow=[
                FlowLink(source="producer", target="backlog", value=backlog),
                FlowLink(source="producer", target="consumed", value=self.produced - backlog),
                FlowLink(source="consumer_attempts", target="inserted", value=self.inserted),
                FlowLink(source="consumer_attempts", target="deduplicated", value=self.duplicates),
                FlowLink(source="consumer_attempts", target="quarantined", value=self.quarantined),
            ],
        )

    def query(self, request: QueryRequest) -> QueryResult:
        if not re.match(r"^\s*(SELECT|WITH)\b", request.sql, re.IGNORECASE):
            raise RuntimeError("Only a single SELECT or WITH query is allowed.")
        allowed_tables = set(TABLE_SOURCES)

        def authorize(action, arg1, arg2, dbname, trigger):
            if action in {sqlite3.SQLITE_SELECT, sqlite3.SQLITE_RECURSIVE}:
                return sqlite3.SQLITE_OK
            # SQLite reports no database name for the empty-column READ used
            # by COUNT(*); other databases cannot be attached by this interface.
            if action == sqlite3.SQLITE_READ and arg1 in allowed_tables and dbname in {"main", None}:
                return sqlite3.SQLITE_OK
            if action == sqlite3.SQLITE_FUNCTION and (arg2 or "").lower() in ALLOWED_FUNCTIONS:
                return sqlite3.SQLITE_OK
            return sqlite3.SQLITE_DENY

        start = time.monotonic()
        steps = 0

        def deadline():
            nonlocal steps
            steps += 1000
            return int(steps > 200000 or time.monotonic() - start > QUERY_SECONDS)

        try:
            self.db.execute("PRAGMA query_only=ON")
            self.db.set_authorizer(authorize)
            self.db.set_progress_handler(deadline, 1000)
            cursor = self.db.execute(request.sql)
            columns = [c[0] for c in cursor.description or []]
            if len(columns) > 50:
                raise RuntimeError("Query results are limited to 50 columns.")
            truncated = False
            rows: list[list] = []
            size = 0
            for _ in range(request.row_limit):
                row = cursor.fetchone()
                if row is None:
                    break
                clean = []
                for value in row:
                    if isinstance(value, bytes):
                        value = "[binary value omitted]"
                    elif isinstance(value, str) and len(value) > 2000:
                        value = value[:2000] + "…"
                        truncated = True
                    elif isinstance(value, float) and not math.isfinite(value):
                        value = None
                    clean.append(value)
                size += len(json.dumps(clean).encode())
                if size > MAX_RESULT_BYTES:
                    truncated = True
                    break
                rows.append(clean)
            if len(rows) == request.row_limit and cursor.fetchone() is not None:
                truncated = True
            cursor.close()
            self.log("sql", "success", f"Read-only query returned {len(rows)} rows; no SQL text logged.")
            return QueryResult(
                columns=columns,
                rows=rows,
                row_count=len(rows),
                truncated=truncated,
                elapsed_ms=(time.monotonic() - start) * 1000,
            )
        except sqlite3.Error as exc:
            raise RuntimeError("Query rejected, invalid, or exceeded the read-only execution limit.") from exc
        finally:
            self.db.set_progress_handler(None, 0)
            self.db.set_authorizer(None)
            self.db.execute("PRAGMA query_only=OFF")


class RuntimeManager:
    def __init__(
        self,
        catalog: LabCatalog | None = None,
        *,
        capacity: int = 32,
        ttl: int = TTL_SECONDS,
        clock=time.monotonic,
        background: bool = True,
    ):
        self.catalog = catalog or load_catalog()
        self.capacity, self.ttl, self.clock = capacity, ttl, clock
        self.sessions: dict[str, Workspace] = {}
        self.lock = threading.RLock()
        self.query_slots = threading.BoundedSemaphore(2)
        self.stop = threading.Event()
        if background:
            self.worker = threading.Thread(target=self._background, name="lab-runtime", daemon=True)
            self.worker.start()

    def _expire(self, now: float) -> None:
        for token, workspace in list(self.sessions.items()):
            if now - workspace.last_seen >= self.ttl:
                with workspace.lock:
                    workspace.close()
                del self.sessions[token]

    def tick(self) -> None:
        with self.lock:
            now = self.clock()
            self._expire(now)
            for workspace in self.sessions.values():
                with workspace.lock:
                    workspace.tick(now)

    def _background(self) -> None:
        while not self.stop.wait(0.02):
            self.tick()

    @contextmanager
    def _workspace(self, token: str):
        with self.lock:
            now = self.clock()
            self._expire(now)
            workspace = self.sessions.get(token)
            if workspace is None:
                raise KeyError("Workspace expired or unavailable. Create a new workspace.")
            workspace.lock.acquire()
            workspace.last_seen = now
        try:
            # Cloud Run may throttle CPU between HTTP requests. Advance at most
            # one bounded batch here as well; idle wall time is never synthesized.
            workspace.tick(now)
            yield workspace
        finally:
            workspace.lock.release()

    def create(self, request: SessionRequest) -> SessionResponse:
        with self.lock:
            now = self.clock()
            self._expire(now)
            if len(self.sessions) >= self.capacity:
                raise RuntimeError("Workspace capacity reached. Try again after an existing workspace expires.")
            workspace = Workspace(self.catalog, request.scenario_id, now)
            token = secrets.token_urlsafe(32)
            self.sessions[token] = workspace
            return SessionResponse(token=token, expires_in_seconds=self.ttl, state=workspace.state(now, self.ttl))

    def state(self, token: str) -> RuntimeState:
        with self._workspace(token) as workspace:
            return workspace.state(self.clock(), self.ttl)

    def query(self, token: str, request: QueryRequest) -> QueryResult:
        if not self.query_slots.acquire(blocking=False):
            raise RuntimeError("Two workspace queries are already running. Try again shortly.")
        try:
            with self._workspace(token) as workspace:
                return workspace.query(request)
        finally:
            self.query_slots.release()

    def action(self, token: str, request: RuntimeAction) -> RuntimeState:
        if request.action == "reset":
            with self.lock, self._workspace(token) as workspace:
                replacement = Workspace(self.catalog, workspace.scenario_id, self.clock())
                self.sessions[token] = replacement
                workspace.close()
                return replacement.state(self.clock(), self.ttl)
        with self._workspace(token) as workspace:
            workspace.action(request, self.clock())
            return workspace.state(self.clock(), self.ttl)

    def delete(self, token: str) -> None:
        with self.lock:
            workspace = self.sessions.pop(token, None)
            if workspace:
                with workspace.lock:
                    workspace.close()

    def close(self) -> None:
        self.stop.set()
        with self.lock:
            for workspace in self.sessions.values():
                with workspace.lock:
                    workspace.close()
            self.sessions.clear()
        worker = getattr(self, "worker", None)
        if worker is not None and worker is not threading.current_thread():
            worker.join(timeout=1)


@lru_cache(maxsize=1)
def get_runtime() -> RuntimeManager:
    return RuntimeManager()


def close_cached_runtime() -> None:
    """Release the existing workspace manager during lifespan shutdown only."""
    if get_runtime.cache_info().currsize:
        get_runtime().close()
        get_runtime.cache_clear()
