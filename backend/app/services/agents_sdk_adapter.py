"""Review scaffold: optional OpenAI Agents SDK adapter, never publicly enabled.

The existing WebSocket providers and confirmation tools remain untouched.
Only bounded public evidence enters this adapter. No tools, handoffs, shell,
mail, browser state or user history are available to it. SDK installation and
a durable global quota implementation are release prerequisites.
"""
import asyncio
import json
from importlib import import_module

from backend.app.services.agent_budget import SharedTokenLedger, SpendingDenied, reserve_paid_call
from backend.app.services.public_evidence import evidence_answer


async def draft_grounded_answer(query: str, *, subject: str | None = None,
                                ledger: SharedTokenLedger | None = None,
                                approved: bool = False, sdk=None, client=None) -> dict:
    if client is None or getattr(client, "max_retries", None) != 0:
        raise SpendingDenied("An explicit provider client with retries disabled is required.")
    evidence = evidence_answer(query).model_dump()
    prompt = json.dumps({"question": query, "public_evidence": evidence}, ensure_ascii=False)
    # Includes instructions in the worst-case admission estimate.
    instructions = "Answer only from the supplied public evidence. Cite its URLs. State when evidence is missing."
    await reserve_paid_call(ledger, subject, instructions + prompt, 512, approved=approved)
    # Lazy import: absent SDK cannot enable a fallback or cause an unpaid path to call a model.
    sdk = sdk or import_module("agents")
    agent = sdk.Agent(
        name="Public portfolio guide", instructions=instructions, model=sdk.OpenAIResponsesModel(model="gpt-4.1-mini", openai_client=client),
        model_settings=sdk.ModelSettings(max_tokens=512), tools=[],
    )
    result = await asyncio.wait_for(sdk.Runner.run(
        agent, prompt, max_turns=1,
        run_config=sdk.RunConfig(tracing_disabled=True),
    ), timeout=20)
    # Draft requires review; exact passages remain the authoritative answer.
    return {"mode": "sdk_draft", "draft": str(result.final_output)[:3000], "sources": evidence["sources"]}
