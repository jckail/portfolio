"""Private Pi loop and visitor-bound tools; proposals never apply automatically."""
import asyncio
import json
import secrets
import shutil
import threading
import time
from datetime import UTC, datetime
from pathlib import Path

from ..config import get_settings
from ..models.dataplayground_copilot import CopilotRequest, CopilotResponse
from ..models.dataplayground_runtime import QueryRequest, RuntimeAction
from .dataplayground import load_catalog
from .dataplayground_runtime import get_runtime
from .llm import Finish, LLMRequest, ProviderError, TextDelta, ToolCall, Usage, build_provider

SCRIPT = Path(__file__).resolve().parents[3] / "copilot" / "server.mjs"
MAX_TOOL_BYTES = 65536
MAX_EVIDENCE_BYTES = 12000
MAX_PROVIDER_BYTES = 524288
MAX_OUTPUT_CHARS = 96000
TOTAL_TIMEOUT = 65
_TOOL_NAMES = {"inspect_catalog", "inspect_workspace", "query_sql", "inspect_run", "propose_runtime_change"}
_pending: dict[str, tuple[str, float, RuntimeAction, str]] = {}
_guard = threading.RLock()
_slots = threading.BoundedSemaphore(2)
_active_workspaces: set[str] = set()
_budget_day = datetime.now(UTC).date()
_tokens_used = 0
_tokens_reserved = 0


class CopilotUnavailable(Exception):
    """Safe public failure, without provider responses or subprocess output."""


class CopilotBusy(Exception):
    """The previous investigation still owns this workspace, including cleanup."""


def workspace_busy(token: str) -> bool:
    """Read-only preflight; chat repeats the check while acquiring its slot."""
    with _guard:
        return token in _active_workspaces


def _encode(value) -> bytes:
    return json.dumps(value, allow_nan=False, ensure_ascii=False, separators=(",", ":")).encode()


def _budget_reset() -> None:
    global _budget_day, _tokens_used, _tokens_reserved
    today = datetime.now(UTC).date()
    if today != _budget_day:
        _budget_day, _tokens_used, _tokens_reserved = today, 0, 0


def available() -> bool:
    settings = get_settings()
    with _guard:
        _budget_reset()
        budget = _tokens_used + _tokens_reserved < settings.dataplayground_copilot_daily_tokens
    return bool(settings.chat_available and shutil.which("node") and SCRIPT.is_file() and budget
                and (SCRIPT.parent / "node_modules/@earendil-works/pi-agent-core/package.json").is_file())


def _prune() -> None:
    """Caller holds _guard; discard expired pending confirmations."""
    now = time.monotonic()
    for key, (_, expires, _, _) in list(_pending.items()):
        if expires <= now:
            del _pending[key]


def _arguments(args: dict, allowed: set[str]) -> None:
    if not isinstance(args, dict) or set(args) - allowed:
        raise ValueError("Invalid tool arguments")


def _tool(token: str, name: str, args: dict, created: set[str] | None = None,
          cancelled: threading.Event | None = None) -> dict:
    runtime = get_runtime()
    state = runtime.state(token)  # Verify workspace capability and expiry for every tool.
    if name == "inspect_workspace":
        _arguments(args, set())
        return state.model_dump()
    if name == "query_sql":
        return runtime.query(token, QueryRequest.model_validate(args)).model_dump()
    if name == "inspect_run":
        _arguments(args, {"run_id"})
        run_id = args.get("run_id")
        if run_id is not None and (not isinstance(run_id, str) or not 1 <= len(run_id) <= 100):
            raise ValueError("Invalid run identifier")
        if run_id:
            run = next((r for r in load_catalog().runs if r.id == run_id), None)
            if run is None:
                raise ValueError("Unknown run")
            return {"id": run.id, "scenario": run.scenario.model_dump(), "summary": run.summary.model_dump(),
                    "pipeline": [p.model_dump() for p in run.pipeline]}
        return {"dag_trace": [task.model_dump() for task in state.dag_trace], "published": state.dag_published,
                "fingerprint": state.dag_fingerprint, "logs": [log.model_dump() for log in state.logs]}
    if name == "inspect_catalog":
        _arguments(args, {"section"})
        section = args.get("section", "summary")
        if section not in {"summary", "architecture", "exploration", "runs"}:
            raise ValueError("Invalid catalog section")
        data = load_catalog()
        if section == "architecture":
            return {"architecture": data.architecture.model_dump() if data.architecture else None}
        if section == "exploration":
            return {"products": len(data.exploration.products) if data.exploration else 0,
                    "description": "Independent synthetic commerce; handcrafted vectors, not learned embeddings."}
        return {"engine_version": data.engine_version,
                "runs": [{"id": r.id, "scenario": r.scenario.model_dump(), "summary": r.summary.model_dump()}
                         for r in data.runs]}
    if name == "propose_runtime_change":
        if not isinstance(args, dict):
            raise ValueError("Invalid proposal")
        values = dict(args)
        reason = values.pop("reason", "")
        if not isinstance(reason, str) or not 1 <= len(reason.strip()) <= len(reason) <= 500:
            raise ValueError("Invalid proposal reason")
        action = RuntimeAction.model_validate(values)
        with _guard:
            _prune()
            if cancelled is not None and cancelled.is_set():
                raise ValueError("Turn cancelled")
            if len(_pending) >= 160 or sum(item[0] == token for item in _pending.values()) >= 5:
                raise ValueError("Proposal limit reached")
            proposal_id = secrets.token_urlsafe(24)
            _pending[proposal_id] = (token, time.monotonic() + 600, action, reason)
            if created is not None:
                created.add(proposal_id)
        return {"proposal": {"id": proposal_id, "action": action.model_dump(), "reason": reason,
                             "expires_in_seconds": 600}}
    raise ValueError("Unknown tool")


def confirm(token: str, proposal_id: str):
    runtime = get_runtime()
    runtime.state(token)
    with _guard:
        _prune()
        item = _pending.get(proposal_id)
        if item is None or not secrets.compare_digest(item[0], token):
            raise ValueError("This proposal expired or belongs to another workspace.")
        del _pending[proposal_id]  # Atomic consume, including when the operation fails.
    return runtime.action(token, item[2])


def _evidence(name: str, args: dict, result: dict) -> dict:
    """Bounded visitor-visible evidence; private provider state never enters here."""
    if name == "query_sql":
        evidence = {"sql": args["sql"][:4000], "columns": result["columns"],
                    "row_count": result["row_count"], "truncated": result["truncated"], "rows": result["rows"][:10]}
    elif name == "inspect_workspace":
        evidence = {"scenario_id": result["scenario_id"],
                    "tables": [{"name": row["name"], "row_count": row["row_count"]} for row in result["tables"]],
                    "streaming": result["streaming"]}
    elif name == "inspect_run":
        evidence = {key: value for key, value in result.items() if key != "logs"}
    elif name == "propose_runtime_change":
        evidence = {"confirmation_required": True, "action": result["proposal"]["action"],
                    "reason": result["proposal"]["reason"]}
    else:
        evidence = result
    if len(_encode(evidence)) > MAX_EVIDENCE_BYTES:
        # Preserve useful fields while excluding oversized row samples/metadata.
        evidence = {key: value for key, value in evidence.items() if key not in {"rows", "architecture", "dag_trace"}}
        evidence["evidence_truncated"] = True
        if len(_encode(evidence)) > MAX_EVIDENCE_BYTES:
            evidence = {"evidence_truncated": True}
    return {"type": "tool_result", "tool": name, "result": evidence}


async def _model(provider, request: dict) -> dict:
    global _tokens_used, _tokens_reserved
    if not available() or len(_encode(request)) > MAX_PROVIDER_BYTES:
        raise CopilotUnavailable
    messages = []
    for message in request["messages"]:
        message = dict(message)
        if message.get("role") == "assistant":
            message["tool_calls"] = [ToolCall(**call) for call in message.get("tool_calls", [])]
        messages.append(message)
    llm_request = LLMRequest(model=get_settings().chat_model, max_tokens=1024,
                             system_parts=[request["systemPrompt"]], messages=messages,
                             visitor_context="", tools=request["tools"])
    # Reserve a conservative byte-based input ceiling plus output cap before I/O,
    # so concurrent requests cannot consume the same remaining daily allowance.
    reservation = len(_encode(request)) + llm_request.max_tokens
    with _guard:
        _budget_reset()
        if _tokens_used + _tokens_reserved + reservation > get_settings().dataplayground_copilot_daily_tokens:
            raise CopilotUnavailable
        _tokens_reserved += reservation
        budget_day = _budget_day
    used = 0
    got_usage = False
    result = {"text": "", "tool_calls": [], "usage": {"input_tokens": 0, "output_tokens": 0}, "stop_reason": "end"}
    try:
        async for event in provider.stream(llm_request):
            if isinstance(event, TextDelta):
                result["text"] += event.text
                if len(result["text"]) > 16000:
                    raise CopilotUnavailable
            elif isinstance(event, ToolCall):
                result["tool_calls"].append({"id": event.id, "name": event.name, "args": event.args,
                                             "provider_state": event.provider_state})
                if len(result["tool_calls"]) > 8 or len(_encode(result)) > MAX_TOOL_BYTES * 2:
                    raise CopilotUnavailable
            elif isinstance(event, Usage):
                # Providers emit final/cumulative usage; do not double-charge repeats.
                if any(value is not None and (type(value) is not int or not 0 <= value <= 1000000)
                       for value in (event.input_tokens, event.output_tokens)):
                    raise CopilotUnavailable
                # Missing input or output counts are unknown, not measured zero.
                # A later complete cumulative event can settle the reservation;
                # an incomplete final event retains the conservative charge.
                got_usage = event.input_tokens is not None and event.output_tokens is not None
                used = max(used, event.total_tokens)
                result["usage"] = {"input_tokens": event.input_tokens or 0, "output_tokens": event.output_tokens or 0}
            elif isinstance(event, Finish):
                result["stop_reason"] = event.stop_reason
        _encode(result)  # Non-finite/unserializable provider content cannot cross IPC.
        return result
    finally:
        with _guard:
            if _budget_day == budget_day:
                _tokens_reserved -= reservation
                # Unknown usage after cancellation/provider failure is charged at
                # the conservative reservation; known usage charges actual tokens.
                _tokens_used += used if got_usage else max(used, reservation)


async def _cleanup(process, provider) -> None:
    if process is not None:
        try:
            if process.returncode is None:
                process.kill()
            await process.wait()
        except (ProcessLookupError, OSError):
            pass
    if provider is not None:
        try:
            async with asyncio.timeout(2):
                await provider.aclose()
        except Exception:
            pass  # Provider cleanup never leaks response bodies or masks cancellation.


async def chat(token: str, request: CopilotRequest) -> CopilotResponse:
    await asyncio.to_thread(get_runtime().state, token)
    if workspace_busy(token):
        raise CopilotBusy
    if not available():
        raise CopilotUnavailable
    with _guard:
        if token in _active_workspaces:
            raise CopilotBusy
        if not _slots.acquire(blocking=False):
            raise CopilotUnavailable
        _active_workspaces.add(token)
    provider = process = None
    events, proposals, text_parts = [], [], []
    created_proposals: set[str] = set()
    cancelled = threading.Event()
    returned = False
    limited = False
    try:
        provider = build_provider(get_settings())
        async with asyncio.timeout(TOTAL_TIMEOUT):
            node = shutil.which("node")
            if node is None:
                raise CopilotUnavailable
            process = await asyncio.create_subprocess_exec(
                node, str(SCRIPT), stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL, limit=MAX_PROVIDER_BYTES + 1, cwd=str(SCRIPT.parent),
                # No HOME, NODE_OPTIONS, SDK credentials, host auth or session discovery.
                env={"PATH": str(Path(node).parent), "LANG": "C.UTF-8"},
            )

            async def send(frame):
                data = _encode(frame) + b"\n"
                if len(data) > MAX_PROVIDER_BYTES:
                    raise CopilotUnavailable
                process.stdin.write(data)
                await process.stdin.drain()

            await send({"type": "start", "prompt": request.message,
                        "history": [t.model_dump() for t in request.history], "model": get_settings().chat_model})
            frames = 0
            provider_rounds = tool_calls = 0
            error_seen = False
            while line := await process.stdout.readline():
                frames += 1
                if frames > 256 or len(line) > MAX_PROVIDER_BYTES:
                    raise CopilotUnavailable
                frame = json.loads(line)
                if not isinstance(frame, dict):
                    raise CopilotUnavailable
                kind = frame.get("type")
                if kind == "provider_request":
                    provider_rounds += 1
                    if provider_rounds > 6:
                        raise CopilotUnavailable
                    try:
                        result = await _model(provider, frame["request"])
                        await send({"type": "provider_result", "id": frame["id"], "result": result})
                    except (ProviderError, CopilotUnavailable):
                        await send({"type": "provider_error", "id": frame["id"], "kind": "unavailable"})
                elif kind == "tool_request":
                    tool_calls += 1
                    if tool_calls > 8 or frame.get("tool") not in _TOOL_NAMES:
                        raise CopilotUnavailable
                    try:
                        result = await asyncio.to_thread(_tool, token, frame["tool"], frame["args"], created_proposals, cancelled)
                        if not isinstance(result, dict) or len(_encode(result)) > MAX_TOOL_BYTES:
                            raise ValueError("Tool result limit")
                        if frame["tool"] == "propose_runtime_change":
                            created_proposals.add(result["proposal"]["id"])
                        events.append(_evidence(frame["tool"], frame["args"], result))
                        await send({"type": "tool_result", "id": frame["id"], "result": result})
                    except (ValueError, KeyError):
                        await send({"type": "tool_error", "id": frame["id"], "kind": "error"})
                elif kind == "delta":
                    text = frame.get("text")
                    if not isinstance(text, str) or sum(map(len, text_parts)) + len(text) > MAX_OUTPUT_CHARS:
                        raise CopilotUnavailable
                    text_parts.append(text)
                elif kind in {"tool_start", "tool_end"}:
                    if frame.get("tool") not in _TOOL_NAMES:
                        raise CopilotUnavailable
                    events.append({"type": kind, "tool": frame["tool"], "ok": frame.get("ok")})
                elif kind == "proposal":
                    # Forward the server-created object, never a fabricated child proposal.
                    proposal = frame.get("proposal")
                    if not isinstance(proposal, dict) or proposal.get("id") not in created_proposals:
                        raise CopilotUnavailable
                    if any(existing["id"] == proposal["id"] for existing in proposals):
                        raise CopilotUnavailable
                    with _guard:
                        item = _pending.get(proposal["id"])
                        if item is None or not secrets.compare_digest(item[0], token):
                            raise CopilotUnavailable
                        proposals.append({"id": proposal["id"], "action": item[2].model_dump(),
                                          "reason": item[3], "expires_in_seconds": max(0, int(item[1] - time.monotonic()))})
                elif kind == "error":
                    error_seen = True
                elif kind == "done":
                    limited = frame.get("limited") is True
                    if frame.get("ok") is not True and not limited:
                        raise CopilotUnavailable
                    if error_seen and not limited:
                        raise CopilotUnavailable
                    break
                else:
                    raise CopilotUnavailable
            else:
                raise CopilotUnavailable
            returned = True
            return CopilotResponse(text="".join(text_parts), events=events, proposals=proposals, limited=limited)
    except CopilotUnavailable:
        raise
    except Exception:
        raise CopilotUnavailable from None
    finally:
        cancelled.set()
        with _guard:
            delivered = {proposal["id"] for proposal in proposals} if returned else set()
            for proposal_id in created_proposals - delivered:
                _pending.pop(proposal_id, None)
        cleanup = asyncio.create_task(_cleanup(process, provider))
        try:
            await asyncio.shield(cleanup)
        except asyncio.CancelledError:
            await cleanup
            raise
        finally:
            with _guard:
                _active_workspaces.discard(token)
                _slots.release()
