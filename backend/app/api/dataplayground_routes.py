"""Thin public adapter: saved Python runs work independently of the live service."""
import asyncio
from threading import BoundedSemaphore

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import ValidationError

from ..config import get_settings
from ..models.dataplayground import PublicLabCatalog, SimulationRequest, SimulationRun
from ..services.dataplayground import SimulationUnavailable, load_catalog, service_endpoint, simulate
from ..utils.rate_limit import SlidingWindowLimiter, enforce_rate_limit

router = APIRouter(prefix="/dataplayground", tags=["dataplayground"])
_limiter = SlidingWindowLimiter(max_events=6, window_seconds=60, global_max_events=30, name="dataplayground")
_slots = BoundedSemaphore(2)
_NO_STORE = {"Cache-Control": "no-store"}


@router.get("", response_model=PublicLabCatalog)
async def catalog() -> PublicLabCatalog:
    data = await asyncio.to_thread(load_catalog)
    return PublicLabCatalog(
        **data.model_dump(),
        live_simulation=service_endpoint(get_settings().dataplayground_api_url) is not None,
    )


@router.post(
    "/simulate", response_model=SimulationRun,
    openapi_extra={"requestBody": {"required": True, "content": {
        "application/json": {"schema": SimulationRequest.model_json_schema()},
    }}},
)
async def run_simulation(request: Request, response: Response) -> SimulationRun:
    response.headers.update(_NO_STORE)
    enforce_rate_limit(_limiter, request, headers=_NO_STORE)
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise HTTPException(415, "Send simulation settings as JSON.", headers=_NO_STORE)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 4096:
            raise HTTPException(413, "Simulation settings exceed 4 KB.", headers=_NO_STORE)
    try:
        config = SimulationRequest.model_validate_json(bytes(body))
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors(include_url=False, include_context=False, include_input=False),
                            headers=_NO_STORE)
    endpoint = service_endpoint(get_settings().dataplayground_api_url)
    if endpoint is None:
        raise HTTPException(503, "Custom runs are not hosted here. Explore a saved scenario or run the Python lab locally.",
                            headers=_NO_STORE)
    if not _slots.acquire(blocking=False):
        raise HTTPException(429, "Two simulations are already running. Try again shortly.",
                            headers={**_NO_STORE, "Retry-After": "5"})
    try:
        return await simulate(endpoint, config)
    except SimulationUnavailable:
        raise HTTPException(502, "The simulation service is unavailable. Your saved scenarios are still available.",
                            headers=_NO_STORE)
    finally:
        _slots.release()
