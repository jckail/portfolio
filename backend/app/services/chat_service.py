"""AI assistant service: connection state, prompt assembly, and streaming.

Owns everything about talking to Claude on behalf of connected visitors;
the route layer (api/chat_routes.py) only parses frames and delegates here.
"""
import json
import logging
import os
import time
from datetime import UTC, datetime

from anthropic import AsyncAnthropic
from fastapi import WebSocket

from backend.app.config import get_settings
from backend.app.models import get_all_models
from backend.app.services.chat_actions import CHAT_TOOLS, normalize_tool_action
from backend.app.utils.rate_limit import SlidingWindowLimiter
from backend.app.utils.supabase_client import supabase

logger = logging.getLogger(__name__)

settings = get_settings()

CHAT_MODEL = settings.chat_model
MAX_RESPONSE_TOKENS = settings.chat_max_tokens

# Keep conversations bounded so long sessions don't grow token usage unbounded.
MAX_HISTORY_MESSAGES = 20
# Page context is scraped from the DOM and can be very large; keep a useful slice.
MAX_PAGE_CONTEXT_CHARS = 4000
# Guard the Anthropic API against abuse: cap message size and request rate.
MAX_USER_MESSAGE_CHARS = 2000
RATE_LIMIT_MAX_MESSAGES = 10
RATE_LIMIT_WINDOW_SECONDS = 60
# A per-connection limit alone is bypassable: the client picks its own id and
# reconnecting mints a fresh one. These caps are keyed on the network peer and
# survive disconnects, so churning connections gains an abuser nothing.
IP_RATE_LIMIT_MAX_MESSAGES = 30
# Instance-wide ceiling on completions. This is the limit that actually bounds
# the Anthropic bill if the per-IP key is ever wrong, so it is set explicitly
# against budget rather than inheriting the limiter's max_events * 20 default.
GLOBAL_RATE_LIMIT_MAX_MESSAGES = 120
MAX_CONNECTIONS_TOTAL = 200
MAX_CONNECTIONS_PER_IP = 5
# Sockets that go quiet are dropped so an abuser cannot simply hold thousands
# of idle connections open against a 512 MiB instance.
IDLE_TIMEOUT_SECONDS = 300

FALLBACK_SYSTEM_PROMPT = """You are an AI assistant for Jordan Kail's portfolio website. Your role is to help visitors:
1. Learn about Jordan's background, experience, and technical skills
2. Understand his projects and achievements
3. Discuss potential collaborations or opportunities
4. Answer questions about his work and expertise

Keep responses professional, informative, and focused on Jordan's professional background and capabilities.
You have access to the current page content to provide accurate, contextual responses."""


def _load_base_prompt() -> str:
    """Load the system prompt from assets, falling back to a built-in prompt."""
    # Deliberately NOT under backend/assets/: that directory is mounted at
    # /api/assets, which made the whole system prompt publicly downloadable.
    prompt_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'prompts', 'portfoliosystemprompt.md'
    )
    try:
        with open(prompt_path) as file:
            return file.read()
    except Exception as e:
        logger.error("Error loading system prompt from %s: %s", prompt_path, e)
        return FALLBACK_SYSTEM_PROMPT


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.page_contexts: dict[str, str] = {}
        # Per-client conversation history so the assistant remembers prior turns.
        self.conversation_histories: dict[str, list[dict]] = {}
        # Per-client timestamps of recent messages, for rate limiting.
        self.message_timestamps: dict[str, list[float]] = {}
        # Peer-keyed limits. Unlike the per-client counters above, these are not
        # cleared on disconnect, so they cannot be reset by reconnecting.
        self.ip_limiter = SlidingWindowLimiter(
            max_events=IP_RATE_LIMIT_MAX_MESSAGES,
            window_seconds=RATE_LIMIT_WINDOW_SECONDS,
            global_max_events=GLOBAL_RATE_LIMIT_MAX_MESSAGES,
        )
        self.connection_ips: dict[str, str] = {}
        self.ip_conn_counts: dict[str, int] = {}
        # One client and one portfolio-data snapshot for the entire application.
        self.client = AsyncAnthropic(
            api_key=settings.anthropic_api_key or None,
            max_retries=3,
            timeout=60.0
        )
        self._base_prompt: str | None = None
        self._portfolio_data: str | None = None

    async def connect(self, client_id: str, websocket: WebSocket, ip: str = "unknown") -> bool:
        """Accept a socket, or refuse it and return False.

        A client id already in use is rejected rather than allowed to displace
        the existing socket: overwriting would hand the new connection the
        previous visitor's reply stream and page context.
        """
        if len(self.active_connections) >= MAX_CONNECTIONS_TOTAL:
            await websocket.close(code=1013)  # try again later
            return False
        if self.ip_conn_counts.get(ip, 0) >= MAX_CONNECTIONS_PER_IP:
            await websocket.close(code=1013)
            return False

        # Claim the id BEFORE the first await. `accept()` yields to the event
        # loop, so a check-then-assign around it let two concurrent handshakes
        # for the same id both pass: each incremented ip_conn_counts while only
        # one entry existed in connection_ips, so disconnect under-decremented
        # and leaked a connection slot permanently. Enough races against a
        # chosen ip pinned it at the per-IP cap with no live sockets, locking
        # that visitor out until the instance restarted.
        if client_id in self.active_connections:
            await websocket.close(code=1008)  # policy violation
            return False
        self.active_connections[client_id] = websocket
        self.connection_ips[client_id] = ip
        self.ip_conn_counts[ip] = self.ip_conn_counts.get(ip, 0) + 1

        try:
            await websocket.accept()
        except Exception:
            # Never leave the reservation behind if the handshake fails.
            self.disconnect(client_id)
            raise

        self.conversation_histories[client_id] = []
        # A recycled id must not inherit the previous session's page context.
        self.page_contexts.pop(client_id, None)
        return True

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        self.page_contexts.pop(client_id, None)
        self.conversation_histories.pop(client_id, None)
        self.message_timestamps.pop(client_id, None)
        ip = self.connection_ips.pop(client_id, None)
        if ip is not None:
            remaining = self.ip_conn_counts.get(ip, 0) - 1
            if remaining > 0:
                self.ip_conn_counts[ip] = remaining
            else:
                self.ip_conn_counts.pop(ip, None)

    def is_ip_rate_limited(self, ip: str) -> bool:
        """Peer-keyed message limit; survives reconnects by design."""
        return not self.ip_limiter.allow(ip)

    def reset_limits(self) -> None:
        """Clear rate-limit state (used by tests)."""
        self.message_timestamps.clear()
        self.ip_limiter.reset()

    def is_rate_limited(self, client_id: str) -> bool:
        now = time.monotonic()
        timestamps = self.message_timestamps.setdefault(client_id, [])
        timestamps[:] = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]
        if len(timestamps) >= RATE_LIMIT_MAX_MESSAGES:
            return True
        timestamps.append(now)
        return False

    def store_context(self, client_id: str, context: str):
        """Store the visitor's current page context, keeping only readable text."""
        try:
            parsed = json.loads(context)
            text = parsed.get('text', '') if isinstance(parsed, dict) else str(parsed)
        except (json.JSONDecodeError, TypeError):
            text = context or ''
        self.page_contexts[client_id] = text[:MAX_PAGE_CONTEXT_CHARS]

    def get_context(self, client_id: str) -> str:
        return self.page_contexts.get(client_id, '')

    def get_history(self, client_id: str) -> list[dict]:
        return self.conversation_histories.setdefault(client_id, [])

    def append_to_history(self, client_id: str, role: str, content: str):
        history = self.get_history(client_id)
        history.append({"role": role, "content": content})
        # Trim from the front, always keeping an even number of turns so the
        # transcript starts with a user message.
        if len(history) > MAX_HISTORY_MESSAGES:
            del history[:len(history) - MAX_HISTORY_MESSAGES]
            if history and history[0]["role"] == "assistant":
                del history[0]

    def seed_history(self, client_id: str, turns: list) -> None:
        """Replace empty server history with a client-persisted transcript.

        Used after a page reload so follow-up questions keep prior context.
        Only accepted when the server has no history yet (fresh connection).
        """
        if self.get_history(client_id):
            return
        if not isinstance(turns, list):
            return

        seeded: list[dict] = []
        for turn in turns:
            if not isinstance(turn, dict):
                continue
            role = turn.get("role")
            content = turn.get("content")
            if role not in ("user", "assistant") or not isinstance(content, str):
                continue
            text = content.strip()
            if not text or len(text) > MAX_USER_MESSAGE_CHARS * 4:
                continue
            seeded.append({"role": role, "content": text})

        if not seeded:
            return
        # Anthropic requires the first message to be from the user
        while seeded and seeded[0]["role"] == "assistant":
            seeded.pop(0)
        if len(seeded) > MAX_HISTORY_MESSAGES:
            seeded = seeded[-MAX_HISTORY_MESSAGES:]
            if seeded and seeded[0]["role"] == "assistant":
                seeded.pop(0)
        self.conversation_histories[client_id] = seeded

    def _build_system_blocks(self, client_id: str) -> list[dict]:
        """Build system prompt blocks with prompt caching for the static parts.

        The base prompt and portfolio data never change between requests, so they
        are marked with a cache breakpoint. Volatile content (current time, page
        context) goes after the breakpoint to keep the cache hit rate high.
        """
        if self._base_prompt is None:
            self._base_prompt = _load_base_prompt()
        if self._portfolio_data is None:
            # get_all_models() returns Pydantic models; dump them to plain data
            # so Claude receives structured JSON, not Python reprs.
            serializable = {
                key: value.model_dump(mode="json") if hasattr(value, "model_dump") else value
                for key, value in get_all_models().items()
            }
            self._portfolio_data = json.dumps(serializable, ensure_ascii=False)

        blocks = [
            {"type": "text", "text": self._base_prompt},
            {
                "type": "text",
                "text": f"Portfolio data (source of truth for Jordan's background):\n{self._portfolio_data}",
                "cache_control": {"type": "ephemeral"}
            },
        ]

        current_time = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
        volatile = f"Current Date and Time: {current_time}"
        page_context = self.get_context(client_id)
        if page_context:
            volatile += f"\n\nThe visitor is currently viewing a page containing:\n{page_context}"
        blocks.append({"type": "text", "text": volatile})

        return blocks

    async def send_message(self, message: str, client_id: str, is_chunk: bool = False):
        if client_id not in self.active_connections:
            return
        try:
            websocket = self.active_connections[client_id]
            await websocket.send_json({
                "message": message,
                "sender": "assistant",
                "is_chunk": is_chunk
            })
        except Exception as e:
            logger.error("Error sending message to client %s: %s", client_id, e)

    async def send_action(self, client_id: str, action: dict):
        """Forward a validated UI action for the frontend to execute."""
        if client_id not in self.active_connections:
            return
        try:
            websocket = self.active_connections[client_id]
            await websocket.send_json({"type": "action", **action})
        except Exception as e:
            logger.error("Error sending action to client %s: %s", client_id, e)

    async def _log_usage(self, client_id: str, usage) -> None:
        """Log token counts and cache-hit rates for cost/cache observability.

        Uses the existing flexible `logs` table (via `session_uuid` +
        `metadata`) rather than a new table/columns — `client_id` is used
        as the session key instead of the GA session id since it's always
        present, unlike GA (gated behind cookie consent).
        """
        await supabase.store_log(
            level="INFO",
            message="chat_completion_usage",
            session_uuid=client_id,
            source="chat",
            metadata={
                "model": CHAT_MODEL,
                "input_tokens": getattr(usage, "input_tokens", None),
                "output_tokens": getattr(usage, "output_tokens", None),
                "cache_creation_input_tokens": getattr(usage, "cache_creation_input_tokens", None),
                "cache_read_input_tokens": getattr(usage, "cache_read_input_tokens", None),
            },
        )

    async def _dispatch_tool_actions(self, client_id: str, final_message) -> list[str]:
        """Parse tool_use blocks, send action frames, return human labels."""
        labels: list[str] = []
        content = getattr(final_message, "content", None) or []
        for block in content:
            if getattr(block, "type", None) != "tool_use":
                continue
            name = getattr(block, "name", "") or ""
            raw_input = getattr(block, "input", None)
            action = normalize_tool_action(name, raw_input if isinstance(raw_input, dict) else {})
            if not action:
                continue
            await self.send_action(client_id, action)
            if action["action"] == "navigate":
                labels.append(f"Opened the {action['target']} section")
            elif action["action"] == "open_modal":
                target = action.get("key") or action.get("kind")
                labels.append(f"Opened {target}")
            elif action["action"] == "download_resume":
                labels.append("Started the resume download")
            elif action["action"] == "prefill_contact":
                labels.append("Opened the contact form with a draft")
            elif action["action"] == "set_theme":
                labels.append(f"Switched to {action.get('theme')} theme")
        return labels

    async def stream_response(self, client_id: str, user_message: str, ga_session_id: str = None):
        """Stream a Claude response to the client, maintaining conversation history."""
        self.append_to_history(client_id, "user", user_message)

        complete_response: list[str] = []
        final_message = None
        try:
            async with self.client.messages.stream(
                model=CHAT_MODEL,
                max_tokens=MAX_RESPONSE_TOKENS,
                system=self._build_system_blocks(client_id),
                messages=self.get_history(client_id),
                tools=CHAT_TOOLS,
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        await self.send_message(text, client_id, is_chunk=True)
                        complete_response.append(text)
                # Final message includes any tool_use blocks the model requested
                final_message = await stream.get_final_message()
        except Exception as e:
            logger.error("Error streaming Claude response for client %s: %s", client_id, e)
            # Drop the failed user turn so a retry starts clean.
            history = self.get_history(client_id)
            if history and history[-1]["role"] == "user":
                history.pop()
            await self.send_message(
                "I apologize, but I ran into a problem generating a response. Please try again.",
                client_id,
                is_chunk=False
            )
            return

        usage = getattr(final_message, "usage", None)
        if usage is not None:
            await self._log_usage(client_id, usage)

        action_labels: list[str] = []
        if final_message is not None:
            action_labels = await self._dispatch_tool_actions(client_id, final_message)

        final_response = ''.join(complete_response)
        # If the model only called tools (no prose), narrate what happened so
        # the UI and conversation history stay coherent.
        if not final_response and action_labels:
            final_response = "Done — " + "; ".join(action_labels) + "."
            await self.send_message(final_response, client_id, is_chunk=True)

        if final_response:
            self.append_to_history(client_id, "assistant", final_response)

        # Completion frame: the client already has the full streamed text,
        # so don't re-send it (empty message means "use accumulated chunks").
        # Always send it so the client can clear its loading state.
        await self.send_message("", client_id, is_chunk=False)

        if final_response and ga_session_id:
            await supabase.store_chat_message(
                google_analytics_session_id=ga_session_id,
                message_type='received',
                message_detail=final_response
            )


# Application-wide singleton shared by all WebSocket connections
manager = ConnectionManager()
