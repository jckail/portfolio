from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, EmailStr
import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from ..models import Contact
from ..models.data_loader import load_contact

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact")

class EmailMessage(BaseModel):
    from_email: EmailStr
    subject: str
    message: str

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-email")
async def handle_email(email_data: EmailMessage = Body(...)):
    """
    Send an email using SendGrid API directly.
    """
    try:
        admin_email = os.environ.get('ADMIN_EMAIL')
        if not admin_email:
            raise ValueError("ADMIN_EMAIL environment variable is not set")

        sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
        if not sendgrid_api_key:
            raise ValueError("SENDGRID_API_KEY environment variable is not set")

        # Create the email message using the verified sender email
        message = Mail(
            from_email='assistant@jordan-kail.com',  # Using verified sender email
            to_emails=[email_data.from_email,admin_email],
            subject=f"Jordan Kail: {email_data.subject}",
            plain_text_content=f"From: {email_data.from_email}\n\n{email_data.message}",
            html_content=f"<p><strong>From:</strong> {email_data.from_email}</p><p>{email_data.message}</p>"
        )

        # Send the email using SendGrid
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Email sent successfully from {email_data.from_email}")
            return {
                "message": "Email sent successfully",
                "status_code": response.status_code
            }
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"SendGrid API returned status code: {response.status_code}"
            )

    except ValueError as ve:
        logger.error(f"Configuration error: {str(ve)}")
        raise HTTPException(
            status_code=500,
            detail=str(ve)
        )
    except Exception as e:
        error_msg = f"Failed to send email: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )
