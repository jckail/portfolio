"""Real SDK Runner on the mounted websocket path; no model or mail network."""
import asyncio

from backend.app.services import chat_service, portfolio_agent
from backend.app.services.llm import Finish, TextDelta

from .test_chat_tools_ws import (
    _isolate as _isolate,
)
from .test_chat_tools_ws import (
    call,
    round_of,
    say,
    script,
)


def test_real_runner_disables_traces_and_additional_retry(client, monkeypatch):
    original = portfolio_agent.Runner.run
    observed = []

    async def inspected(*args, **kwargs):
        observed.append((args[0], kwargs))
        return await original(*args, **kwargs)

    monkeypatch.setattr(portfolio_agent.Runner, "run", inspected)
    provider = script(monkeypatch, round_of(TextDelta("Grounded answer")))
    with client.websocket_connect("/ws/sdk-runtime-proof") as ws:
        frames = say(ws)
    agent, kwargs = observed[0]
    assert isinstance(agent.model, portfolio_agent.PortfolioModel)
    assert kwargs["max_turns"] == 4
    assert kwargs["run_config"].tracing_disabled is True
    assert kwargs["run_config"].trace_include_sensitive_data is False
    assert kwargs["run_config"].tool_execution.max_function_tool_concurrency == 1
    assert agent.model_settings.retry.max_retries == 0
    assert len(provider.requests) == 1
    assert "Grounded answer" in "".join(f.get("message", "") for f in frames)


def test_invalid_schema_cannot_propose_contact_card(client, monkeypatch):
    provider = script(monkeypatch,
        round_of(call("contact_jordan", subject=123, message="Draft")),
        round_of(TextDelta("Please supply a subject")),
    )
    with client.websocket_connect("/ws/sdk-schema-boundary") as ws:
        frames = say(ws)
    assert not any(f.get("type") == "confirm_action" for f in frames)
    result = provider.requests[1].messages[-1]["results"][0]["output"]
    assert result["status"] == "rejected"


def test_whole_run_timeout_cancels_provider_and_returns_completion(client, monkeypatch):
    provider = script(monkeypatch)
    cancelled = []

    async def hanging(request):
        try:
            await asyncio.sleep(10)
            yield Finish("end")
        finally:
            cancelled.append(True)

    monkeypatch.setattr(provider, "stream", hanging)
    # Allow SDK setup on loaded CI hosts before timing out the hanging provider.
    # The test still requires provider cancellation and an empty saved history.
    monkeypatch.setattr(portfolio_agent, "AGENT_TIMEOUT_SECONDS", 1.0)
    with client.websocket_connect("/ws/sdk-timeout") as ws:
        frames = say(ws)
    assert cancelled == [True]
    assert frames[-1]["is_chunk"] is False
    assert chat_service.manager.get_history("sdk-timeout") == []
    assert "problem" in frames[-1]["message"].lower()


def test_provider_output_is_bounded_and_marked_truncated(client, monkeypatch):
    bound = chat_service.MAX_ASSISTANT_TURN_CHARS
    script(monkeypatch, round_of(TextDelta("x" * (bound + 500))))
    with client.websocket_connect("/ws/sdk-output-bound") as ws:
        frames = say(ws)
    text = "".join(f.get("message", "") for f in frames if f.get("is_chunk"))
    assert text.startswith("x" * bound)
    assert "x" * (bound + 1) not in text
    assert chat_service.MAX_TOKENS_NOTE in text


def test_tool_exception_cannot_leak_private_text_to_model(client, monkeypatch):
    provider = script(monkeypatch,
        round_of(call("search_portfolio", query="python")),
        round_of(TextDelta("Please use the portfolio directly")),
    )

    def broken(name, arguments):
        raise RuntimeError("PRIVATE-MARKER /private/secrets.env")

    monkeypatch.setattr(chat_service, "run_read_tool", broken)
    with client.websocket_connect("/ws/sdk-safe-tool-error") as ws:
        say(ws)
    output = provider.requests[1].messages[-1]["results"][0]["output"]
    assert output["status"] == "unavailable"
    assert "PRIVATE-MARKER" not in str(output)
    assert "secrets.env" not in str(output)


def test_contact_proposal_is_single_per_run(client, monkeypatch):
    script(monkeypatch,
        round_of(call("contact_jordan", subject="Hello", message="An opportunity"),
                 call("request_meeting", topic="Intro", preferred_times="Next week")),
        round_of(TextDelta("Review the draft")),
    )
    with client.websocket_connect("/ws/sdk-one-contact-card") as ws:
        frames = say(ws)
    assert len([f for f in frames if f.get("type") == "confirm_action"]) == 1


def test_new_recruiter_tool_runs_through_sdk_and_returns_evidence(client, monkeypatch):
    provider = script(monkeypatch,
        round_of(call("get_recruiter_brief")),
        round_of(TextDelta("Jordan builds agent platforms")),
    )
    with client.websocket_connect("/ws/sdk-recruiter-brief") as ws:
        frames = say(ws)
    output = provider.requests[1].messages[-1]["results"][0]["output"]
    assert "Together" in str(output)
    assert "Jordan builds agent platforms" in "".join(f.get("message", "") for f in frames)
