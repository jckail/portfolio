import asyncio
import html
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Body, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..config import get_settings
from ..models import Contact
from ..models.contact import PhoneNumber
from ..models.data_loader import load_contact
from ..utils.rate_limit import SlidingWindowLimiter, client_ip

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

PHONE_UNAVAILABLE_DETAIL = "Phone number is not available right now; please use the contact form."
_NO_STORE = {"Cache-Control": "no-store"}
PHONE_SEND_FAILED_DETAIL = "Unable to share the phone number right now; please use the contact form."


class EmailMessage(BaseModel):
    from_email: EmailStr
    # Bounded so a single request cannot push an arbitrarily large payload
    # through SendGrid or into the logs.
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=5000)


class PhoneRequest(BaseModel):
    # Same validation as the contact form's from_email. EmailStr already
    # rejects anything over 254 characters; the explicit cap documents it.
    email: EmailStr = Field(..., max_length=254)


@router.get("/info", response_model=Contact)
async def get_contact() -> Contact:
    """
    Get all contact information.
    Returns Contact model with all contact details.
    """
    try:
        contact = load_contact()
        return contact
    except HTTPException as he:
        raise he
    except Exception:
        logger.exception("Failed to load contact info")
        raise HTTPException(status_code=500, detail="Unable to load contact information")

@router.post("/send-email")
async def handle_email(request: Request, email_data: EmailMessage = Body(...)):
    """Deliver a contact-form submission to the site owner.

    The submitter never controls the recipient list: mail goes only to the
    configured admin address, with the visitor's address set as Reply-To. This
    endpoint is public, so treating `from_email` as a destination would turn a
    domain-verified sender into an open relay for phishing.
    """
    if not _email_limiter.allow(client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Too many messages sent from this location. Please try again later.",
        )

    try:
        settings = get_settings()
        if not settings.admin_email:
            raise ValueError("ADMIN_EMAIL environment variable is not set")

        if not settings.sendgrid_api_key:
            raise ValueError("SENDGRID_API_KEY environment variable is not set")

        # Header fields must stay single-line: a CR/LF here would let a
        # submitter append their own SMTP headers.
        safe_subject = email_data.subject.replace("\r", " ").replace("\n", " ").strip()

        # Both bodies are built from visitor-supplied text, so the HTML variant
        # is escaped rather than interpolated raw.
        message = Mail(
            from_email=settings.contact_sender_email,
            to_emails=[settings.admin_email],
            subject=f"Jordan Kail: {safe_subject}",
            plain_text_content=f"From: {email_data.from_email}\n\n{email_data.message}",
            html_content=(
                f"<p><strong>From:</strong> {html.escape(str(email_data.from_email))}</p>"
                f"<p>{html.escape(email_data.message)}</p>"
            ),
        )
        # Lets a reply go straight back to the visitor without ever addressing
        # the outbound message to them.
        message.reply_to = str(email_data.from_email)

        # Send the email using SendGrid. The client is synchronous; running it
        # inline would stall every other request (and chat stream) on this
        # worker for the length of the HTTP call.
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = await asyncio.to_thread(sg.send, message)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info("Contact form email delivered")
            return {
                "message": "Email sent successfully",
                "status_code": response.status_code
            }

        logger.error("SendGrid returned status %s", response.status_code)
        raise HTTPException(status_code=502, detail="Unable to send message right now")

    except HTTPException:
        raise
    except ValueError as ve:
        logger.error(f"Configuration error: {str(ve)}")
        raise HTTPException(
            status_code=500,
            detail="Email is not configured on this server",
        )
    except Exception:
        # Provider exception text can carry account and response internals.
        logger.exception("Failed to send contact email")
        raise HTTPException(
            status_code=502,
            detail="Unable to send message right now",
        )


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

    if not _phone_limiter.allow(client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail="Too many requests from this location. Please try again later.",
            headers=_NO_STORE,
        )

    settings = get_settings()
    # Checked before anything is sent: no notification for a number we
    # cannot hand out.
    if not settings.contact_phone:
        raise HTTPException(status_code=503, detail=PHONE_UNAVAILABLE_DETAIL, headers=_NO_STORE)
    if not settings.admin_email or not settings.sendgrid_api_key:
        logger.error("Phone reveal requested but email notification is not configured")
        raise HTTPException(status_code=503, detail=PHONE_UNAVAILABLE_DETAIL, headers=_NO_STORE)

    requester = str(body.email)
    requested_at = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    message = Mail(
        from_email=settings.contact_sender_email,
        to_emails=[settings.admin_email],
        subject="Phone number requested via portfolio",
        plain_text_content=(
            "Someone asked for your phone number on the portfolio site.\n\n"
            f"Requester email: {requester}\n"
            f"Requested at: {requested_at}\n"
        ),
        html_content=(
            "<p>Someone asked for your phone number on the portfolio site.</p>"
            f"<p><strong>Requester email:</strong> {html.escape(requester)}<br>"
            f"<strong>Requested at:</strong> {html.escape(requested_at)}</p>"
        ),
    )
    message.reply_to = requester

    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        sg_response = await asyncio.to_thread(sg.send, message)
    except Exception:
        # Provider exception text can carry account and response internals.
        logger.exception("Failed to send phone request notification")
        raise HTTPException(status_code=502, detail=PHONE_SEND_FAILED_DETAIL, headers=_NO_STORE)

    if not 200 <= sg_response.status_code < 300:
        logger.error("SendGrid returned status %s for phone request notification", sg_response.status_code)
        raise HTTPException(status_code=502, detail=PHONE_SEND_FAILED_DETAIL, headers=_NO_STORE)

    logger.info("Phone request notification delivered")
    return PhoneNumber(phone=settings.contact_phone)
