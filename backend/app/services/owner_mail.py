"""Notify the site owner through the explicitly configured email provider.

Both public mail paths (the contact form and the phone reveal) send to the
configured admin address only, never to a visitor-supplied one; the visitor
is set as Reply-To instead. That rule lives here so neither route can drift
into an open relay.
"""
import asyncio
import logging

import boto3
from botocore.config import Config
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..config import get_settings

logger = logging.getLogger(__name__)


class OwnerMailNotConfigured(Exception):
    """Owner, sender or selected provider configuration is missing."""


class OwnerMailFailed(Exception):
    """The selected provider raised or did not accept the message."""


def owner_mail_configured() -> bool:
    settings = get_settings()
    provider_ready = (
        settings.email_provider == "sendgrid" and bool(settings.sendgrid_api_key)
        or settings.email_provider == "ses" and bool(settings.ses_region)
    )
    return bool(settings.admin_email and settings.contact_sender_email and provider_ready)


def _send_ses(settings, *, subject: str, plain_text: str, html: str, reply_to: str) -> int:
    # Boto3's credential chain supports a scoped role or injected runtime secrets.
    # No developer profile is selected by the application. Disable SDK retries:
    # an ambiguous send failure must never trigger a duplicate notification.
    client = boto3.client("sesv2", region_name=settings.ses_region, config=Config(
        connect_timeout=3, read_timeout=8, retries={"total_max_attempts": 1},
    ))
    response = client.send_email(
        FromEmailAddress=settings.contact_sender_email,
        Destination={"ToAddresses": [settings.admin_email]},
        ReplyToAddresses=[reply_to],
        Content={"Simple": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": plain_text, "Charset": "UTF-8"},
                "Html": {"Data": html, "Charset": "UTF-8"},
            },
        }},
    )
    status = response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
    if not isinstance(status, int) or not 200 <= status < 300 or not response.get("MessageId"):
        raise OwnerMailFailed
    return status


async def send_owner_mail(
    *, subject: str, plain_text: str, html: str, reply_to: str, purpose: str
) -> int:
    """Send one message to ADMIN_EMAIL and return provider acceptance, or raise.

    ``html`` must already be escaped by the caller. ``purpose`` labels the log
    lines; it is never visitor input.
    """
    settings = get_settings()
    if not owner_mail_configured():
        raise OwnerMailNotConfigured

    try:
        if settings.email_provider == "ses":
            status = await asyncio.to_thread(
                _send_ses, settings, subject=subject, plain_text=plain_text, html=html, reply_to=reply_to,
            )
            logger.info("%s accepted by SES", purpose.capitalize())
            return status
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
        logger.error("Failed to send %s through %s (%s)", purpose, settings.email_provider, type(exc).__name__)
        raise OwnerMailFailed from exc

    if not 200 <= response.status_code < 300:
        logger.error("SendGrid returned status %s for %s", response.status_code, purpose)
        raise OwnerMailFailed

    logger.info("%s accepted by SendGrid", purpose.capitalize())
    return response.status_code
