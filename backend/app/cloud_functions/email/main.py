import functions_framework
from cloudevents.http import CloudEvent
import logging
import os
from email_utils import handle_cloud_event

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.cloud_event
def send_email(cloud_event: CloudEvent) -> tuple[str, int]:
    """
    Cloud Function triggered by Pub/Sub to send emails.
    Args:
        cloud_event (CloudEvent): The Cloud Event containing the Pub/Sub message.
    Returns:
        tuple[str, int]: A tuple of (response message, status code)
    """
    # Set environment for appropriate return type
    os.environ['ENVIRONMENT'] = 'cloud_function'
    
    return handle_cloud_event(cloud_event)
