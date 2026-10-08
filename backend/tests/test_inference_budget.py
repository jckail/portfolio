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


def test_settlement_outage_preserves_delivered_reply(monkeypatch):
    from backend.app.services.chat_service import ConnectionManager
    from backend.app.services.llm import Finish, TextDelta
    manager = ConnectionManager()
    async def stream(request):
        yield TextDelta("Published portfolio answer")
        yield Usage(input_tokens=100, output_tokens=10)
        yield Finish("end_turn")
    manager.provider = Mock(stream=stream)
    async def rpc(name, params):
        if name == "portfolio_settle_inference":
            raise budget.BudgetUnavailable
        return {"allowed": True}
    monkeypatch.setattr(budget, "_rpc", rpc)
    async def collect():
        return [event async for event in manager._budgeted_stream("synthetic", request())]
    events = asyncio.run(collect())
    assert events[0].text == "Published portfolio answer"
    assert isinstance(events[-1], Finish)


def test_default_allowance_supports_real_prompt_failover(monkeypatch):
    from backend.app.services.chat_service import ConnectionManager, _RoundState
    from backend.app.services.llm import Finish, TextDelta
    from backend.app.services.llm.base import ProviderUnavailable
    manager = ConnectionManager()
    manager._retry_delay = 0
    attempts = []
    reservations = []
    charged = 0
    async def rpc(name, params):
        nonlocal charged
        if name == "portfolio_reserve_inference":
            charged += params["p_tokens"]
            reservations.append(params["p_tokens"])
            return {"allowed": charged <= params["p_receipt_limit"] and charged <= params["p_global_limit"]}
        return {"settled": True}
    async def stream(request):
        attempts.append(request.model)
        if len(attempts) < 3:
            raise ProviderUnavailable()
        yield TextDelta("Fallback answer")
        yield Usage(input_tokens=100, output_tokens=10)
        yield Finish("end_turn")
    manager.provider = Mock(stream=stream, plan_models=Mock(return_value=["primary", "primary", "fallback"]))
    monkeypatch.setattr(budget, "_rpc", rpc)
    state = _RoundState(model="primary")
    asyncio.run(manager._stream_with_failover("synthetic", state, []))
    assert attempts == ["primary", "primary", "fallback"]
    assert len(reservations) == 3
    assert state.text == ["Fallback answer"]
