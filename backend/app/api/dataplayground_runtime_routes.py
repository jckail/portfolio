"""Capability-scoped operating lab. Every response is private and uncached."""
import asyncio
from contextlib import suppress

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ValidationError

from ..models.dataplayground_copilot import ConfirmRequest, CopilotRequest, CopilotResponse
from ..models.dataplayground_runtime import (
    QueryRequest,
    QueryResult,
    RuntimeAction,
    RuntimeState,
    SessionRequest,
    SessionResponse,
)
from ..services import dataplayground_copilot as copilot
from ..services.dataplayground_runtime import get_runtime
from ..utils.rate_limit import SlidingWindowLimiter, enforce_rate_limit

router = APIRouter(prefix="/dataplayground", tags=["dataplayground-runtime"])
_sessions = SlidingWindowLimiter(max_events=6, window_seconds=60, global_max_events=32, name="lab-sessions")
_operations = SlidingWindowLimiter(max_events=90, window_seconds=60, global_max_events=600, name="lab-operations")
_chat = SlidingWindowLimiter(max_events=4, window_seconds=60, global_max_events=12, name="lab-copilot")
_HEADERS = {"Cache-Control": "no-store"}
_BUSY_HEADERS = {**_HEADERS, "Retry-After": "1"}
_BUSY_DETAIL = "The previous investigation is still finishing. Retry shortly."


def capability(request: Request) -> str:
    value = request.headers.get("authorization", "")
    if not value.startswith("Bearer ") or not 32 <= len(value[7:]) <= 100:
        raise HTTPException(401, "Create a workspace to use this tool.", headers=_HEADERS)
    return value[7:]


async def body(request: Request, contract: type[BaseModel], max_bytes: int = 24000):
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
        raise HTTPException(415, "Send tool inputs as JSON.", headers=_HEADERS)
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > max_bytes:
            raise HTTPException(413, "Tool input is too large.", headers=_HEADERS)
        data.extend(chunk)
    try:
        return contract.model_validate_json(bytes(data))
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors(include_url=False, include_context=False, include_input=False),
                            headers=_HEADERS) from None


def operation_capability(request: Request, response: Response) -> str:
    response.headers.update(_HEADERS)
    enforce_rate_limit(_operations, request, headers=_HEADERS)
    return capability(request)


async def execute(token: str, method: str, *args):
    try:
        return await asyncio.to_thread(getattr(get_runtime(), method), token, *args)
    except KeyError:
        raise HTTPException(410, "Your workspace expired. Create another to continue.", headers=_HEADERS) from None
    except ValueError as exc:
        raise HTTPException(422, str(exc), headers=_HEADERS) from None


async def operate(request: Request, response: Response, method: str, *args):
    return await execute(operation_capability(request, response), method, *args)


@router.post("/runtime/session", response_model=SessionResponse)
async def create_session(request: Request, response: Response):
    response.headers.update(_HEADERS)
    enforce_rate_limit(_sessions, request, headers=_HEADERS)
    config = await body(request, SessionRequest, 2048)
    try:
        return await asyncio.to_thread(get_runtime().create, config)
    except ValueError as exc:
        raise HTTPException(422, str(exc), headers=_HEADERS) from None


@router.get("/runtime/state", response_model=RuntimeState)
async def runtime_state(request: Request, response: Response):
    return await operate(request, response, "state")


@router.post("/runtime/action", response_model=RuntimeState)
async def runtime_action(request: Request, response: Response):
    token = operation_capability(request, response)
    config = await body(request, RuntimeAction, 4096)
    return await execute(token, "action", config)


@router.post("/runtime/query", response_model=QueryResult)
async def runtime_query(request: Request, response: Response):
    token = operation_capability(request, response)
    config = await body(request, QueryRequest)
    return await execute(token, "query", config)


@router.post("/runtime/close")
async def runtime_close(request: Request, response: Response):
    await operate(request, response, "delete")
    return {"closed": True}


@router.get("/copilot/status")
async def copilot_status(response: Response):
    response.headers.update(_HEADERS)
    return {"available": await asyncio.to_thread(copilot.available), "engine": "Pi Agent SDK",
            "tools": ["inspect_catalog", "inspect_workspace", "inspect_incident", "inspect_run", "query_sql", "propose_runtime_change"]}


@router.post("/copilot/chat", response_model=CopilotResponse)
async def copilot_chat(request: Request, response: Response):
    response.headers.update(_HEADERS)
    token = capability(request)
    # A stopped turn keeps its capability occupied until provider/process cleanup
    # finishes. Checking first avoids charging polling retries as new model turns.
    if copilot.workspace_busy(token):
        raise HTTPException(409, _BUSY_DETAIL, headers=_BUSY_HEADERS)
    enforce_rate_limit(_chat, request, headers=_HEADERS)
    config = await body(request, CopilotRequest, 56000)
    task = asyncio.create_task(copilot.chat(token, config))
    try:
        while not task.done():
            await asyncio.wait({task}, timeout=0.25)
            if not task.done() and await request.is_disconnected():
                raise HTTPException(499, "Investigation cancelled.", headers=_HEADERS)
        return await task
    except KeyError:
        raise HTTPException(410, "Your workspace expired. Create another to continue.", headers=_HEADERS) from None
    except copilot.CopilotBusy:
        raise HTTPException(409, _BUSY_DETAIL, headers=_BUSY_HEADERS) from None
    except copilot.CopilotUnavailable:
        raise HTTPException(503, "Data Copilot is temporarily unavailable. The lab tools still work.", headers=_HEADERS) from None
    finally:
        if not task.done():
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


@router.post("/copilot/confirm", response_model=RuntimeState)
async def copilot_confirm(request: Request, response: Response):
    response.headers.update(_HEADERS)
    enforce_rate_limit(_operations, request, headers=_HEADERS)
    token = capability(request)
    config = await body(request, ConfirmRequest, 1024)
    try:
        return await asyncio.to_thread(copilot.confirm, token, config.id)
    except KeyError:
        raise HTTPException(410, "Your workspace expired. Create another to continue.", headers=_HEADERS) from None
    except ValueError as exc:
        raise HTTPException(422, str(exc), headers=_HEADERS) from None
