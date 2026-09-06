import html
import logging

from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..config import get_settings
from ..models import Contact
from ..models.data_loader import load_contact
from ..utils.rate_limit import SlidingWindowLimiter, client_ip

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact")

# The contact form is unauthenticated and spends real SendGrid quota, so it is
# limited far more tightly than a read endpoint. A person filling in the form
# sends one message; anything past a handful an hour is abuse.
_email_limiter = SlidingWindowLimiter(max_events=3, window_seconds=3600, global_max_events=60)


class EmailMessage(BaseModel):
    from_email: EmailStr
    # Bounded so a single request cannot push an arbitrarily large payload
    # through SendGrid or into the logs.
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=5000)

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

        # Send the email using SendGrid
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)

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
