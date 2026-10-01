"""Notify the site owner by email through SendGrid.

Both public mail paths (the contact form and the phone reveal) send to the
configured admin address only, never to a visitor-supplied one; the visitor
is set as Reply-To instead. That rule lives here so neither route can drift
into an open relay.
"""
import asyncio
import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..config import get_settings

logger = logging.getLogger(__name__)


class OwnerMailNotConfigured(Exception):
    """ADMIN_EMAIL or SENDGRID_API_KEY is empty."""


class OwnerMailFailed(Exception):
    """SendGrid raised or answered with a non-2xx status."""


def owner_mail_configured() -> bool:
    settings = get_settings()
    return bool(settings.admin_email and settings.sendgrid_api_key)


async def send_owner_mail(
    *, subject: str, plain_text: str, html: str, reply_to: str, purpose: str
) -> int:
    """Send one message to ADMIN_EMAIL and return SendGrid's 2xx status, or raise.

    ``html`` must already be escaped by the caller. ``purpose`` labels the log
    lines; it is never visitor input.
    """
    settings = get_settings()
    if not owner_mail_configured():
        raise OwnerMailNotConfigured

    try:
        message = Mail(
            from_email=settings.contact_sender_email,
            to_emails=[settings.admin_email],
            subject=subject,
            plain_text_content=plain_text,
            html_content=html,
        )
        message.reply_to = reply_to
        # The SendGrid client is synchronous; inline it would stall every other
        # request (and chat stream) on this worker for the whole HTTP call.
        client = SendGridAPIClient(settings.sendgrid_api_key)
        response = await asyncio.to_thread(client.send, message)
    except Exception as exc:
        # Provider exception text can carry account and response internals.
        logger.exception("Failed to send %s", purpose)
        raise OwnerMailFailed from exc

    if not 200 <= response.status_code < 300:
        logger.error("SendGrid returned status %s for %s", response.status_code, purpose)
        raise OwnerMailFailed

    logger.info("%s delivered", purpose.capitalize())
    return response.status_code
