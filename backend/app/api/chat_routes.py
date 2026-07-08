"""Chat endpoints: availability status (REST) and the streaming WebSocket.

All assistant behavior (Anthropic streaming, history, rate limits, prompt
assembly) lives in services/chat_service.py; this module only parses frames
and delegates.
"""
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import get_settings
from backend.app.services.chat_service import MAX_USER_MESSAGE_CHARS, manager
from backend.app.utils.supabase_client import supabase

logger = logging.getLogger(__name__)

settings = get_settings()

# `router` carries the WebSocket (mounted under /ws),
# `status_router` exposes REST status (mounted under /api).
router = APIRouter()
status_router = APIRouter(prefix="/chat")


@status_router.get("/status")
async def chat_status():
    """Report whether the AI assistant is available.

    The frontend hides the chat button when the assistant cannot work
    (e.g. no Anthropic API key configured) instead of letting visitors
    discover the failure through unanswered messages.
    """
    return {"available": settings.chat_available}


async def handle_websocket_message(websocket: WebSocket, client_id: str, data: dict):
    try:
        if data.get("type") == "context":
            manager.store_context(client_id, data.get("content", ""))
            return

        if data.get("type") != "message" or not data.get("content"):
            return

        if len(data["content"]) > MAX_USER_MESSAGE_CHARS:
            await manager.send_message(
                "That message is a bit long for me — could you shorten it and try again?",
                client_id,
                is_chunk=False
            )
            return

        if manager.is_rate_limited(client_id):
            await manager.send_message(
                "You're sending messages very quickly — please wait a moment and try again.",
                client_id,
                is_chunk=False
            )
            return

        # Store user message in Supabase
        ga_session_id = data.get('ga_session_id')
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
    await manager.connect(client_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            parsed_data = json.loads(data)
            await handle_websocket_message(websocket, client_id, parsed_data)

    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error("Connection error for client %s: %s", client_id, e)
        manager.disconnect(client_id)
