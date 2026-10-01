"""The public demo works offline; custom runs are bounded and validated."""
import asyncio
from dataclasses import replace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.api import dataplayground_routes as routes
from backend.app.config import get_settings
from backend.app.models.dataplayground import LabCatalog, SimulationRequest
from backend.app.services import dataplayground as service


@pytest.fixture()
def lab_client(monkeypatch):
    routes._limiter.reset()
    monkeypatch.setattr(routes, "get_settings", lambda: replace(get_settings(), dataplayground_api_url=""))
    app = FastAPI()
    app.include_router(routes.router, prefix="/api")
    with TestClient(app) as client:
        yield client
    routes._limiter.reset()


def test_generated_catalog_is_valid_and_reconciles(lab_client):
    response = lab_client.get("/api/dataplayground")
    assert response.status_code == 200
    body = response.json()
    assert body.pop("live_simulation") is False
    catalog = LabCatalog.model_validate(body)
    assert {run.scenario.id for run in catalog.runs} == {"baseline", "acquisition", "retention", "quality"}
    for run in catalog.runs:
        assert sum(day.revenue_cents for day in run.daily) == run.summary.revenue_cents
        assert sum(day.signups for day in run.daily) == run.summary.signups
        assert run.daily[-1].active_customers == run.summary.active_customers
        assert run.summary.active_customers <= run.summary.paying_users <= run.summary.activated_users <= run.summary.signups
        assert len(run.daily) == run.config.days
        assert run.summary.quality_pass_rate <= 1
    baseline, _, _, incident = catalog.runs
    assert baseline.summary.revenue_cents == incident.summary.revenue_cents
    assert incident.summary.quality_pass_rate < baseline.summary.quality_pass_rate


def test_unconfigured_custom_run_has_actionable_error(lab_client):
    response = lab_client.post("/api/dataplayground/simulate", json={})
    assert response.status_code == 503
    assert "saved scenario" in response.json()["detail"]
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("body", [
    {"days": 1000}, {"daily_signups": 101}, {"seed": -1}, {"days": True},
    {"churn_rate": 0.3}, {"payment_rate": -1}, {"activation_rate": "0.5"},
    {"duplicate_rate": True}, {"sql": "DROP TABLE users"},
])
def test_invalid_input_is_rejected_before_upstream(lab_client, body):
    assert lab_client.post("/api/dataplayground/simulate", json=body).status_code == 422


def test_body_is_bounded_without_content_length(lab_client):
    response = lab_client.post("/api/dataplayground/simulate", content=iter([b" " * 3000, b" " * 3000]),
                               headers={"content-type": "application/json"})
    assert response.status_code == 413


def test_json_required_and_nonfinite_rejected(lab_client):
    assert lab_client.post("/api/dataplayground/simulate", content="{}").status_code == 415
    response = lab_client.post("/api/dataplayground/simulate", content='{"payment_rate":NaN}',
                               headers={"content-type": "application/json"})
    assert response.status_code == 422


@pytest.mark.parametrize("url", ["", "http://remote.example", "https://user:secret@example.org", "https://example.org/path",
                                "https://example.org?token=1", "https://example.org/#fragment", "https://example.org:bad"])
def test_invalid_service_urls_disable_custom_runs(url):
    assert service.service_endpoint(url) is None


@pytest.mark.parametrize("url", ["https://lab.example.org", "http://127.0.0.1:8010", "http://localhost:8010/"])
def test_service_url_has_a_fixed_endpoint(url):
    assert service.service_endpoint(url) == url.rstrip("/") + "/api/simulate"


def test_live_run_failure_releases_slot_and_keeps_catalog_available(lab_client, monkeypatch):
    monkeypatch.setattr(routes, "get_settings", lambda: replace(get_settings(), dataplayground_api_url="https://lab.example.org"))
    result = service.load_catalog().runs[0]
    upstream = AsyncMock(side_effect=[service.SimulationUnavailable(), result])
    monkeypatch.setattr(routes, "simulate", upstream)
    assert lab_client.get("/api/dataplayground").json()["live_simulation"] is True
    first = lab_client.post("/api/dataplayground/simulate", json=result.config.model_dump())
    assert first.status_code == 502
    assert "saved scenarios" in first.json()["detail"]
    second = lab_client.post("/api/dataplayground/simulate", json=result.config.model_dump())
    assert second.status_code == 200
    assert second.json()["id"] == result.id
    assert second.headers["cache-control"] == "no-store"
    assert upstream.call_args.args[0] == "https://lab.example.org/api/simulate"


def test_rate_limit_is_enforced(lab_client):
    for _ in range(6):
        assert lab_client.post("/api/dataplayground/simulate", json={}).status_code == 503
    response = lab_client.post("/api/dataplayground/simulate", json={})
    assert response.status_code == 429
    assert lab_client.get("/api/dataplayground").status_code == 200


def test_concurrency_limit_fails_fast(lab_client, monkeypatch):
    monkeypatch.setattr(routes, "get_settings", lambda: replace(get_settings(), dataplayground_api_url="https://lab.example.org"))
    assert routes._slots.acquire(False)
    assert routes._slots.acquire(False)
    try:
        assert lab_client.post("/api/dataplayground/simulate", json={}).status_code == 429
    finally:
        routes._slots.release()
        routes._slots.release()


@pytest.mark.parametrize("mode", ["valid", "wrong_config", "bad_contract", "oversized", "redirect", "timeout"])
def test_upstream_contract_and_failure_boundaries(monkeypatch, mode):
    run = service.load_catalog().runs[0]
    payload = run.model_dump()
    if mode == "wrong_config":
        payload["config"]["seed"] += 1

    def handler(request):
        assert str(request.url) == "https://lab.example.org/api/simulate"
        if mode == "timeout":
            raise httpx.ReadTimeout("private upstream diagnostics", request=request)
        if mode == "redirect":
            return httpx.Response(302, headers={"location": "https://different.example.org"})
        if mode == "oversized":
            return httpx.Response(200, content=b" " * (service.MAX_RESPONSE_BYTES + 1))
        return httpx.Response(200, json={} if mode == "bad_contract" else payload)

    original_client = httpx.AsyncClient
    monkeypatch.setattr(service.httpx, "AsyncClient", lambda **kwargs: original_client(
        **kwargs, transport=httpx.MockTransport(handler),
    ))
    call = service.simulate("https://lab.example.org/api/simulate", run.config)
    if mode == "valid":
        assert asyncio.run(call).id == run.id
    else:
        with pytest.raises(service.SimulationUnavailable):
            asyncio.run(call)


def test_contract_rejects_future_versions_and_invalid_counts():
    body = service.load_catalog().model_dump()
    body["schema_version"] = 2
    with pytest.raises(ValidationError):
        LabCatalog.model_validate(body)
    body["schema_version"] = 1
    body["runs"][0]["summary"]["revenue_cents"] = -1
    with pytest.raises(ValidationError):
        LabCatalog.model_validate(body)


def test_config_env_is_optional_and_trimmed(monkeypatch):
    monkeypatch.setenv("DATAPLAYGROUND_API_URL", "  https://lab.example.org  ")
    get_settings.cache_clear()
    try:
        assert get_settings().dataplayground_api_url == "https://lab.example.org"
    finally:
        get_settings.cache_clear()


def test_defaults_match_exported_baseline():
    assert SimulationRequest() == service.load_catalog().runs[0].config
