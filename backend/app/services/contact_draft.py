"""Reviewed, deterministic introductions. No model call or visitor data required."""
from typing import Literal

ContactIntent = Literal["opportunity", "collaboration", "question"]
MAX_DRAFT_CHARS = 1200
REVIEWED_DRAFTS = {
    "opportunity": "Hi Jordan, I would like to discuss an engineering opportunity involving AI agents and platforms. Could we connect to explore whether the role is a good match?",
    "collaboration": "Hi Jordan, I would like to explore a collaboration related to AI agents or engineering platforms. Could we discuss the idea and where our interests overlap?",
    "question": "Hi Jordan, I would like to learn more about your engineering experience and projects. Could we connect to discuss a few questions?",
}


class DraftUnavailable(Exception):
    """The requested introduction is not available."""


async def recommend_contact_message(intent: ContactIntent) -> str:
    """Reuse reviewed copy for each intent; the visitor edits before sending."""
    try:
        return REVIEWED_DRAFTS[intent]
    except KeyError:
        raise DraftUnavailable() from None
