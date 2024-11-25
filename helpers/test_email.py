import requests
import json
import sys
import os

def test_email_sending(base_url="http://localhost:8080"):
    """
    Test the email sending functionality by making a request to the contact API endpoint.
    
    Args:
        base_url (str): The base URL of the API (default: http://localhost:8080 for local testing)
    """
    # Test email data
    test_data = {
        "from_email": "test@example.com",
        "subject": "Test Email from Portfolio Contact Form",
        "message": "This is a test email to verify the email sending functionality."
    }

    # Endpoint URL
    url = f"{base_url}/api/contact/send-email"
    
    print(f"\nSending test email to: {url}")
    print("Request payload:", json.dumps(test_data, indent=2))

    try:
        # Send POST request
        response = requests.post(url, json=test_data)
        
        # Print response details
        print("\nResponse Status:", response.status_code)
        print("Response Headers:", dict(response.headers))
        
        try:
            print("Response Body:", json.dumps(response.json(), indent=2))
        except:
            print("Response Body:", response.text)

        # Check if request was successful
        if response.status_code == 200:
            print("\n✅ Test email sent successfully!")
        else:
            print("\n❌ Failed to send test email")
            print(f"Status Code: {response.status_code}")
            print(f"Error: {response.text}")

    except requests.exceptions.RequestException as e:
        print("\n❌ Error making request:")
        print(str(e))

if __name__ == "__main__":
    # Check if production URL is provided as argument
    if len(sys.argv) > 1 and sys.argv[1] == "--prod":
        base_url = "https://quickresume-vbufkr2qma-uc.a.run.app"
        print(f"Testing against production URL: {base_url}")
    else:
        base_url = "http://localhost:8080"
        print(f"Testing against local URL: {base_url}")
        print("Use --prod flag to test against production URL")

    test_email_sending(base_url)
