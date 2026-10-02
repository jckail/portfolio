"""Real workspace isolation, SQL boundaries, stream controls and executed tasks."""

import time

import pytest
from pydantic import ValidationError

from backend.app.models.dataplayground_runtime import QueryRequest, RuntimeAction, SessionRequest
from backend.app.services import dataplayground_runtime as service
from backend.app.services.dataplayground_runtime import MAX_EVENTS, RuntimeError, RuntimeManager


@pytest.fixture()
def runtime():
    manager = RuntimeManager(background=False)
    yield manager
    manager.close()


def session(runtime):
    return runtime.create(SessionRequest()).token


def query(runtime, token, sql):
    return runtime.query(token, QueryRequest(sql=sql))


def test_real_sql_commerce_fixture_and_visitor_isolation(runtime):
    first, second = session(runtime), session(runtime)
    assert first != second
    result = query(runtime, first, "SELECT COUNT(*) n FROM products")
    assert result.columns == ["n"] and result.rows == [[48]]
    assert query(runtime, first, "SELECT SUM(quantity) FROM purchases").rows[0][0] > 160
    before = query(runtime, second, "SELECT COUNT(*) FROM events").rows[0][0]
    runtime.action(first, RuntimeAction(action="produce", batch_size=20))
    runtime.action(first, RuntimeAction(action="consumer_drain"))
    assert query(runtime, first, "SELECT COUNT(*) FROM events").rows == [[before + 20]]
    assert query(runtime, second, "SELECT COUNT(*) FROM events").rows == [[before]]
    assert runtime.state(second).streaming.produced == 0


@pytest.mark.parametrize(
    "sql",
    [
        "DELETE FROM events",
        "SELECT 1; DELETE FROM events",
        "WITH x AS (SELECT 1) DELETE FROM events",
        "PRAGMA database_list",
        "ATTACH DATABASE '/tmp/escape' AS other",
        "SELECT load_extension('/tmp/escape')",
        "SELECT readfile('/etc/passwd')",
        "SELECT randomblob(1000000000)",
        "SELECT zeroblob(1000000000)",
        "SELECT name FROM sqlite_master",
        "SELECT * FROM pragma_database_list",
        "SELECT * FROM sqlite_dbpage",
        "SELECT printf('%1000000000s','x')",
        "WITH RECURSIVE x(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM x) SELECT sum(n) FROM x",
    ],
)
def test_readonly_single_statement_functions_and_resource_limits(runtime, sql):
    token = session(runtime)
    with pytest.raises(RuntimeError):
        query(runtime, token, sql)
    assert query(runtime, token, "SELECT COUNT(*) FROM products").rows == [[48]]
    # Authorizer/query-only/progress handlers are restored even after rejection.
    assert runtime.action(token, RuntimeAction(action="produce")).streaming.produced == 10


def test_select_with_join_json_and_bounded_results(runtime):
    token = session(runtime)
    result = query(
        runtime,
        token,
        "WITH totals AS (SELECT product_id,SUM(quantity) units FROM purchases GROUP BY product_id) SELECT p.name,t.units,json_extract(p.vector_json,'$[0]') FROM totals t JOIN products p ON p.id=t.product_id ORDER BY t.units DESC LIMIT 3",
    )
    assert len(result.rows) == 3 and isinstance(result.rows[0][2], float)
    small = runtime.query(token, QueryRequest(sql="SELECT * FROM purchases", row_limit=2))
    assert small.row_count == 2 and small.truncated


def test_background_producer_consumer_controls_and_partition_offsets():
    runtime = RuntimeManager()
    try:
        token = session(runtime)
        runtime.action(token, RuntimeAction(action="producer_start", batch_size=3, rate_per_second=20, partitions=4))
        deadline = time.monotonic() + 2
        while runtime.state(token).streaming.produced < 6 and time.monotonic() < deadline:
            time.sleep(0.02)
        state = runtime.action(token, RuntimeAction(action="producer_stop"))
        assert state.streaming.produced >= 6 and state.streaming.backlog == state.streaming.produced
        assert len(state.streaming.partitions) == 4
        runtime.action(token, RuntimeAction(action="consumer_resume"))
        deadline = time.monotonic() + 2
        while runtime.state(token).streaming.backlog and time.monotonic() < deadline:
            time.sleep(0.02)
        state = runtime.action(token, RuntimeAction(action="consumer_pause"))
        assert state.streaming.backlog == 0 and state.streaming.inserted == state.streaming.produced
        assert all(p.consumed_offset == p.produced_offset for p in state.streaming.partitions)
        produced = state.streaming.produced
        time.sleep(0.07)
        assert runtime.state(token).streaming.produced == produced
    finally:
        runtime.close()


def test_quality_injection_replay_and_attempt_flow_conservation(runtime):
    token = session(runtime)
    runtime.action(token, RuntimeAction(action="produce", batch_size=20, duplicate_rate=0.2, invalid_rate=0.2))
    state = runtime.action(token, RuntimeAction(action="consumer_drain"))
    assert (state.streaming.inserted, state.streaming.duplicates, state.streaming.quarantined) == (12, 4, 4)
    assert query(runtime, token, "SELECT COUNT(*) FROM quarantine").rows == [[4]]
    assert (
        state.streaming.consumed == state.streaming.inserted + state.streaming.duplicates + state.streaming.quarantined
    )
    rows = query(runtime, token, "SELECT COUNT(*) FROM events").rows
    runtime.action(token, RuntimeAction(action="consumer_replay"))
    replay = runtime.action(token, RuntimeAction(action="consumer_drain"))
    assert replay.streaming.inserted == 12 and replay.streaming.duplicates == 20 and replay.streaming.quarantined == 8
    assert query(runtime, token, "SELECT COUNT(*) FROM events").rows == rows
    assert sum(link.value for link in replay.flow if link.source == "consumer_attempts") == replay.streaming.consumed


def test_capacity_ttl_reset_delete_and_partition_change(runtime):
    now = [0.0]
    bounded = RuntimeManager(capacity=1, ttl=5, clock=lambda: now[0], background=False)
    try:
        token = session(bounded)
        with pytest.raises(RuntimeError, match="capacity"):
            session(bounded)
        bounded.action(token, RuntimeAction(action="produce"))
        with pytest.raises(RuntimeError, match="Reset"):
            bounded.action(token, RuntimeAction(action="produce", partitions=4))
        reset = bounded.action(token, RuntimeAction(action="reset"))
        assert reset.streaming.produced == 0 and query(bounded, token, "SELECT COUNT(*) FROM event_log").rows == [[0]]
        now[0] = 6
        with pytest.raises(KeyError):
            bounded.state(token)
        replacement = session(bounded)
        assert replacement != token
        bounded.delete(replacement)
        with pytest.raises(KeyError):
            bounded.state(replacement)
    finally:
        bounded.close()


def test_bounded_event_log_and_logs(runtime):
    token = session(runtime)
    for _ in range(MAX_EVENTS // 100 + 2):
        runtime.action(token, RuntimeAction(action="produce", batch_size=100))
    state = runtime.state(token)
    assert state.streaming.produced == MAX_EVENTS
    assert query(runtime, token, "SELECT COUNT(*) FROM event_log").rows == [[MAX_EVENTS]]
    assert len(state.logs) <= 100


def test_executed_models_sql_tests_and_dag_failure_retry(runtime):
    token = session(runtime)
    transformed = runtime.action(token, RuntimeAction(action="models_run"))
    assert len(transformed.model_runs) == 4
    assert all(run.status == "success" and all(t.status == "pass" for t in run.tests) for run in transformed.model_runs)
    assert (
        query(runtime, token, "SELECT SUM(revenue_cents) FROM runtime_daily").rows
        == query(runtime, token, "SELECT SUM(amount_cents) FROM events").rows
    )
    normal = runtime.action(token, RuntimeAction(action="dag_run"))
    retry = runtime.action(token, RuntimeAction(action="dag_run", failure="transient"))
    assert normal.dag_published and retry.dag_published and normal.dag_fingerprint == retry.dag_fingerprint
    assert [(t.attempt, t.status) for t in retry.dag_trace if t.task_id == "analytics"] == [
        (1, "failed"),
        (2, "success"),
    ]
    failure = runtime.action(token, RuntimeAction(action="dag_run", failure="permanent"))
    assert not failure.dag_published and failure.dag_fingerprint is None
    assert [(t.task_id, t.attempt) for t in failure.dag_trace if t.status == "blocked"] == [
        ("analytics", 0),
        ("reconcile", 0),
        ("publish", 0),
    ]
    assert next(t for t in failure.dag_trace if t.task_id == "exploration").status == "success"


def test_failed_dag_preserves_existing_materialization_revision_and_staleness(runtime):
    token = session(runtime)
    built = runtime.action(token, RuntimeAction(action="models_run"))
    old_rows = query(runtime, token, "SELECT SUM(signups+activations+payments+churns) FROM runtime_daily").rows
    runtime.action(token, RuntimeAction(action="produce", batch_size=5))
    changed = runtime.action(token, RuntimeAction(action="consumer_drain"))
    assert changed.models_stale and changed.data_revision == 5
    failed = runtime.action(token, RuntimeAction(action="dag_run", failure="permanent"))
    assert failed.model_runs == built.model_runs
    assert failed.model_input_revision == built.model_input_revision == 0
    assert failed.models_stale and not failed.dag_published
    assert query(runtime, token, "SELECT SUM(signups+activations+payments+churns) FROM runtime_daily").rows == old_rows
    repaired = runtime.action(token, RuntimeAction(action="dag_run"))
    assert repaired.dag_published and not repaired.models_stale
    assert repaired.model_input_revision == repaired.data_revision == 5
    assert query(runtime, token, "SELECT SUM(signups+activations+payments+churns) FROM runtime_daily").rows == [[old_rows[0][0] + 5]]


@pytest.mark.parametrize("length", [2000, 2001])
@pytest.mark.parametrize("character", ["x", "🚀"])
def test_query_cell_limit_includes_ellipsis(runtime, length, character):
    result = query(runtime, session(runtime), "SELECT '" + character * length + "' AS value")
    expected = character * 2000 if length == 2000 else character * 1999 + "…"
    assert result.rows == [[expected]]
    assert len(result.rows[0][0]) == 2000
    assert result.truncated is (length > 2000)


def test_run_evidence_tracks_accepted_data_and_preserves_historical_publication(runtime):
    token = session(runtime)
    initial = runtime.state(token)
    assert initial.workspace_generation == 1 and initial.data_revision == 0
    assert initial.dag_input_revision is None and initial.model_input_revision is None
    assert not initial.dag_stale and not initial.models_stale
    published = runtime.action(token, RuntimeAction(action="dag_run"))
    assert published.dag_input_revision == published.model_input_revision == 0

    queued = runtime.action(token, RuntimeAction(action="produce", batch_size=20, duplicate_rate=0.2, invalid_rate=0.2))
    assert queued.data_revision == 0 and not queued.dag_stale
    changed = runtime.action(token, RuntimeAction(action="consumer_drain"))
    assert changed.data_revision == changed.streaming.inserted == 12
    assert changed.dag_stale and changed.models_stale
    assert changed.dag_published and changed.dag_fingerprint == published.dag_fingerprint
    rebuilt = runtime.action(token, RuntimeAction(action="models_run"))
    assert rebuilt.model_input_revision == 12 and not rebuilt.models_stale
    assert rebuilt.dag_input_revision == 0 and rebuilt.dag_stale

    runtime.action(token, RuntimeAction(action="consumer_replay"))
    replayed = runtime.action(token, RuntimeAction(action="consumer_drain"))
    assert replayed.data_revision == 12 and not replayed.models_stale
    fresh = runtime.action(token, RuntimeAction(action="dag_run"))
    assert fresh.dag_input_revision == fresh.model_input_revision == 12
    assert not fresh.dag_stale and not fresh.models_stale
    assert fresh.dag_fingerprint != published.dag_fingerprint
    fresh_rows = query(runtime, token, "SELECT * FROM runtime_daily ORDER BY date").rows
    failed = runtime.action(token, RuntimeAction(action="dag_run", failure="permanent"))
    assert failed.dag_input_revision == failed.model_input_revision == 12
    assert failed.model_runs == fresh.model_runs and not failed.models_stale
    assert query(runtime, token, "SELECT * FROM runtime_daily ORDER BY date").rows == fresh_rows
    assert not failed.dag_published and failed.dag_fingerprint is None


def test_reset_generation_rejects_old_actions_before_background_execution():
    now = [0.0]
    manager = RuntimeManager(background=False, clock=lambda: now[0])
    try:
        token = session(manager)
        reset = manager.action(token, RuntimeAction(action="reset"), expected_generation=1)
        assert reset.workspace_generation == 2 and reset.data_revision == 0
        assert reset.dag_input_revision is None and reset.model_input_revision is None
        manager.action(token, RuntimeAction(action="producer_start"), expected_generation=2)
        before = manager.diagnostics(token)
        now[0] += 1
        for action in ("produce", "consumer_drain", "reset"):
            with pytest.raises(ValueError, match="Workspace changed"):
                manager.action(token, RuntimeAction(action=action), expected_generation=1)
        with pytest.raises(ValueError, match="Workspace changed"):
            manager.query(token, QueryRequest(sql="SELECT COUNT(*) FROM events"), expected_generation=1)
        with pytest.raises(ValueError, match="Workspace changed"):
            manager.state(token, expected_generation=1)
        assert manager.diagnostics(token) == before
        next_reset = manager.action(token, RuntimeAction(action="reset"), expected_generation=2)
        assert next_reset.workspace_generation == 3 and next_reset.streaming.produced == 0
    finally:
        manager.close()


def test_query_provenance_and_diagnostics_are_bounded_and_do_not_tick():
    now = [0.0]
    manager = RuntimeManager(background=False, clock=lambda: now[0])
    try:
        token = session(manager)
        manager.action(token, RuntimeAction(action="produce", batch_size=100, invalid_rate=0.2))
        consumed = manager.action(token, RuntimeAction(action="consumer_drain"))
        result = manager.query(token, QueryRequest(sql="SELECT COUNT(*) FROM events"), expected_generation=1)
        assert result.workspace_generation == 1 and result.data_revision == consumed.data_revision == 80
        manager.action(token, RuntimeAction(action="dag_run"))
        manager.action(token, RuntimeAction(action="producer_start", invalid_rate=0.2))
        before = manager.diagnostics(token)
        now[0] += 1
        diagnostic = manager.diagnostics(token)
        assert diagnostic == before
        assert diagnostic["workspace_generation"] == 1 and diagnostic["data_revision"] == 80
        assert diagnostic["run"]["dag_input_revision"] == 80 and not diagnostic["run"]["dag_stale"]
        assert diagnostic["quarantine"]["total_rows"] == 20
        assert len(diagnostic["quarantine"]["sample"]) == 10
        assert diagnostic["quarantine"]["sample_truncated"]
        assert set(diagnostic["quarantine"]["sample"][0]) == {"partition", "offset", "event_id", "reason"}
        assert len(diagnostic["logs"]) <= 20
        assert token not in str(diagnostic) and "payload" not in str(diagnostic["quarantine"])
    finally:
        manager.close()


@pytest.mark.parametrize(
    "change",
    [
        dict(batch_size=True),
        dict(batch_size=101),
        dict(partitions=9),
        dict(rate_per_second=51),
        dict(duplicate_rate=float("nan")),
        dict(invalid_rate=float("inf")),
        dict(failure="unknown"),
    ],
)
def test_strict_action_bounds(change):
    with pytest.raises(ValidationError):
        RuntimeAction(action="produce", **change)


def test_shutdown_helper_never_initializes_an_unused_runtime():
    service.close_cached_runtime()
    assert service.get_runtime.cache_info().currsize == 0
    service.close_cached_runtime()
    assert service.get_runtime.cache_info().currsize == 0
    manager = service.get_runtime()
    token = manager.create(SessionRequest()).token
    assert service.get_runtime.cache_info().currsize == 1
    service.close_cached_runtime()
    assert manager.stop.is_set() and not manager.worker.is_alive() and not manager.sessions
    assert service.get_runtime.cache_info().currsize == 0
    with pytest.raises(KeyError):
        manager.state(token)


@pytest.fixture()
def budget_client(monkeypatch, runtime):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from backend.app.api import dataplayground_runtime_routes as routes
    from backend.app.services import dataplayground_copilot as copilot
    from backend.app.utils.rate_limit import SlidingWindowLimiter

    monkeypatch.setattr(routes, "get_runtime", lambda: runtime)

    def prohibit_provider(*args, **kwargs):
        raise AssertionError("Budget regression tests must not call a model provider")

    monkeypatch.setattr(copilot, "build_provider", prohibit_provider)
    for name in ("_sessions", "_operations", "_chat"):
        monkeypatch.setattr(
            routes, name, SlidingWindowLimiter(max_events=2, window_seconds=60, global_max_events=2, name="test-budget")
        )
    token = session(runtime)
    app = FastAPI()
    app.include_router(routes.router, prefix="/api")
    with TestClient(app) as client:
        yield client, {"Authorization": "Bearer " + token}, routes


@pytest.mark.parametrize("operation", ["action", "query"])
@pytest.mark.parametrize("invalid", ["json", "contract", "oversized", "content_type"])
def test_mutation_invalid_bodies_consume_request_budget(budget_client, operation, invalid):
    client, headers, routes = budget_client
    url = "/api/dataplayground/runtime/" + operation
    inputs = {
        "json": {"content": b"{", "headers": {**headers, "Content-Type": "application/json"}},
        "contract": {"json": {"unknown": 1}, "headers": headers},
        "oversized": {
            "content": iter([b" " * 30000, b" " * 30000]),
            "headers": {**headers, "Content-Type": "application/json"},
        },
        "content_type": {"content": b"{}", "headers": {**headers, "Content-Type": "text/plain"}},
    }
    expected = {"json": 422, "contract": 422, "oversized": 413, "content_type": 415}[invalid]
    for _ in range(2):
        inputs["oversized"]["content"] = iter([b" " * 30000, b" " * 30000])
        response = client.post(url, **inputs[invalid])
        assert response.status_code == expected and response.headers["cache-control"] == "no-store"
    blocked = client.post(url, headers=headers, json={})
    assert blocked.status_code == 429 and blocked.headers["cache-control"] == "no-store"
    assert len(routes._operations._global) == 2


@pytest.mark.parametrize("operation", ["action", "query"])
def test_mutation_authorization_precedes_body_and_is_budgeted(budget_client, monkeypatch, operation):
    client, _, routes = budget_client

    async def prohibit_body(*args, **kwargs):
        raise AssertionError("Unauthorized or rate-limited requests must not read their body")

    monkeypatch.setattr(routes, "body", prohibit_body)
    url = "/api/dataplayground/runtime/" + operation
    for _ in range(2):
        response = client.post(url, content=b"malformed")
        assert response.status_code == 401 and response.headers["cache-control"] == "no-store"
    assert client.post(url, content=b"malformed").status_code == 429
    assert len(routes._operations._global) == 2


@pytest.mark.parametrize(
    "suffix,limiter_name",
    [("/runtime/session", "_sessions"), ("/copilot/chat", "_chat"), ("/copilot/confirm", "_operations")],
)
def test_other_mutation_paths_already_budget_invalid_contracts(budget_client, suffix, limiter_name):
    client, headers, routes = budget_client
    for _ in range(2):
        assert client.post("/api/dataplayground" + suffix, headers=headers, json={"unknown": 1}).status_code == 422
    assert client.post("/api/dataplayground" + suffix, headers=headers, json={"unknown": 1}).status_code == 429
    assert len(getattr(routes, limiter_name)._global) == 2


def test_valid_mutations_charge_once_and_share_read_close_budget(budget_client):
    client, headers, routes = budget_client
    routes._operations.max_events = routes._operations.global_max_events = 4
    root = "/api/dataplayground/runtime"
    assert client.post(root + "/action", headers=headers, json={"action": "produce"}).status_code == 200
    assert client.post(root + "/query", headers=headers, json={"sql": "SELECT COUNT(*) FROM events"}).status_code == 200
    assert client.get(root + "/state", headers=headers).status_code == 200
    assert client.post(root + "/close", headers=headers).status_code == 200
    assert len(routes._operations._global) == 4
    assert client.get(root + "/state", headers=headers).status_code == 429


def test_streamed_body_rejects_chunk_before_copying_into_accumulator(monkeypatch):
    import asyncio
    from types import SimpleNamespace

    from fastapi import HTTPException

    from backend.app.api import dataplayground_runtime_routes as routes

    buffers = []

    class BoundedAccumulator(bytearray):
        def __init__(self):
            super().__init__()
            buffers.append(self)

        def extend(self, chunk):
            assert len(self) + len(chunk) <= 4, "Oversized input must be rejected before copying"
            super().extend(chunk)

    async def chunks():
        yield b"abc"
        yield b"de"

    monkeypatch.setattr(routes, "bytearray", BoundedAccumulator, raising=False)
    request = SimpleNamespace(headers={"content-type": "application/json"}, stream=chunks)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(routes.body(request, QueryRequest, max_bytes=4))
    assert caught.value.status_code == 413
    assert caught.value.headers["Cache-Control"] == "no-store"
    assert bytes(buffers[0]) == b"abc"
