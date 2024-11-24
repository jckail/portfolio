from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, EmailStr
from google.cloud import pubsub_v1
import json
import os
from ..models import Contact
from ..models.data_loader import load_contact

router = APIRouter()

class EmailMessage(BaseModel):
    from_email: EmailStr
    subject: str
    message: str

@router.get("/contact", response_model=Contact)
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

@router.post("/contact/send-email")
async def send_email(email_data: EmailMessage = Body(...)):
    """
    Send an email using Google Cloud Pub/Sub SMTP notification service.
    """
    try:
        # Initialize Pub/Sub publisher client
        publisher = pubsub_v1.PublisherClient()
        topic_path = publisher.topic_path(
            os.getenv("GOOGLE_CLOUD_PROJECT"),
            "portfolio-contact-emails"  # Topic name
        )

        # Create message payload
        message = {
            "to": "jckail13@gmail.com",
            "from": email_data.from_email,
            "subject": email_data.subject,
            "text": email_data.message
        }

        # Convert message to bytes
        message_bytes = json.dumps(message).encode('utf-8')

        # Publish message
        future = publisher.publish(topic_path, message_bytes)
        message_id = future.result()

        return {
            "message": "Email notification sent successfully",
            "message_id": message_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email notification: {str(e)}"
        )
