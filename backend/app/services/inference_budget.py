"""Atomic, durable admission for paid inference. No prompts or PII are persisted."""
import asyncio
import hashlib
import json
from dataclasses import asdict
from uuid import uuid4

from backend.app.config import get_settings
from backend.app.services.llm import LLMRequest, ProviderRateLimited, Usage
from backend.app.utils.supabase_client import supabase


class BudgetUnavailable(ProviderRateLimited):
    """Fail closed when accounting cannot authorize an inference."""


async def _rpc(name: str, params: dict) -> dict:
    try:
        async with asyncio.timeout(8):
            result = await asyncio.to_thread(lambda: supabase.get_admin_client().rpc(name, params).execute())
        if not isinstance(result.data, dict):
            raise ValueError("Invalid accounting result")
        return result.data
    except Exception:
        raise BudgetUnavailable from None


def receipt_key(receipt: str) -> str:
    return hashlib.sha256(("portfolio-inference:" + receipt).encode()).hexdigest()


def reservation_size(request: LLMRequest) -> int:
    # UTF-8 bytes deliberately overestimate ordinary text tokenization. Include
    # tool schemas, provider framing headroom and output/reasoning headroom.
    # This is an admission estimate, not a provider invoice or currency budget.
    return len(json.dumps(asdict(request), ensure_ascii=False).encode()) + 4096 + request.max_tokens * 2


async def reserve(receipt: str, request: LLMRequest) -> str:
    settings = get_settings()
    reservation = str(uuid4())
    result = await _rpc("portfolio_reserve_inference", {
        "p_id": reservation, "p_receipt": receipt_key(receipt),
        "p_tokens": reservation_size(request),
        "p_global_limit": settings.chat_daily_token_budget,
        "p_receipt_limit": settings.chat_receipt_daily_token_budget,
    })
    if result.get("allowed") is not True:
        raise BudgetUnavailable
    return reservation


async def settle(reservation: str, usage: Usage | None) -> None:
    # Unknown/partial usage must never release a reservation. A crashed worker
    # leaves the full amount charged through the end of its UTC admission day.
    if usage is None or usage.input_tokens is None or usage.output_tokens is None:
        return
    tokens = sum(max(0, n or 0) for n in (
        usage.input_tokens, usage.output_tokens,
        usage.cache_creation_input_tokens, usage.cache_read_input_tokens,
    ))
    await _rpc("portfolio_settle_inference", {"p_id": reservation, "p_tokens": tokens})
