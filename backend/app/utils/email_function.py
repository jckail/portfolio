import base64
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Union, Tuple

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

        # Create the email message
        msg = MIMEMultipart()
        msg['From'] = os.environ.get('SMTP_USERNAME', admin_email)
        msg['To'] = f"{message_data['to']}, {message_data['from']}"
        msg['Subject'] = f"Jordan Kail: {message_data['subject']}"
        
        # Add reply-to header with sender's email
        msg.add_header('Reply-To', message_data['from'])

        # Create the email body with both sender's email and message
        body = f"From: {message_data['from']}\n\n{message_data['text']}"
        msg.attach(MIMEText(body, 'plain'))

        # Set up the SMTP server
        server = smtplib.SMTP(os.environ.get('SMTP_SERVER', 'smtp.gmail.com'), 
                            int(os.environ.get('SMTP_PORT', 587)))
        server.starttls()
        
        # Login to the SMTP server
        smtp_password = os.environ.get('SMTP_PASSWORD')
        if not smtp_password:
            raise ValueError("SMTP_PASSWORD environment variable is not set")
            
        server.login(os.environ.get('SMTP_USERNAME', admin_email),
                    smtp_password)

        # Send the email
        server.send_message(msg)
        server.quit()

        success_msg = f"Email sent successfully to {message_data['to']}"
        logger.info(success_msg)
        
        # Return appropriate response based on context
        if os.environ.get('ENVIRONMENT') == 'cloud_function':
            return (success_msg, 200)
        return success_msg

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
