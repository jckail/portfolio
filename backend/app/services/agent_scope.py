"""Cheap pre-inference purpose gate, supplemented by the agent system policy.

This is an abuse filter, not a claim to detect every prompt injection. The
allowlisted tools and server confirmation checks remain the security boundary.
"""
import re
from functools import cache

from backend.app.services.public_context import public_context

SCOPE_REFUSAL = ("I can help with Jordan's experience, projects, skills, potential fit for your team, "
                 "and getting in touch. Please ask a question about Jordan or an opportunity for him.")
_INJECTION = re.compile(
    r"ignore (?:all |the |your |previous |prior |above )*(?:instructions|rules|prompt)|"
    r"(?:reveal|print|show|extract) (?:your |the )?(?:system prompt|secrets|api keys)|"
    r"(?:jailbreak|developer mode|bypass (?:the )?(?:guardrails|restrictions))", re.I)
_UNRELATED = re.compile(
    r"(?:write|generate|debug|implement|solve|translate|rewrite) (?:me |a |an |the |this |my )*"
    r"(?:code|script|program|essay|poem|story|recipe|homework)|"
    r"(?:weather forecast|stock price|sports scores|who won|medical diagnosis)|"
    r"(?:write|generate|debug|implement)\b.{0,60}\b(?:code|script|program)\b", re.I)
_PURPOSE = re.compile(
    r"\b(?:jordan|kail|portfolio|resume|recruit\w*|hiring|hire|role|opportunit\w*|"
    r"company|business|team|experience|skill\w*|project\w*|career|background|"
    r"qualification\w*|education|strength\w*|weakness\w*|fit|contact|reach|"
    r"meeting|calendar|schedule|availability|salary|compensation|relocat\w*|"
    r"remote|facebook|programming languages|together|meta|prove|jobbr|agent\w*|engineering|leadership)\b", re.I)
_FOLLOWUP = re.compile(
    r"^(?:hi|hello|hey|thanks|thank you|yes|no|please continue|continue|tell me more|"
    r"what else|why|how so|can you elaborate|summarize that|give me an example|"
    r"what can you do|what do you do)[.!? ]*$", re.I)


@cache
def _published_terms() -> re.Pattern:
    context = public_context()
    terms = []
    for job in context["experience"]:
        terms.extend([job["company"], *job["technologies"]])
    for project in context["projects"]:
        terms.extend([project["id"], project["title"], *project["technologies"]])
    for group in context["skillGroups"]:
        terms.extend(group["items"])
    # Single-letter technology aliases are too permissive as purpose anchors.
    escaped = [re.escape(term) for term in terms if isinstance(term, str) and len(term) >= 2]
    return re.compile(r"(?<!\w)(?:" + "|".join(escaped) + r")(?!\w)", re.I)


def portfolio_question_allowed(message: str) -> bool:
    if _INJECTION.search(message) or _UNRELATED.search(message):
        return False
    return bool(_PURPOSE.search(message) or _FOLLOWUP.fullmatch(message.strip()) or _published_terms().search(message))
