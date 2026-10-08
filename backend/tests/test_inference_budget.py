import asyncio
from unittest.mock import Mock

import pytest

from backend.app.services import inference_budget as budget
from backend.app.services.llm import LLMRequest, Usage

REAL_RPC = budget._rpc


def request():
    return LLMRequest(model="test", max_tokens=100, system_parts=["public facts"], messages=[{"role": "user", "text": "Jordan experience"}], visitor_context="", tools=[])


def test_reservation_hashes_receipt_and_reserves_before_usage(monkeypatch):
    calls = []
    async def rpc(name, params):
        calls.append((name, params))
        return {"allowed": True, "settled": True}
    monkeypatch.setattr(budget, "_rpc", rpc)
    reservation = asyncio.run(budget.reserve("private-access-receipt", request()))
    asyncio.run(budget.settle(reservation, Usage(input_tokens=100, output_tokens=20)))
    assert calls[0][0] == "portfolio_reserve_inference"
    assert len(calls[0][1]["p_receipt"]) == 64
    assert "private-access-receipt" not in str(calls)
    assert calls[0][1]["p_tokens"] > 120
    assert calls[1][1] == {"p_id": reservation, "p_tokens": 120}


def test_denied_reservation_fails_closed(monkeypatch):
    async def denied(*args):
        return {"allowed": False}
    monkeypatch.setattr(budget, "_rpc", denied)
    with pytest.raises(budget.BudgetUnavailable):
        asyncio.run(budget.reserve("receipt", request()))


def test_missing_usage_never_releases_reserved_budget(monkeypatch):
    async def unexpected(*args):
        pytest.fail("Unknown usage must retain the reservation")
    monkeypatch.setattr(budget, "_rpc", unexpected)
    asyncio.run(budget.settle("reservation", None))
    asyncio.run(budget.settle("reservation", Usage(input_tokens=5)))


def test_accounting_outage_is_safe_and_does_not_expose_error(monkeypatch):
    monkeypatch.setattr(budget.supabase, "get_admin_client", Mock(side_effect=RuntimeError("private database detail")))
    with pytest.raises(budget.BudgetUnavailable) as exc:
        asyncio.run(REAL_RPC("portfolio_reserve_inference", {}))
    assert "private" not in str(exc.value)


def test_denied_admission_never_calls_provider(monkeypatch):
    from backend.app.services.chat_service import ConnectionManager
    manager = ConnectionManager()
    manager.provider = Mock()
    async def denied(*args):
        raise budget.BudgetUnavailable
    monkeypatch.setattr(budget, "reserve", denied)
    async def run():
        async for _ in manager._budgeted_stream("test-client", request()):
            pytest.fail("denied inference emitted output")
    with pytest.raises(budget.BudgetUnavailable):
        asyncio.run(run())
    manager.provider.stream.assert_not_called()
