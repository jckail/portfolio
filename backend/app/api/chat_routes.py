"""Chat endpoints: availability status (REST) and the streaming WebSocket.

All assistant behavior (Anthropic streaming, history, rate limits, prompt
assembly) lives in services/chat_service.py; this module only parses frames
and delegates.
"""
import asyncio
import json
import logging
import re
import time
from urllib.parse import urlparse

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.app.config import get_settings
from backend.app.services.agent_access import verify_access
from backend.app.services.agent_scope import SCOPE_REFUSAL, portfolio_question_allowed
from backend.app.services.agent_trial import TrialUnavailable, trial_remaining, verify_trial
from backend.app.services.chat_service import (
    IDLE_TIMEOUT_SECONDS,
    MAX_USER_MESSAGE_CHARS,
    manager,
)
from backend.app.utils.events import log_event
from backend.app.utils.rate_limit import client_ip
from backend.app.utils.supabase_client import supabase

logger = logging.getLogger(__name__)

settings = get_settings()

# `router` carries the WebSocket (mounted under /ws),
# `status_router` exposes REST status (mounted under /api).
router = APIRouter()
status_router = APIRouter(prefix="/chat")

# Session ids are opaque to the server, but they key per-connection state, so
# bound the shape to keep the key space sane and the value log-safe.
_CLIENT_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
# The GA session id is client-supplied and written to Supabase, so it gets the
# same bounded, boring shape or is ignored.
_GA_SESSION_RE = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")

# Client-persisted transcripts are replayed on reconnect; cap the frame before
# it is walked so a huge array cannot be allocated on our behalf.
MAX_SEEDED_TURNS = 100


class ChatStatus(BaseModel):
    available: bool


@status_router.get("/status", response_model=ChatStatus)
async def chat_status() -> ChatStatus:
    """Report whether the AI assistant is available.

    The frontend hides the chat button when the assistant cannot work
    (e.g. no Anthropic API key configured) instead of letting visitors
    discover the failure through unanswered messages.

    Also false while the auth circuit breaker is open, so a rejected API key
    hides the button instead of failing every visitor message.
    """
    return ChatStatus(available=manager.is_available())


def _origin_allowed(websocket: WebSocket) -> bool:
    """Reject cross-site WebSocket handshakes.

    Starlette's CORSMiddleware only handles `http` scopes, so `allow_origins`
    never applies here and any page on the internet could otherwise open a
    socket and spend our Anthropic budget from a visitor's browser.

    Same-origin is always allowed. Cross-site request forgery requires, by
    definition, an Origin that differs from the host being addressed: a page on
    evil.tld sends `Origin: https://evil.tld` with `Host: jordan-kail.com`, and
    the mismatch is what identifies it. Checking only ALLOWED_ORIGINS meant the
    chat died on every hostname that served the site but wasn't in that
    variable — in production that was three of the four live domains, including
    the one declared canonical.

    The configured allow-list still applies on top, for genuinely cross-origin
    callers such as the Vite dev server on :5173 talking to the API on :8080.

    A *missing* Origin is allowed: browsers always send one on a WS handshake,
    so absence means a non-browser client, which can spoof any value anyway.
    Those callers are bounded by the peer-keyed rate limits instead.
    """
    origin = websocket.headers.get("origin")
    if origin is None:
        return True
    if origin in settings.allowed_origins:
        return True

    # Same-origin: the Origin's host:port must equal the Host we were addressed
    # by. Both are browser-controlled in the sense that a non-browser client can
    # set either, but a browser will never let a cross-site page forge Origin.
    host = websocket.headers.get("host")
    if not host:
        return False
    try:
        origin_netloc = urlparse(origin).netloc
    except ValueError:
        return False
    return bool(origin_netloc) and origin_netloc.lower() == host.lower()


async def handle_websocket_message(websocket: WebSocket, client_id: str, data: dict, ip: str,
                                   trial_id: str | None = None):
    try:
        if data.get("type") == "context":
            manager.store_context(client_id, data.get("content", ""))
            return

        if data.get("type") == "history":
            # Client replaying a sessionStorage transcript after reconnect
            turns = data.get("messages", [])
            if isinstance(turns, list):
                turns = turns[:MAX_SEEDED_TURNS]
            manager.seed_history(client_id, turns)
            return

        if data.get("type") == "confirm_action":
            if trial_id:
                await websocket.send_json({"type": "access_required", "reason": "contact_required"})
                return
            await manager.handle_confirm(client_id, data, ip)
            return

        if data.get("type") == "cancel_action":
            await manager.handle_cancel(client_id, data)
            return

        if data.get("type") != "message" or not data.get("content"):
            return

        if not isinstance(data["content"], str):
            return

        if len(data["content"]) > MAX_USER_MESSAGE_CHARS:
            await manager.send_message(
                "That message is a bit long for me — could you shorten it and try again?",
                client_id,
                is_chunk=False
            )
            return

        # Both ceilings apply: the per-connection one gives a friendly nudge for
        # ordinary fast typing, the peer-keyed one is what actually bounds cost.
        if manager.is_rate_limited(client_id) or manager.is_ip_rate_limited(ip):
            await manager.send_message(
                "You're sending messages very quickly — please wait a moment and try again.",
                client_id,
                is_chunk=False
            )
            return

        if get_settings().agent_access_required and not portfolio_question_allowed(data["content"]):
            await manager.send_message(SCOPE_REFUSAL, client_id, is_chunk=False)
            return

        if trial_id:
            try:
                remaining = await trial_remaining(trial_id, consume=True)
            except TrialUnavailable:
                await manager.send_message("Trial access is temporarily unavailable. Please try again or introduce yourself.",
                                           client_id, is_chunk=False)
                return
            if remaining is None:
                await websocket.send_json({"type": "access_required", "reason": "trial_exhausted"})
                return
            await websocket.send_json({"type": "access_status", "mode": "trial", "remaining_messages": remaining})

        # Store user message in Supabase
        ga_session_id = data.get('ga_session_id')
        if not (isinstance(ga_session_id, str) and _GA_SESSION_RE.fullmatch(ga_session_id)):
            ga_session_id = None
        if ga_session_id:
            await supabase.store_chat_message(
                google_analytics_session_id=ga_session_id,
                message_type='sent',
                message_detail=data['content']
            )

        await manager.stream_response(client_id, data['content'], ga_session_id=ga_session_id)

    except Exception as e:
        logger.error("Error handling websocket message for client %s: %s", client_id, e)
        await manager.send_message(
            "I apologize, but something went wrong. Please try again.",
            client_id,
            is_chunk=False
        )


@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    if not _origin_allowed(websocket):
        log_event("ws.rejected_origin")
        await websocket.close(code=1008)
        return

    # fullmatch, not match: `$` also matches before a trailing newline, so
    # /ws/AAAAAAAA%0A would pass and land a stray newline in the logs.
    if not _CLIENT_ID_RE.fullmatch(client_id):
        await websocket.close(code=1008)
        return

    ip = client_ip(websocket)
    if not await manager.connect(client_id, websocket, ip):
        return

    try:
        access_expires = None
        trial_id = None
        if get_settings().agent_access_required:
            try:
                access_frame = json.loads(await asyncio.wait_for(websocket.receive_text(), timeout=10))
                if isinstance(access_frame, dict) and access_frame.get("type") == "access":
                    access_expires = verify_access(access_frame.get("token"))
                    if access_expires is None:
                        trial = verify_trial(access_frame.get("token"))
                        if trial:
                            remaining = await trial_remaining(trial[0])
                            if remaining is not None:
                                trial_id, access_expires = trial
                                await websocket.send_json({"type": "access_status", "mode": "trial",
                                                           "remaining_messages": remaining})
            except (TimeoutError, ValueError):
                pass
            except TrialUnavailable:
                await websocket.close(code=1013, reason="Trial access temporarily unavailable")
                return
            if access_expires is None:
                await websocket.close(code=1008, reason="Agent access required")
                return
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=IDLE_TIMEOUT_SECONDS
                )
            except TimeoutError:
                await websocket.close(code=1000)
                break

            try:
                parsed_data = json.loads(data)
            except json.JSONDecodeError:
                continue
            if not isinstance(parsed_data, dict):
                continue

            if access_expires is not None:
                if time.time() >= access_expires:
                    await websocket.close(code=1008, reason="Agent access expired")
                    break

            await handle_websocket_message(websocket, client_id, parsed_data, ip, trial_id)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Connection error for client %s: %s", client_id, e)
    finally:
        manager.disconnect(client_id)
