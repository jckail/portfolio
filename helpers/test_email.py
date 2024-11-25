import requests
import json
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_email_sending(base_url="http://localhost:8080"):
    """
    Test the email sending functionality by making a request to the contact API endpoint.
    
    Args:
        base_url (str): The base URL of the API (default: http://localhost:8080 for local testing)
    """
    # Test email data using the same structure that worked in sgtest.py
    test_data = {
        "from_email": "you@jordan-kail.com",  # Using verified sender email
        "subject": "Test Email from Portfolio Contact Form",
        "message": """
        This is a test email to verify the email sending functionality.
        Testing with verified sender email.
        
        Best regards,
        Test Script
        """
    }

    # Endpoint URL
    url = f"{base_url}/api/contact/send-email"
    
    print(f"\nSending test email to: {url}")
    print("Request payload:", json.dumps(test_data, indent=2))

    try:
        # Send POST request
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        response = requests.post(url, json=test_data, headers=headers)
        
        # Print response details
        print("\nResponse Status:", response.status_code)
        print("Response Headers:", dict(response.headers))
        
        try:
            print("Response Body:", json.dumps(response.json(), indent=2))
        except:
            print("Response Body:", response.text)

        # Check if request was successful
        if 200 <= response.status_code < 300:
            print("\n✅ Test email sent successfully!")
            print(f"Status Code: {response.status_code}")
        else:
            print("\n❌ Failed to send test email")
            print(f"Status Code: {response.status_code}")
            try:
                error_detail = response.json().get('detail', response.text)
                print(f"Error: {error_detail}")
            except:
                print(f"Error: {response.text}")

    except requests.exceptions.RequestException as e:
        print("\n❌ Error making request:")
        print(str(e))
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = json.loads(e.response.text)
                print("Error details:", json.dumps(error_detail, indent=2))
            except:
                print("Error response:", e.response.text)

if __name__ == "__main__":
    # Get production URL from environment variables
    production_url = os.getenv('PRODUCTION_URL', 'https://quickresume-292025398859.us-central1.run.app')
    
    # Check if production URL is provided as argument
    if len(sys.argv) > 1 and sys.argv[1] == "--prod":
        base_url = production_url
        print(f"Testing against production URL: {base_url}")
    else:
        base_url = "http://localhost:8080"
        print(f"Testing against local URL: {base_url}")
        print("Use --prod flag to test against production URL")

    test_email_sending(base_url)
