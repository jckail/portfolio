"""OpenAI Agents SDK orchestration over the existing streaming model providers.

The SDK runs tool sequencing, validation and turn limits. The custom Model keeps
Vertex/Anthropic credentials, wire formats, prompt caching and the existing
failover policy; it never creates an OpenAI API client or exports traces.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from uuid import uuid4

from agents import Agent, FunctionTool, Model, ModelSettings, RunConfig, Runner
from agents.agent import ToolsToFinalOutputResult
from agents.items import ModelResponse
from agents.model_settings import ModelRetrySettings
from agents.run import ToolExecutionConfig
from agents.usage import Usage as AgentUsage
from jsonschema import Draft202012Validator, ValidationError
from openai.types.responses import (
    ResponseFunctionToolCall,
    ResponseOutputMessage,
    ResponseOutputText,
)

from backend.app.services.chat_tools import ALL_TOOLS, EXECUTE_TOOL_NAMES

# Includes provider failover, tools, usage persistence and all model rounds.
AGENT_TIMEOUT_SECONDS = 120
MAX_TOOL_RESULT_CHARS = 12_000
TOOL_TIMEOUT_SECONDS = 9


@dataclass
class PortfolioRun:
    manager: object
    client_id: str
    state_factory: object
    max_turns: int
    max_tools: int
    extra: list[dict] = field(default_factory=list)
    text: list[str] = field(default_factory=list)
    action_labels: list[str] = field(default_factory=list)
    proposed: bool = False
    state: object | None = None
    calls: dict = field(default_factory=dict)
    results: list[dict] = field(default_factory=list)
    needs_followup: bool = False
    round_number: int = 0

    async def invoke(self, context, arguments: str):
        call = self.calls[context.tool_call_id]
        schema = next(t["input_schema"] for t in ALL_TOOLS if t["name"] == call.name)
        try:
            args = json.loads(arguments)
            Draft202012Validator(schema).validate(args)
        except (ValueError, ValidationError):
            output = {"status": "rejected", "note": "Invalid tool arguments."}
            self.results.append({"call_id": call.id, "name": call.name, "output": output})
            self.needs_followup = True
            return json.dumps(output)
        if call.name in EXECUTE_TOOL_NAMES and self.proposed:
            output = {"status": "rejected", "note": "Review the existing confirmation card first."}
            self.results.append({"call_id": call.id, "name": call.name, "output": output})
            self.needs_followup = True
            return json.dumps(output)
        # The manager remains
        # the single authority for browser normalization and contact approvals.
        try:
            async with asyncio.timeout(TOOL_TIMEOUT_SECONDS):
                results, labels, followup = await self.manager._run_tool_calls(self.client_id, [call])
        except Exception:
            output = {"status": "unavailable", "note": "That tool is temporarily unavailable."}
            self.results.append({"call_id": call.id, "name": call.name, "output": output})
            self.needs_followup = True
            return json.dumps(output)
        self.results.extend(results)
        self.action_labels.extend(labels)
        self.needs_followup |= followup
        self.proposed |= call.name in EXECUTE_TOOL_NAMES
        result = json.dumps(results[0]["output"], ensure_ascii=False)
        if len(result) > MAX_TOOL_RESULT_CHARS:
            result = json.dumps({"status": "truncated", "note": "Tool output exceeded the safe limit."})
            self.results[-1]["output"] = json.loads(result)
        return result

    async def after_tools(self, context, results):
        self.extra.append({"role": "assistant", "text": "".join(self.state.text),
                           "tool_calls": self.state.tool_calls[:self.max_tools]})
        self.extra.append({"role": "tool", "results": list(self.results)})
        # Calendar failure is an operational fact, not a model interpretation.
        # End this turn with trusted wording instead of asking another model
        # round to paraphrase unavailable as an empty/free calendar.
        unavailable = next((result for result in self.results
                            if result["name"] == "get_meeting_availability"
                            and result["output"].get("status") == "unavailable"), None)
        if unavailable is not None:
            message = (
                "Live calendar scheduling is not connected, so I cannot check Jordan's availability."
                if unavailable["output"].get("reason") == "not_connected" else
                "I could not verify Jordan's calendar availability."
            )
            message += " You can ask me to draft a meeting request for you to review; nothing is sent without your confirmation."
            if self.text:
                message = "\n\n" + message
            self.text.append(message)
            await self.manager.send_message(message, self.client_id, is_chunk=True)
            return ToolsToFinalOutputResult(is_final_output=True, final_output="".join(self.text))
        return ToolsToFinalOutputResult(
            is_final_output=not (self.needs_followup and self.manager.is_available()),
            final_output="".join(self.text),
        )


class PortfolioModel(Model):
    """Adapt provider streaming to SDK ModelResponse without a second retry layer."""

    def __init__(self, run: PortfolioRun):
        self.run = run

    async def get_response(self, system_instructions, input, model_settings, tools,
                           output_schema, handoffs, tracing, *, previous_response_id,
                           conversation_id, prompt):
        run = self.run
        last_turn = run.round_number == run.max_turns - 1
        schemas = [] if last_turn else ALL_TOOLS
        run.state = run.state_factory(model=run.manager._model, leading_break=bool(run.text))
        run.calls = {}
        run.results = []
        run.needs_followup = False
        await run.manager._stream_with_failover(run.client_id, run.state, run.extra, schemas)
        run.round_number += 1
        state = run.state
        if state.usage is not None:
            run.manager._record_tokens(state.usage)
            await run.manager._log_usage(run.client_id, state.usage, state.stop_reason, state.model)
        text = "".join(state.text)
        if text:
            run.text.append(text)
        output = []
        if text:
            output.append(ResponseOutputMessage(
                id="msg_" + uuid4().hex, type="message", role="assistant", status="completed",
                content=[ResponseOutputText(type="output_text", text=text, annotations=[])],
            ))
        # No tools on the last round, even if a broken provider emits them.
        for call in ([] if last_turn else state.tool_calls[:run.max_tools]):
            if call.name not in {tool["name"] for tool in ALL_TOOLS}:
                rejected, labels, _ = await run.manager._run_tool_calls(run.client_id, [call])
                run.results.extend(rejected)
                continue
            call_id = "call_" + uuid4().hex
            run.calls[call_id] = call
            output.append(ResponseFunctionToolCall(
                type="function_call", call_id=call_id, name=call.name,
                arguments=json.dumps(call.args),
            ))
        usage = state.usage
        return ModelResponse(output=output, response_id=None, usage=AgentUsage(
            requests=1, input_tokens=(usage.input_tokens or 0) if usage else 0,
            output_tokens=(usage.output_tokens or 0) if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        ))

    async def stream_response(self, *args, **kwargs):
        # The site streams through get_response's provider adapter. Runner.run
        # gives us deterministic FunctionTool execution between those streams.
        raise NotImplementedError("Use Runner.run; websocket streaming is handled by the provider bridge")
        yield  # make the abstract interface an async iterator


async def run_portfolio_agent(manager, client_id, state_factory, max_turns, max_tools):
    run = PortfolioRun(manager, client_id, state_factory, max_turns, max_tools)
    tools = [FunctionTool(
        name=tool["name"], description=tool["description"],
        params_json_schema=tool["input_schema"], on_invoke_tool=run.invoke,
        strict_json_schema=False, timeout_seconds=10,
        timeout_error_function=lambda context, error: "That tool timed out. Please try again.",
        _failure_error_function=lambda context, error: "That tool is temporarily unavailable.",
    ) for tool in ALL_TOOLS]
    agent = Agent(
        name="Jordan Kail portfolio assistant", instructions="\n\n".join(manager._system_parts()),
        model=PortfolioModel(run), tools=tools, tool_use_behavior=run.after_tools,
        model_settings=ModelSettings(parallel_tool_calls=False, retry=ModelRetrySettings(max_retries=0)),
    )
    async with asyncio.timeout(AGENT_TIMEOUT_SECONDS):
        await Runner.run(
            agent, input=manager._build_request(client_id).messages[-1]["text"],
            max_turns=max_turns,
            run_config=RunConfig(tracing_disabled=True, trace_include_sensitive_data=False,
                                 tool_execution=ToolExecutionConfig(max_function_tool_concurrency=1),
                                 tool_not_found_behavior="return_error_to_model"),
        )
    return run
