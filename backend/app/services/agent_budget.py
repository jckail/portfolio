"""Fail-closed spending contract for a future paid adapter.

A production ledger must atomically reserve worst-case tokens across ALL
instances before dispatch. Never refund uncertain, failed or canceled calls.
A restartable in-memory counter is deliberately not a production option.
"""
from typing import Protocol


class SpendingDenied(Exception):
    pass


class SharedTokenLedger(Protocol):
    async def reserve(self, subject: str, maximum_tokens: int) -> bool:
        """Atomic daily/global AND subject reservation; false on storage failure."""
        ...


async def reserve_paid_call(ledger: SharedTokenLedger | None, subject: str | None,
                            prompt: str, output_limit: int, *, approved: bool) -> None:
    if not approved or ledger is None or not subject:
        raise SpendingDenied("Paid agents require approved configuration, verified identity and a shared quota ledger.")
    if not 1 <= output_limit <= 512 or len(prompt.encode("utf-8")) > 12000:
        raise SpendingDenied("Request exceeds the bounded model budget.")
    # UTF-8 bytes conservatively bound input tokens, plus fixed framing margin.
    maximum = len(prompt.encode("utf-8")) + 2048 + output_limit
    try:
        allowed = await ledger.reserve(subject, maximum)
    except Exception:
        allowed = False
    if not allowed:
        raise SpendingDenied("Quota unavailable or exhausted.")
