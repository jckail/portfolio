"""Tool registry for the chat assistant: schemas, validators and handlers.

Tools come in two kinds:

* ``read`` tools have no side effect the visitor did not ask for. The browser
  ones (open a modal, scroll, switch theme, download the resume) are forwarded
  to the SPA as validated ``action`` frames by chat_actions.py; ``search_portfolio``
  runs here, over the portfolio JSON, and its result goes back to the model.
* ``execute`` tools send mail to Jordan or reveal contact data. The model can
  NEVER run one on its own say-so: calling it only creates a *pending action*
  (random id, bound to this connection, single use, 10 minute lifetime) that the
  browser shows as a confirmation card. Only the visitor's confirm frame, with
  an email address they typed, runs the handler, under the same rate limiters
  as the REST contact routes.

Nothing here logs an email address, message text or phone number.
"""
from __future__ import annotations

import html
import logging
import re
import secrets
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime

from pydantic import EmailStr, TypeAdapter, ValidationError

from backend.app.config import get_settings
from backend.app.services.chat_actions import CHAT_TOOLS
from backend.app.services.owner_mail import (
    OwnerMailFailed,
    OwnerMailNotConfigured,
    owner_mail_configured,
    send_owner_mail,
)
from backend.app.utils.events import log_event

logger = logging.getLogger(__name__)

KIND_READ = "read"
KIND_EXECUTE = "execute"

# Same caps as the REST contact routes (EmailMessage / PhoneRequest).
MAX_SUBJECT_CHARS = 150
MAX_MESSAGE_CHARS = 5000
MAX_EMAIL_CHARS = 254
# No REST equivalent; the confirmation card uses the same numbers.
MAX_TOPIC_CHARS = 200
MAX_TIMES_CHARS = 500

PENDING_TTL_SECONDS = 600
MAX_PENDING_PER_CONNECTION = 5
MAX_ID_CHARS = 64

SEARCH_MAX_QUERY_CHARS = 200
SEARCH_MAX_TERMS = 8
SEARCH_MAX_RESULTS = 5
SEARCH_MAX_SNIPPETS = 3
SEARCH_SNIPPET_CHARS = 320

SEARCH_PORTFOLIO_TOOL = {
    "name": "search_portfolio",
    "description": (
        "Keyword search over Jordan's portfolio data (experience, projects, skills, about). "
        "Use it BEFORE answering any question about specific details, technologies, scope, "
        "team size, agents, ML work or dates, and ground your answer in the snippets it returns. "
        "Returns compact snippets; it never returns anything that is not in the data."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A few keywords, e.g. 'agent harness' or 'classifiers meta'",
            }
        },
        "required": ["query"],
        "additionalProperties": False,
    },
}

EXECUTE_TOOLS: list[dict] = [
    {
        "name": "contact_jordan",
        "description": (
            "Propose sending Jordan an email on the visitor's behalf. This does NOT send anything: "
            "the visitor reviews the draft, enters their own email address and presses Confirm in the UI. "
            "Draft a short, professional subject and message from the conversation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "subject": {"type": "string", "description": "Email subject, at most 150 characters"},
                "message": {"type": "string", "description": "Email body written for Jordan, at most 5000 characters"},
            },
            "required": ["subject", "message"],
            "additionalProperties": False,
        },
    },
    {
        "name": "request_phone",
        "description": (
            "Propose revealing Jordan's phone number. This does NOT reveal it: the visitor must enter "
            "their email address and press Confirm in the UI, and Jordan is notified who asked."
        ),
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "request_meeting",
        "description": (
            "Propose a meeting or call request to Jordan. This does NOT send anything: the visitor "
            "reviews it, enters their own email address and presses Confirm in the UI."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {"type": "string", "description": "What the meeting is about, at most 200 characters"},
                "preferred_times": {
                    "type": "string",
                    "description": "Times or time zone the visitor prefers, at most 500 characters",
                },
            },
            "required": ["topic"],
            "additionalProperties": False,
        },
    },
]

# Everything the model may call. The browser tools are validated again by
# chat_actions.normalize_tool_action before anything reaches the SPA.
ALL_TOOLS: list[dict] = [*CHAT_TOOLS, SEARCH_PORTFOLIO_TOOL, *EXECUTE_TOOLS]

TOOL_KINDS: dict[str, str] = {
    **{tool["name"]: KIND_READ for tool in CHAT_TOOLS},
    "search_portfolio": KIND_READ,
    **{tool["name"]: KIND_EXECUTE for tool in EXECUTE_TOOLS},
}
EXECUTE_TOOL_NAMES = frozenset(name for name, kind in TOOL_KINDS.items() if kind == KIND_EXECUTE)

# ---------------------------------------------------------------------------
# Argument validation

_EMAIL_ADAPTER = TypeAdapter(EmailStr)
_WS_RE = re.compile(r"\s+")


def validate_email(raw: object) -> str | None:
    """Return the normalized address, or None. Same validation as the contact form."""
    if not isinstance(raw, str):
        return None
    candidate = raw.strip()
    if not candidate or len(candidate) > MAX_EMAIL_CHARS:
        return None
    try:
        return str(_EMAIL_ADAPTER.validate_python(candidate))
    except ValidationError:
        return None


def _single_line(value: str) -> str:
    # Header fields must stay single-line: a CR/LF would let a visitor append SMTP headers.
    return _WS_RE.sub(" ", value).strip()


def _text_field(raw: dict, name: str, limit: int, *, single_line: bool, truncate: bool, required: bool) -> str | None:
    """Return the cleaned field, "" when optional and absent, or None when invalid."""
    value = raw.get(name)
    if value is None and not required:
        return ""
    if not isinstance(value, str):
        return None
    cleaned = _single_line(value) if single_line else value.strip()
    if not cleaned:
        return None if required else ""
    if len(cleaned) > limit:
        if not truncate:
            return None
        cleaned = cleaned[:limit].rstrip()
    return cleaned


def validate_execute_args(tool: str, raw: object, *, truncate: bool) -> dict | None:
    """Validate and bound the arguments of an execute-type tool.

    ``truncate`` is for the model's proposal (a draft that is a little long is
    trimmed); the visitor's confirmed values are never trimmed silently, so
    over-long ones are rejected instead. Unknown keys are dropped.
    """
    payload = raw if isinstance(raw, dict) else {}
    if tool == "request_phone":
        return {}
    if tool == "contact_jordan":
        subject = _text_field(payload, "subject", MAX_SUBJECT_CHARS, single_line=True, truncate=truncate, required=True)
        message = _text_field(payload, "message", MAX_MESSAGE_CHARS, single_line=False, truncate=truncate, required=True)
        if subject is None or message is None:
            return None
        return {"subject": subject, "message": message}
    if tool == "request_meeting":
        topic = _text_field(payload, "topic", MAX_TOPIC_CHARS, single_line=True, truncate=truncate, required=True)
        times = _text_field(
            payload, "preferred_times", MAX_TIMES_CHARS, single_line=True, truncate=truncate, required=False
        )
        if topic is None or times is None:
            return None
        return {"topic": topic, "preferred_times": times}
    return None


# ---------------------------------------------------------------------------
# Pending actions

# Indirection so tests can move the clock.
_now = time.monotonic


@dataclass
class PendingAction:
    id: str
    tool: str
    args: dict
    expires_at: float


@dataclass
class PendingActions:
    """Pending execute-type actions for ONE connection.

    The manager keeps one of these per client id and drops it on disconnect,
    which is what binds an id to its connection: another socket has no store
    containing it.
    """

    items: dict[str, PendingAction] = field(default_factory=dict)

    def _purge(self) -> None:
        now = _now()
        for key in [k for k, v in self.items.items() if v.expires_at <= now]:
            del self.items[key]

    def create(self, tool: str, args: dict) -> PendingAction | None:
        """New pending action, or None when this connection already has too many."""
        self._purge()
        if len(self.items) >= MAX_PENDING_PER_CONNECTION:
            return None
        action = PendingAction(
            id=secrets.token_urlsafe(18), tool=tool, args=args, expires_at=_now() + PENDING_TTL_SECONDS
        )
        self.items[action.id] = action
        return action

    def take(self, action_id: object) -> tuple[PendingAction | None, str]:
        """Consume an id. Returns (action, "") or (None, "unknown" | "expired").

        Single use: a found id is removed whether or not the caller then
        succeeds, so a replayed frame always lands on "unknown".
        """
        if not isinstance(action_id, str) or not action_id or len(action_id) > MAX_ID_CHARS:
            return None, "unknown"
        action = self.items.pop(action_id, None)
        if action is None:
            return None, "unknown"
        if action.expires_at <= _now():
            return None, "expired"
        return action, ""


def pending_tool_result(action: PendingAction | None) -> dict:
    """What the model is told after proposing an execute-type tool."""
    if action is None:
        return {
            "status": "not_created",
            "note": (
                "Too many requests are already waiting for the visitor. Ask them to confirm or "
                "cancel the existing card first. Nothing was sent."
            ),
        }
    return {
        "status": "pending_visitor_confirmation",
        "note": (
            "Nothing has been sent or revealed. A confirmation card is shown to the visitor, who must "
            "enter their email and press Confirm. Do not claim success. Tell them to review the card; "
            "you will be told the outcome."
        ),
    }


# ---------------------------------------------------------------------------
# search_portfolio

_STOPWORDS = frozenset(
    "a an and are as at be by did do does for from has have how i in is it its jordan jordans kail me of on or "
    "tell that the their this to was were what when where which who why with work worked about his he him you your "
    "can could would should any some more most".split()
)
_TERM_RE = re.compile(r"[a-z0-9][a-z0-9.+#-]*")
_TITLE_FIELDS = ("company", "title", "display_name", "name")
_SKIP_FIELDS = frozenset({
    "link", "weblink", "image", "logoPath", "full_portrait", "resume_name", "last_commit", "phone", "email",
})
_COLLECTION_ORDER = ("experience", "projects", "skills", "about_me")


def _search_terms(query: object) -> list[str]:
    if not isinstance(query, str):
        return []
    terms: list[str] = []
    for term in _TERM_RE.findall(query[:SEARCH_MAX_QUERY_CHARS].lower()):
        term = term.strip(".+#-") or term
        if term and term not in _STOPWORDS and term not in terms:
            terms.append(term)
    return terms[:SEARCH_MAX_TERMS]


def _leaves(value: object, field_name: str = ""):
    """Yield (field, text) string leaves of a JSON value, skipping non-content fields."""
    if field_name in _SKIP_FIELDS:
        return
    if isinstance(value, str):
        if value.strip():
            yield field_name, value.strip()
    elif isinstance(value, dict):
        for key, sub in value.items():
            yield from _leaves(sub, str(key))
    elif isinstance(value, list | tuple):
        for sub in value:
            yield from _leaves(sub, field_name)


def _word_hits(text: str, term: str) -> int:
    return len(re.findall(rf"(?<![a-z0-9]){re.escape(term)}", text.lower()))


def _snippet(text: str, terms: list[str]) -> str:
    if len(text) <= SEARCH_SNIPPET_CHARS:
        return text
    lowered = text.lower()
    positions = [p for p in (lowered.find(t) for t in terms) if p >= 0]
    start = max(0, (min(positions) if positions else 0) - 80)
    piece = text[start:start + SEARCH_SNIPPET_CHARS].strip()
    return ("..." if start else "") + piece + "..."


def _collections() -> dict[str, dict]:
    # Imported lazily: the models package pulls in FastAPI and the data files.
    from backend.app.models import get_all_models

    models = get_all_models()
    out: dict[str, dict] = {}
    for name in _COLLECTION_ORDER:
        model = models.get(name)
        if model is None:
            continue
        data = model.model_dump(mode="json")
        out[name] = data["root"] if isinstance(data, dict) and set(data) == {"root"} else data
    return out


def search_portfolio(query: object) -> dict:
    """Bounded keyword search over experience, projects, skills and about.

    Returns up to 5 entries with up to 3 short snippets each, plus the
    ``open_modal`` kind/key the assistant can use to show the entry. Every
    string comes straight from the portfolio data.
    """
    terms = _search_terms(query)
    if not terms:
        return {"results": [], "note": "Give a few specific keywords to search for."}

    scored: list[tuple[int, int, dict]] = []
    for order, (collection, entries) in enumerate(_collections().items()):
        # about_me is a single record, the others are keyed collections.
        items = entries.items() if collection != "about_me" else [("about", entries)]
        for key, entry in items:
            title = ""
            matches: list[tuple[int, str]] = []
            for field_name, text in _leaves(entry):
                if not title and field_name in _TITLE_FIELDS:
                    title = text
                hits = sum(_word_hits(text, term) for term in terms)
                if hits:
                    weight = 3 if field_name in _TITLE_FIELDS or field_name == "tags" else 1
                    matches.append((hits * weight, text))
            if not matches:
                continue
            score = sum(m[0] for m in matches)
            if any(_word_hits(title, term) for term in terms):
                score += 5
            matches.sort(key=lambda m: -m[0])
            result = {
                "source": collection,
                "key": str(key),
                "title": title or str(key),
                "snippets": [_snippet(text, terms) for _, text in matches[:SEARCH_MAX_SNIPPETS]],
            }
            scored.append((score, -order, result))

    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    results = [item[2] for item in scored[:SEARCH_MAX_RESULTS]]
    if not results:
        return {"results": [], "note": "Nothing in the portfolio data matches those keywords."}
    return {"results": results}


# ---------------------------------------------------------------------------
# Execution of a confirmed action

GENERIC_FAILURE = "I couldn't do that right now. Please use the contact form instead."
INVALID_EMAIL = "That email address doesn't look valid. Please check it and ask me again."
INVALID_ARGS = "Those details couldn't be used. Please shorten them and ask me again."
UNKNOWN_ACTION = "That request is no longer available. Please ask me again."
EXPIRED_ACTION = "That request expired. Please ask me again."
RATE_LIMITED = "Too many requests from this location. Please try again later."
PHONE_UNAVAILABLE = "Phone number is not available right now; please use the contact form."


@dataclass
class ActionOutcome:
    ok: bool
    message: str
    phone: str | None = None
    # Short, PII-free note appended to the model's history.
    note: str = ""


def _limiters():
    # Resolved at call time from the REST module so the chat tools share the
    # exact limiter instances (and test patches) the contact routes use.
    from backend.app.api import contact_routes

    return contact_routes._email_limiter, contact_routes._phone_limiter


async def execute_confirmed(tool: str, args: dict, email_raw: object, ip: str) -> ActionOutcome:
    """Run an execute-type tool the visitor confirmed. Never raises."""
    email = validate_email(email_raw)
    if email is None:
        return ActionOutcome(False, INVALID_EMAIL, note="the email address was invalid, nothing was sent")
    clean = validate_execute_args(tool, args, truncate=False)
    if clean is None:
        return ActionOutcome(False, INVALID_ARGS, note="the details were invalid, nothing was sent")

    email_limiter, phone_limiter = _limiters()
    limiter = phone_limiter if tool == "request_phone" else email_limiter
    if not limiter.allow(ip):
        limiter.report_blocked()
        return ActionOutcome(False, RATE_LIMITED, note="the request was rate limited, nothing was sent")

    if tool == "request_phone":
        return await _execute_phone(email)
    return await _execute_mail(tool, clean, email)


async def _execute_mail(tool: str, args: dict, email: str) -> ActionOutcome:
    if tool == "contact_jordan":
        subject = f"Jordan Kail: {args['subject']}"
        body = args["message"]
        text = f"From: {email}\n\n{body}\n\n(Sent from the portfolio AI assistant after the visitor confirmed it.)"
        markup = (
            f"<p><strong>From:</strong> {html.escape(email)}</p><p>{html.escape(body)}</p>"
            "<p><em>Sent from the portfolio AI assistant after the visitor confirmed it.</em></p>"
        )
        purpose = "assistant contact email"
    else:
        topic, times = args["topic"], args["preferred_times"]
        subject = f"Meeting request via portfolio: {topic}"
        text = (
            f"From: {email}\n\nMeeting request via the portfolio AI assistant.\n"
            f"Topic: {topic}\nPreferred times: {times or 'not given'}\n"
        )
        markup = (
            f"<p><strong>From:</strong> {html.escape(email)}</p>"
            f"<p>Meeting request via the portfolio AI assistant.</p>"
            f"<p><strong>Topic:</strong> {html.escape(topic)}<br>"
            f"<strong>Preferred times:</strong> {html.escape(times or 'not given')}</p>"
        )
        purpose = "assistant meeting request"
    try:
        await send_owner_mail(subject=subject, plain_text=text, html=markup, reply_to=email, purpose=purpose)
    except OwnerMailNotConfigured:
        log_event("contact.failed", reason="not_configured")
        return ActionOutcome(False, GENERIC_FAILURE, note="sending failed, nothing was sent")
    except OwnerMailFailed:
        log_event("contact.failed", reason="send_failed")
        return ActionOutcome(False, GENERIC_FAILURE, note="sending failed, nothing was sent")
    log_event("contact.sent")
    if tool == "contact_jordan":
        return ActionOutcome(True, "Sent. Jordan will reply to the email address you gave.", note="the email was sent")
    return ActionOutcome(
        True, "Sent. Jordan will reply to the email address you gave.", note="the meeting request was sent"
    )


async def _execute_phone(email: str) -> ActionOutcome:
    settings = get_settings()
    log_event("phone.requested")
    if not settings.contact_phone:
        log_event("phone.failed", reason="unavailable")
        return ActionOutcome(False, PHONE_UNAVAILABLE, note="the phone number is not available")
    if not owner_mail_configured():
        logger.error("Phone reveal requested but email notification is not configured")
        log_event("phone.failed", reason="not_configured")
        return ActionOutcome(False, PHONE_UNAVAILABLE, note="the phone number is not available")

    requested_at = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    try:
        await send_owner_mail(
            subject="Phone number requested via portfolio",
            plain_text=(
                "Someone asked for your phone number through the portfolio AI assistant.\n\n"
                f"Requester email: {email}\nRequested at: {requested_at}\n"
            ),
            html=(
                "<p>Someone asked for your phone number through the portfolio AI assistant.</p>"
                f"<p><strong>Requester email:</strong> {html.escape(email)}<br>"
                f"<strong>Requested at:</strong> {html.escape(requested_at)}</p>"
            ),
            reply_to=email,
            purpose="phone request notification",
        )
    except (OwnerMailNotConfigured, OwnerMailFailed):
        log_event("phone.failed", reason="send_failed")
        return ActionOutcome(False, GENERIC_FAILURE, note="the notification failed, the number was not shared")

    log_event("phone.revealed")
    return ActionOutcome(
        True,
        "Here is Jordan's number. He has been told who asked.",
        phone=settings.contact_phone,
        note="the phone number was shown to the visitor in the UI",
    )
