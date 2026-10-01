import html
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Body, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from ..config import get_settings
from ..models import Contact
from ..models.contact import PhoneNumber
from ..services.owner_mail import OwnerMailFailed, OwnerMailNotConfigured, owner_mail_configured, send_owner_mail
from ..utils.rate_limit import SlidingWindowLimiter, enforce_rate_limit
from .content import collection_payload, payload_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact")

# The contact form is unauthenticated and spends real SendGrid quota, so it is
# limited far more tightly than a read endpoint. A person filling in the form
# sends one message; anything past a handful an hour is abuse.
_email_limiter = SlidingWindowLimiter(max_events=3, window_seconds=3600, global_max_events=60)
# Revealing the phone number also sends Jordan a notification through SendGrid,
# and the number itself is what a scraper wants, so it gets its own budget at
# the same tight rate rather than sharing (and draining) the contact form's.
_phone_limiter = SlidingWindowLimiter(max_events=3, window_seconds=3600, global_max_events=60)

EMAIL_SEND_FAILED_DETAIL = "Unable to send message right now"
PHONE_UNAVAILABLE_DETAIL = "Phone number is not available right now; please use the contact form."
PHONE_SEND_FAILED_DETAIL = "Unable to share the phone number right now; please use the contact form."
_NO_STORE = {"Cache-Control": "no-store"}


class EmailMessage(BaseModel):
    from_email: EmailStr
    # Bounded so a single request cannot push an arbitrarily large payload
    # through SendGrid or into the logs.
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=5000)


class EmailSent(BaseModel):
    message: str
    status_code: int


class PhoneRequest(BaseModel):
    # Same validation as the contact form's from_email. EmailStr already
    # rejects anything over 254 characters; the explicit cap documents it.
    email: EmailStr = Field(..., max_length=254)


@router.get("/info", response_model=Contact)
async def get_contact(request: Request) -> Response:
    """Public contact details (pre-rendered; see content.py)."""
    return payload_response(request, collection_payload("contact"))


@router.post("/send-email", response_model=EmailSent)
async def handle_email(request: Request, email_data: EmailMessage = Body(...)) -> EmailSent:
    """Deliver a contact-form submission to the site owner.

    The submitter never controls the recipient list: mail goes only to the
    configured admin address, with the visitor's address set as Reply-To. This
    endpoint is public, so treating `from_email` as a destination would turn a
    domain-verified sender into an open relay for phishing.
    """
    enforce_rate_limit(
        _email_limiter, request,
        detail="Too many messages sent from this location. Please try again later.",
    )

    sender = str(email_data.from_email)
    # Header fields must stay single-line: a CR/LF here would let a submitter
    # append their own SMTP headers.
    safe_subject = email_data.subject.replace("\r", " ").replace("\n", " ").strip()
    try:
        # Both bodies are built from visitor-supplied text, so the HTML
        # variant is escaped rather than interpolated raw.
        status_code = await send_owner_mail(
            subject=f"Jordan Kail: {safe_subject}",
            plain_text=f"From: {sender}\n\n{email_data.message}",
            html=(
                f"<p><strong>From:</strong> {html.escape(sender)}</p>"
                f"<p>{html.escape(email_data.message)}</p>"
            ),
            reply_to=sender,
            purpose="contact form email",
        )
    except OwnerMailNotConfigured:
        logger.error("Contact form submitted but ADMIN_EMAIL or SENDGRID_API_KEY is not set")
        raise HTTPException(status_code=500, detail="Email is not configured on this server")
    except OwnerMailFailed:
        raise HTTPException(status_code=502, detail=EMAIL_SEND_FAILED_DETAIL)

    return EmailSent(message="Email sent successfully", status_code=status_code)


@router.post("/phone", response_model=PhoneNumber)
async def request_phone(
    request: Request, response: Response, body: PhoneRequest = Body(...)
) -> PhoneNumber:
    """Reveal the phone number to a visitor who leaves their email address.

    The number is not in the public contact payload or in git. Each reveal
    first notifies the site owner with the requester's address; the number is
    returned only if that notification was accepted, so every disclosure is
    on record.
    """
    # Per-visitor and must never sit in a shared or browser cache.
    response.headers.update(_NO_STORE)

    enforce_rate_limit(
        _phone_limiter, request,
        detail="Too many requests from this location. Please try again later.",
        headers=_NO_STORE,
    )

    settings = get_settings()
    # Checked before anything is sent: no notification for a number we
    # cannot hand out.
    if not settings.contact_phone:
        raise HTTPException(status_code=503, detail=PHONE_UNAVAILABLE_DETAIL, headers=_NO_STORE)
    if not owner_mail_configured():
        logger.error("Phone reveal requested but email notification is not configured")
        raise HTTPException(status_code=503, detail=PHONE_UNAVAILABLE_DETAIL, headers=_NO_STORE)

    requester = str(body.email)
    requested_at = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    try:
        await send_owner_mail(
            subject="Phone number requested via portfolio",
            plain_text=(
                "Someone asked for your phone number on the portfolio site.\n\n"
                f"Requester email: {requester}\n"
                f"Requested at: {requested_at}\n"
            ),
            html=(
                "<p>Someone asked for your phone number on the portfolio site.</p>"
                f"<p><strong>Requester email:</strong> {html.escape(requester)}<br>"
                f"<strong>Requested at:</strong> {html.escape(requested_at)}</p>"
            ),
            reply_to=requester,
            purpose="phone request notification",
        )
    except (OwnerMailNotConfigured, OwnerMailFailed):
        raise HTTPException(status_code=502, detail=PHONE_SEND_FAILED_DETAIL, headers=_NO_STORE)

    return PhoneNumber(phone=settings.contact_phone)
