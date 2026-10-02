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
