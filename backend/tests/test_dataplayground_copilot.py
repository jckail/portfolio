"""Offline genuine Pi subprocess/provider bridge, capabilities and cancellation."""
import asyncio
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from backend.app.models.dataplayground_copilot import CopilotRequest
from backend.app.models.dataplayground_runtime import SessionRequest
from backend.app.services import dataplayground_copilot as copilot
from backend.app.services.dataplayground_runtime import RuntimeManager
from backend.app.services.llm import Finish, TextDelta, ToolCall, Usage
from backend.app.services.llm.base import ProviderAuthError


class FakeProvider:
    def __init__(self, turns):
        self.turns = turns
        self.requests = []
        self.closed = False

    async def stream(self, request):
        self.requests.append(request)
        for event in self.turns[len(self.requests) - 1]:
            if isinstance(event, Exception):
                raise event
            yield event
            await asyncio.sleep(0)

    async def aclose(self):
        self.closed = True


@pytest.fixture()
def setup(monkeypatch):
    runtime = RuntimeManager(background=False)
    settings = SimpleNamespace(chat_available=True, chat_model="gemini-3.1-flash",
                               dataplayground_copilot_daily_tokens=1000000)
    monkeypatch.setattr(copilot, "get_runtime", lambda: runtime)
    monkeypatch.setattr(copilot, "get_settings", lambda: settings)
    monkeypatch.setattr(copilot, "_pending", {})
    monkeypatch.setattr(copilot, "_active_workspaces", set())
    monkeypatch.setattr(copilot, "_slots", threading.BoundedSemaphore(2))
    monkeypatch.setattr(copilot, "_tokens_used", 0)
    monkeypatch.setattr(copilot, "_tokens_reserved", 0)
    monkeypatch.setattr(copilot, "_budget_day", datetime.now(UTC).date())
    assert copilot.available(), "Installed genuine Pi Node package is required for copilot tests"
    yield runtime, settings
    runtime.close()


def session(runtime):
    return runtime.create(SessionRequest()).token


def use_provider(monkeypatch, provider):
    monkeypatch.setattr(copilot, "build_provider", lambda _settings: provider)


def run_chat(token, message="Inspect the workspace"):
    return asyncio.run(copilot.chat(token, CopilotRequest(message=message)))


def test_actual_pi_sql_tool_loop_preserves_vertex_state_and_exposes_bounded_evidence(setup, monkeypatch):
    runtime, _ = setup
    token = session(runtime)
    thought = {"thoughtSignature": "opaque-signature-private", "future": {"nested": [1, 2]}}
    sql = "SELECT COUNT(*) AS count FROM products"
    provider = FakeProvider([
        [ToolCall("query_one", "query_sql", {"sql": sql, "row_limit": 1}, thought), Usage(10, 5), Finish("tool_use")],
        [TextDelta("There are "), TextDelta("48 products."), Usage(15, 5), Finish("end")],
    ])
    use_provider(monkeypatch, provider)
    response = run_chat(token, "How many products are loaded?")
    assert response.text == "There are 48 products."
    assert len(provider.requests) == 2 and provider.closed
    second = provider.requests[1]
    assert second.messages[-2]["tool_calls"][0].provider_state == thought
    assert second.messages[-1]["results"][0]["output"]["rows"] == [[48]]
    assert second.max_tokens == 1024
    evidence = next(event for event in response.events if event["type"] == "tool_result")
    assert evidence["result"] == {"sql": sql, "columns": ["count"], "row_count": 1, "truncated": False, "rows": [[48]]}
    serialized = response.model_dump_json()
    assert "opaque-signature" not in serialized and token not in serialized
    assert copilot._tokens_used == 35 and copilot._tokens_reserved == 0
    assert not copilot._active_workspaces


def test_private_subprocess_environment_excludes_credentials_host_auth_and_node_options(setup, monkeypatch):
    runtime, _ = setup
    monkeypatch.setenv("VERTEX_API_KEY", "never-in-child")
    monkeypatch.setenv("NODE_OPTIONS", "--require=/private/host/module")
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", "/private/key.json")
    monkeypatch.setenv("PI_AGENT_DIR", "/private/sessions")
    real_spawn = copilot.asyncio.create_subprocess_exec
    captured = []

    async def spawn(*args, **kwargs):
        captured.append(kwargs)
        return await real_spawn(*args, **kwargs)

    monkeypatch.setattr(copilot.asyncio, "create_subprocess_exec", spawn)
    provider = FakeProvider([[TextDelta("Ready."), Usage(1, 1), Finish("end")]])
    use_provider(monkeypatch, provider)
    assert run_chat(session(runtime)).text == "Ready."
    assert set(captured[0]["env"]) == {"PATH", "LANG"}
    assert "never-in-child" not in json.dumps(captured[0]["env"])
    assert "HOME" not in captured[0]["env"]


def test_workspace_inspection_and_actual_saved_run_catalog_model_json(setup, monkeypatch):
    runtime, _ = setup
    token = session(runtime)
    saved = copilot.load_catalog().runs[0]
    provider = FakeProvider([
        [ToolCall("workspace", "inspect_workspace", {}), ToolCall("run", "inspect_run", {"run_id": saved.id}),
         ToolCall("catalog", "inspect_catalog", {"section": "architecture"}), Usage(5, 5), Finish("tool_use")],
        [TextDelta("Read actual workspace and saved source metadata."), Usage(5, 5), Finish("end")],
    ])
    use_provider(monkeypatch, provider)
    response = run_chat(token)
    evidence = [event for event in response.events if event["type"] == "tool_result"]
    workspace = next(event["result"] for event in evidence if event["tool"] == "inspect_workspace")
    assert any(table["name"] == "products" and table["row_count"] == 48 for table in workspace["tables"])
    assert workspace["streaming"]["backlog"] == 0
    run = next(event["result"] for event in evidence if event["tool"] == "inspect_run")
    assert run["id"] == saved.id and run["summary"]["signups"] == saved.summary.signups
    # Full metadata is delivered to Pi/model, public evidence remains bounded.
    results = provider.requests[-1].messages
    architecture = next(turn for turn in results if turn["role"] == "tool" and turn["results"][0]["name"] == "inspect_catalog")
    assert architecture["results"][0]["output"]["architecture"]["dags"]
    assert all(len(copilot._encode(event)) < copilot.MAX_EVIDENCE_BYTES + 100 for event in evidence)
    json.loads(response.model_dump_json())


def test_pi_proposal_is_workspace_bound_single_use_and_never_applies_automatically(setup, monkeypatch):
    runtime, _ = setup
    first, second = session(runtime), session(runtime)
    provider = FakeProvider([
        [ToolCall("change", "propose_runtime_change", {"action": "produce", "batch_size": 3,
                  "duplicate_rate": 0.2, "invalid_rate": 0.1, "reason": "Demonstrate record validation."}), Usage(3, 3), Finish("tool_use")],
        [TextDelta("Confirm the proposal to produce three rows."), Usage(3, 3), Finish("end")],
    ])
    use_provider(monkeypatch, provider)
    response = run_chat(first)
    assert runtime.state(first).streaming.produced == 0
    proposal = response.proposals[0]
    assert proposal["action"]["batch_size"] == 3
    assert proposal["action"]["duplicate_rate"] == 0.2
    with pytest.raises(ValueError, match="another workspace"):
        copilot.confirm(second, proposal["id"])
    result = copilot.confirm(first, proposal["id"])
    assert result.streaming.produced == 3
    with pytest.raises(ValueError, match="expired"):
        copilot.confirm(first, proposal["id"])
    assert runtime.state(second).streaming.produced == 0


def test_concurrent_confirm_atomically_consumes_once_and_failed_action_still_consumes(setup, monkeypatch):
    runtime, _ = setup
    token = session(runtime)
    proposal = copilot._tool(token, "propose_runtime_change", {"action": "produce", "batch_size": 2, "reason": "Test concurrency"})["proposal"]

    def confirm():
        try:
            copilot.confirm(token, proposal["id"])
            return True
        except ValueError:
            return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sum(executor.map(lambda _: confirm(), range(2))) == 1
    assert runtime.state(token).streaming.produced == 2
    proposal = copilot._tool(token, "propose_runtime_change", {"action": "produce", "partitions": 5, "reason": "Should fail"})["proposal"]
    with pytest.raises(ValueError):
        copilot.confirm(token, proposal["id"])
    assert proposal["id"] not in copilot._pending


def test_proposal_limits_ttl_strict_params_and_cancelled_creation(setup, monkeypatch):
    runtime, _ = setup
    token = session(runtime)
    for _ in range(5):
        copilot._tool(token, "propose_runtime_change", {"action": "reset", "reason": "Try reset"})
    with pytest.raises(ValueError, match="limit"):
        copilot._tool(token, "propose_runtime_change", {"action": "reset", "reason": "Try reset"})
    monkeypatch.setattr(copilot.time, "monotonic", lambda: 10**12)
    proposal = copilot._tool(token, "propose_runtime_change", {"action": "reset", "reason": "After expiry"})["proposal"]
    assert len(copilot._pending) == 1
    with pytest.raises(ValueError):
        copilot._tool(token, "propose_runtime_change", {"action": "reset", "reason": " ", "shell": "anything"})
    cancelled = threading.Event()
    cancelled.set()
    with pytest.raises(ValueError, match="cancelled"):
        copilot._tool(token, "propose_runtime_change", {"action": "reset", "reason": "Ignore cancel"}, set(), cancelled)
    assert proposal["id"] in copilot._pending


def test_readonly_sql_unknown_tools_expired_capabilities_and_bounded_samples(setup):
    runtime, _ = setup
    token = session(runtime)
    with pytest.raises(ValueError):
        copilot._tool(token, "query_sql", {"sql": "DELETE FROM events"})
    with pytest.raises(ValueError):
        copilot._tool(token, "inspect_workspace", {"path": "/etc/passwd"})
    with pytest.raises(ValueError):
        copilot._tool(token, "inspect_catalog", {"section": "private"})
    with pytest.raises(ValueError):
        copilot._tool(token, "bash", {})
    result = copilot._tool(token, "query_sql", {"sql": "SELECT * FROM purchases", "row_limit": 20})
    assert len(copilot._evidence("query_sql", {"sql": "SELECT * FROM purchases"}, result)["result"]["rows"]) == 10
    runtime.delete(token)
    with pytest.raises(KeyError):
        copilot._tool(token, "inspect_catalog", {})
    with pytest.raises(KeyError):
        run_chat(token)


def test_provider_auth_failure_and_unknown_exception_are_public_safe(setup, monkeypatch):
    runtime, _ = setup
    for failure in [ProviderAuthError("SECRET provider response"), RuntimeError("SECRET provider exception")]:
        provider = FakeProvider([[failure]])
        use_provider(monkeypatch, provider)
        with pytest.raises(copilot.CopilotUnavailable) as caught:
            run_chat(session(runtime))
        assert str(caught.value) == "" and "SECRET" not in str(caught.value)
        assert provider.closed and not copilot._active_workspaces
        assert copilot._tokens_reserved == 0


def test_budget_reservation_blocks_provider_before_spend_and_usage_count_is_cumulative(setup, monkeypatch):
    _, settings = setup
    provider = FakeProvider([[Usage(10, 20), Usage(10, 20), Finish("end")]])
    request = {"systemPrompt": "test", "messages": [{"role": "user", "text": "hello"}], "tools": []}
    asyncio.run(copilot._model(provider, request))
    assert copilot._tokens_used == 30 and copilot._tokens_reserved == 0
    settings.dataplayground_copilot_daily_tokens = 31
    with pytest.raises(copilot.CopilotUnavailable):
        asyncio.run(copilot._model(provider, request))
    assert len(provider.requests) == 1
    copilot._tokens_used = 31
    assert not copilot.available()


def test_cancellation_kills_actual_pi_process_closes_provider_and_releases_slots(setup, monkeypatch):
    runtime, _ = setup
    started = asyncio.Event()
    processes = []
    real_spawn = copilot.asyncio.create_subprocess_exec

    async def spawn(*args, **kwargs):
        process = await real_spawn(*args, **kwargs)
        processes.append(process)
        return process

    class WaitingProvider(FakeProvider):
        async def stream(self, request):
            self.requests.append(request)
            started.set()
            await asyncio.Future()
            yield Finish("end")

    provider = WaitingProvider([])
    use_provider(monkeypatch, provider)
    monkeypatch.setattr(copilot.asyncio, "create_subprocess_exec", spawn)
    token = session(runtime)

    async def execute():
        task = asyncio.create_task(copilot.chat(token, CopilotRequest(message="Wait")))
        await started.wait()
        with pytest.raises(copilot.CopilotBusy):
            await copilot.chat(token, CopilotRequest(message="Concurrent same workspace"))
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(execute())
    assert provider.closed and not copilot._active_workspaces
    assert processes[0].returncode is not None
    assert copilot._tokens_reserved == 0
    assert copilot._slots.acquire(blocking=False)
    assert copilot._slots.acquire(blocking=False)
    copilot._slots.release()
    copilot._slots.release()


def test_deadline_cancels_provider_reaps_process_and_rolls_back_undelivered_proposals(setup, monkeypatch):
    runtime, _ = setup
    monkeypatch.setattr(copilot, "TOTAL_TIMEOUT", 0.8)

    class WaitingProvider(FakeProvider):
        async def stream(self, request):
            self.requests.append(request)
            if len(self.requests) == 1:
                yield ToolCall("proposal", "propose_runtime_change", {"action": "reset", "reason": "Confirm reset"})
                yield Usage(1, 1)
                yield Finish("tool_use")
            else:
                await asyncio.Future()

    provider = WaitingProvider([])
    use_provider(monkeypatch, provider)
    with pytest.raises(copilot.CopilotUnavailable):
        run_chat(session(runtime))
    assert provider.closed and not copilot._pending and not copilot._active_workspaces


def test_cleanup_error_does_not_mask_safe_failure_and_slot_releases(setup, monkeypatch):
    runtime, _ = setup

    class CloseFailProvider(FakeProvider):
        async def aclose(self):
            raise RuntimeError("SECRET cleanup provider response")

    provider = CloseFailProvider([[RuntimeError("SECRET request provider response")]])
    use_provider(monkeypatch, provider)
    with pytest.raises(copilot.CopilotUnavailable) as caught:
        run_chat(session(runtime))
    assert not str(caught.value) and not copilot._active_workspaces


def test_nonfinite_provider_tool_values_rejected_before_ipc(setup, monkeypatch):
    runtime, _ = setup
    provider = FakeProvider([[ToolCall("bad", "query_sql", {"sql": "SELECT 1", "row_limit": float("nan")})]])
    use_provider(monkeypatch, provider)
    with pytest.raises(copilot.CopilotUnavailable):
        run_chat(session(runtime))
    assert provider.closed


def test_concurrent_budget_reservation_cannot_spend_same_remaining_allowance(setup):
    _, settings = setup
    request = {"systemPrompt": "test", "messages": [{"role": "user", "text": "hello"}], "tools": []}
    settings.dataplayground_copilot_daily_tokens = len(copilot._encode(request)) + 1024

    async def execute():
        started, finish = asyncio.Event(), asyncio.Event()

        class BlockedProvider(FakeProvider):
            async def stream(self, request):
                self.requests.append(request)
                started.set()
                await finish.wait()
                yield Usage(2, 2)
                yield Finish("end")

        provider = BlockedProvider([])
        first = asyncio.create_task(copilot._model(provider, request))
        await started.wait()
        assert copilot._tokens_reserved == settings.dataplayground_copilot_daily_tokens
        second = FakeProvider([[Usage(1, 1), Finish("end")]])
        with pytest.raises(copilot.CopilotUnavailable):
            await copilot._model(second, request)
        assert not second.requests
        finish.set()
        await first
        assert copilot._tokens_reserved == 0 and copilot._tokens_used == 4

    asyncio.run(execute())


def test_bad_usage_cannot_poison_budget_with_nonfinite_values(setup, monkeypatch):
    runtime, _ = setup
    provider = FakeProvider([[Usage(float("inf"), 1)]])
    use_provider(monkeypatch, provider)
    with pytest.raises(copilot.CopilotUnavailable):
        run_chat(session(runtime))
    assert isinstance(copilot._tokens_used, int)
    assert copilot._tokens_reserved == 0


class FakeProcess:
    """Protocol-edge process double; core tool-loop tests use the genuine Node SDK."""
    def __init__(self, frames):
        self.stdout = self
        self.lines = iter(copilot._encode(frame) + b"\n" for frame in frames)
        self.stdin = self
        self.returncode = None
        self.killed = self.waited = False
        self.writes = []

    async def readline(self):
        return next(self.lines, b"")

    def write(self, data):
        self.writes.append(json.loads(data))

    async def drain(self):
        pass

    def kill(self):
        self.killed = True
        self.returncode = -9

    async def wait(self):
        self.waited = True
        return self.returncode


@pytest.mark.parametrize("frames", [
    [{"type": "unknown", "text": "SECRET-private-error"}],
    [{"type": "tool_request", "id": "1", "tool": "bash", "args": {}}],
    [{"type": "proposal", "proposal": {"id": "fabricated", "action": {"action": "reset"}}}],
    [{"type": "done", "ok": False, "cancelled": True, "limited": False}],
    [{"type": "error", "kind": "SECRET-private-error"}, {"type": "done", "ok": True}],
    [{"type": "delta", "text": 1}],
    [{"type": "delta", "text": "x" * (copilot.MAX_OUTPUT_CHARS + 1)}],
    [{"type": "tool_start", "tool": "shell"}],
    [1],
    [],
])
def test_unknown_malformed_or_fabricated_private_frames_fail_closed_and_cleanup(setup, monkeypatch, frames):
    runtime, _ = setup
    process, provider = FakeProcess(frames), FakeProvider([])

    async def spawn(*_args, **_kwargs):
        return process

    monkeypatch.setattr(copilot.asyncio, "create_subprocess_exec", spawn)
    use_provider(monkeypatch, provider)
    with pytest.raises(copilot.CopilotUnavailable) as caught:
        run_chat(session(runtime))
    assert not str(caught.value)
    assert process.killed and process.waited and provider.closed
    assert not copilot._active_workspaces


def test_bounded_limit_completion_is_reviewable_and_not_unknown_unavailable(setup, monkeypatch):
    runtime, _ = setup
    process = FakeProcess([{"type": "delta", "text": "Some evidence collected."},
                           {"type": "error", "kind": "limit"},
                           {"type": "done", "ok": False, "limited": True}])

    async def spawn(*_args, **_kwargs):
        return process

    monkeypatch.setattr(copilot.asyncio, "create_subprocess_exec", spawn)
    provider = FakeProvider([])
    use_provider(monkeypatch, provider)
    result = run_chat(session(runtime))
    assert result.limited and result.text == "Some evidence collected."
    assert process.killed and process.waited and provider.closed


def test_oversized_tool_result_never_reaches_model_or_public_evidence(setup, monkeypatch):
    runtime, _ = setup
    real_tool = copilot._tool

    def large_tool(token, name, args, *tracking):
        if name == "inspect_workspace":
            return {"large": "x" * (copilot.MAX_TOOL_BYTES + 1)}
        return real_tool(token, name, args, *tracking)

    monkeypatch.setattr(copilot, "_tool", large_tool)
    provider = FakeProvider([
        [ToolCall("read", "inspect_workspace", {}), Usage(1, 1), Finish("tool_use")],
        [TextDelta("The tool result was too large."), Usage(1, 1), Finish("end")],
    ])
    use_provider(monkeypatch, provider)
    result = run_chat(session(runtime))
    assert not [event for event in result.events if event["type"] == "tool_result"]
    output = provider.requests[1].messages[-1]["results"][0]["output"]
    assert output == {"error": "tool_failed"}
    assert not copilot._pending


@pytest.mark.parametrize("usage", [Usage(None, None), Usage(None, 0), Usage(0, None)])
def test_partial_usage_retains_conservative_reservation(setup, usage):
    request = {"systemPrompt": "test", "messages": [{"role": "user", "text": "hello"}], "tools": []}
    provider = FakeProvider([[usage, Finish("end")]])
    reservation = len(copilot._encode(request)) + 1024
    asyncio.run(copilot._model(provider, request))
    assert copilot._tokens_used == reservation
    assert copilot._tokens_reserved == 0


def test_cancelled_turn_remains_busy_until_cleanup_then_accepts_new_turn(setup, monkeypatch):
    runtime, _ = setup
    spawned = asyncio.Event()
    cleanup_started = asyncio.Event()
    release_cleanup = asyncio.Event()
    spawn_count = 0

    class WaitingProcess(FakeProcess):
        async def readline(self):
            await asyncio.Future()

    class DelayedCloseProvider(FakeProvider):
        async def aclose(self):
            cleanup_started.set()
            await release_cleanup.wait()
            self.closed = True

    provider = DelayedCloseProvider([])
    use_provider(monkeypatch, provider)

    async def spawn(*args, **kwargs):
        nonlocal spawn_count
        spawn_count += 1
        spawned.set()
        return WaitingProcess([]) if spawn_count == 1 else FakeProcess([{"type": "done", "ok": True}])

    monkeypatch.setattr(copilot.asyncio, "create_subprocess_exec", spawn)
    token = session(runtime)

    async def execute():
        first = asyncio.create_task(copilot.chat(token, CopilotRequest(message="Wait")))
        await spawned.wait()
        first.cancel()
        await cleanup_started.wait()
        assert copilot.workspace_busy(token)
        with pytest.raises(copilot.CopilotBusy):
            await copilot.chat(token, CopilotRequest(message="Restart during cleanup"))
        assert spawn_count == 1
        release_cleanup.set()
        with pytest.raises(asyncio.CancelledError):
            await first
        assert not copilot.workspace_busy(token)
        use_provider(monkeypatch, FakeProvider([]))
        result = await copilot.chat(token, CopilotRequest(message="Restart after cleanup"))
        assert result.text == "" and spawn_count == 2

    asyncio.run(execute())
    assert provider.closed and not copilot._active_workspaces
    assert copilot._tokens_reserved == 0


@pytest.mark.parametrize("events,expected", [
    ([Usage(None, None), Usage(10, 20)], 30),
    ([Usage(0, 0)], 0),
    ([Usage(10, 20), Usage(None, 0)], None),
])
def test_complete_usage_settles_only_when_final_counts_are_known(setup, events, expected):
    request = {"systemPrompt": "test", "messages": [{"role": "user", "text": "hello"}], "tools": []}
    provider = FakeProvider([[*events, Finish("end")]])
    asyncio.run(copilot._model(provider, request))
    assert copilot._tokens_used == (len(copilot._encode(request)) + 1024 if expected is None else expected)
    assert copilot._tokens_reserved == 0


@pytest.mark.parametrize("usage", [Usage(True, 0), Usage(0, False)])
def test_boolean_usage_is_invalid_and_conservatively_charged(setup, usage):
    request = {"systemPrompt": "test", "messages": [{"role": "user", "text": "hello"}], "tools": []}
    provider = FakeProvider([[usage, Finish("end")]])
    with pytest.raises(copilot.CopilotUnavailable):
        asyncio.run(copilot._model(provider, request))
    assert copilot._tokens_used == len(copilot._encode(request)) + 1024
    assert copilot._tokens_reserved == 0
