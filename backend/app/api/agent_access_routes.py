"""Recruiter entry gate: notify the owner before issuing chat access."""
import asyncio
import html
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from backend.app.config import get_settings
from backend.app.services.agent_access import configured, issue_access, verify_access
from backend.app.services.agent_trial import TrialLimited, TrialUnavailable, issue_trial, trial_remaining, verify_trial
from backend.app.services.owner_mail import OwnerMailFailed, OwnerMailNotConfigured, send_owner_mail
from backend.app.utils.events import log_event
from backend.app.utils.rate_limit import SlidingWindowLimiter, client_ip, enforce_rate_limit

router = APIRouter(prefix="/agent")
_access_limiter = SlidingWindowLimiter(max_events=3, window_seconds=3600, global_max_events=60, name="agent_access")
_NO_STORE = {"Cache-Control": "no-store"}
_trial_limiter = SlidingWindowLimiter(max_events=6, window_seconds=3600, global_max_events=120, name="agent_trial")


class AccessRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr = Field(max_length=254)
    company: str = Field(min_length=1, max_length=160)

    @field_validator("company")
    @classmethod
    def clean_company(cls, value: str) -> str:
        value = re.sub(r"\s+", " ", value).strip()
        if not value or any(ord(c) < 32 for c in value):
            raise ValueError("Enter a company or organization")
        return value


def _expires_at(expires: int) -> str:
    return datetime.fromtimestamp(expires, UTC).isoformat()


@router.post("/access")
async def request_access(body: AccessRequest, request: Request, response: Response):
    response.headers.update(_NO_STORE)
    enforce_rate_limit(_access_limiter, request, detail="Please wait before requesting access again.", headers=_NO_STORE)
    # This user explicitly selected this inbox. Do not silently notify a
    # different deployment administrator and claim the requested flow works.
    if not configured() or get_settings().admin_email.lower() != "jckail13@gmail.com":
        raise HTTPException(503, "Agent access is temporarily unavailable. Please use the contact form.", headers=_NO_STORE)
    email = str(body.email)
    try:
        async with asyncio.timeout(15):
            await send_owner_mail(
                subject="Portfolio agent: new visitor",
                plain_text=f"A visitor requested access to your portfolio assistant.\n\nEmail: {email}\nCompany: {body.company}\n\nThese are visitor-submitted details, not verified identity or employment.",
                html=f"<p>A visitor requested access to your portfolio assistant.</p><p>Email: {html.escape(email)}<br>Company: {html.escape(body.company)}</p><p>Visitor-submitted details; identity and employment are not verified.</p>",
                reply_to=email, purpose="agent access notification",
            )
    except (OwnerMailFailed, OwnerMailNotConfigured, TimeoutError):
        log_event("agent.access_failed", reason="notification_unavailable")
        raise HTTPException(502, "Unable to notify Jordan right now. Please try again or use the contact form.", headers=_NO_STORE)
    token, expires = issue_access()
    log_event("agent.access_granted")
    return {"token": token, "expires_at": _expires_at(expires), "mode": "full"}


@router.get("/access")
async def check_access(response: Response, authorization: str = Header(default="")):
    response.headers.update(_NO_STORE)
    token = authorization.removeprefix("Bearer ") if authorization.startswith("Bearer ") else ""
    expires = verify_access(token)
    if expires is None:
        trial = verify_trial(token)
        if trial:
            try:
                remaining = await trial_remaining(trial[0])
            except TrialUnavailable:
                raise HTTPException(503, "Trial access is temporarily unavailable.", headers=_NO_STORE)
            if remaining is not None:
                return {"valid": True, "expires_at": _expires_at(trial[1]), "mode": "trial",
                        "remaining_messages": remaining}
        raise HTTPException(401, "Enter your email and company to use the assistant.", headers=_NO_STORE)
    return {"valid": True, "expires_at": _expires_at(expires), "mode": "full"}


@router.post("/trial")
async def request_trial(request: Request, response: Response):
    response.headers.update(_NO_STORE)
    enforce_rate_limit(_trial_limiter, request, detail="Please introduce yourself to continue.", headers=_NO_STORE)
    try:
        receipt = await issue_trial(client_ip(request))
    except TrialLimited:
        raise HTTPException(429, "Please enter your email and company to continue.", headers=_NO_STORE)
    except TrialUnavailable:
        raise HTTPException(503, "Trial access is temporarily unavailable. Please introduce yourself to continue.", headers=_NO_STORE)
    return {"token": receipt["token"], "expires_at": _expires_at(receipt["expires"]), "mode": "trial",
            "remaining_messages": receipt["remaining_messages"]}
