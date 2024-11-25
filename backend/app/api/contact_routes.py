from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, EmailStr
from google.cloud import pubsub_v1
import json
import os
import logging
from ..models import Contact
from ..models.data_loader import load_contact
from ..utils.email_function import send_email

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
    Send an email using Google Cloud Pub/Sub in production or direct SMTP in local development.
    """
    try:
        admin_email = os.environ.get('ADMIN_EMAIL')
        if not admin_email:
            raise ValueError("ADMIN_EMAIL environment variable is not set")

        # Create message payload
        message = {
            "to": admin_email,
            "from": email_data.from_email,
            "subject": email_data.subject,
            "text": email_data.message
        }

        # Check if we're in local development
        if os.environ.get('ENVIRONMENT') != 'production':
            logger.info("Using direct SMTP for local development")
            result = send_email(message)
            return {
                "message": result,
            }
        
        # Production: Use Pub/Sub
        logger.info("Using Pub/Sub for production environment")
        publisher = pubsub_v1.PublisherClient()
        topic_path = publisher.topic_path(
            "portfolio-383615",  # Project ID
            "portfolio-contact-emails"  # Topic name
        )

        # Convert message to bytes
        message_bytes = json.dumps(message).encode('utf-8')

        # Publish message
        future = publisher.publish(topic_path, message_bytes)
        message_id = future.result()

        return {
            "message": "Email notification sent successfully via Pub/Sub",
            "message_id": message_id
        }
    except Exception as e:
        error_msg = f"Failed to send email: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )
