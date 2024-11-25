import base64
import json
import os
import logging
from typing import Union, Tuple
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email(message_data: dict) -> Union[Tuple[str, int], str]:
    """
    Shared email sending function that can be used by both cloud functions and local API.
    Args:
        message_data (dict): Dictionary containing email details (to, from, subject, text)
    Returns:
        Union[Tuple[str, int], str]: Success message and status code for cloud function,
                                   or just success message for local use
    """
    try:
        admin_email = os.environ.get('ADMIN_EMAIL')
        if not admin_email:
            raise ValueError("ADMIN_EMAIL environment variable is not set")

        # Create SendGrid mail object
        message = Mail(
            from_email=Email(admin_email),
            to_emails=[
                To(message_data['to']),
                To(message_data['from'])
            ],
            subject=message_data['subject'],
            plain_text_content=Content(
                "text/plain", 
                f"From: {message_data['from']}\n\n{message_data['text']}"
            )
        )
        
        # Set reply-to header
        message.reply_to = Email(message_data['from'])

        # Initialize SendGrid client
        sg = SendGridAPIClient(os.environ.get('SMTP_PASSWORD'))
        
        # Send the email
        response = sg.send(message)
        
        # Check if the email was sent successfully
        if response.status_code in [200, 201, 202]:
            success_msg = f"Email sent successfully to {message_data['to']}"
            logger.info(success_msg)
            
            # Return appropriate response based on context
            if os.environ.get('ENVIRONMENT') == 'cloud_function':
                return (success_msg, 200)
            return success_msg
        else:
            raise Exception(f"SendGrid API returned status code: {response.status_code}")

    except Exception as e:
        error_message = f"Error sending email: {str(e)}"
        logger.error(error_message)
        
        # Return appropriate error response based on context
        if os.environ.get('ENVIRONMENT') == 'cloud_function':
            return (error_message, 500)
        raise Exception(error_message)

def handle_cloud_event(cloud_event) -> Tuple[str, int]:
    """
    Handler specifically for cloud function events.
    Args:
        cloud_event: The Cloud Event containing the Pub/Sub message.
    Returns:
        Tuple[str, int]: A tuple of (response message, status code)
    """
    try:
        # Extract the message data from the Pub/Sub event
        pubsub_data = base64.b64decode(cloud_event.data["message"]["data"]).decode()
        message_data = json.loads(pubsub_data)
        
        # Set environment for appropriate return type
        os.environ['ENVIRONMENT'] = 'cloud_function'
        
        return send_email(message_data)
        
    except Exception as e:
        error_message = f"Error processing cloud event: {str(e)}"
        logger.error(error_message)
        return (error_message, 500)
