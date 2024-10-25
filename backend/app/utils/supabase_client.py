from supabase import create_client, Client
import os
from dotenv import load_dotenv
from typing import Optional, Dict, Any

load_dotenv()

class SupabaseClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the Supabase client with environment variables."""
        url = os.getenv("SUPABASE_URL")
        anon_key = os.getenv("SUPABASE_ANON_KEY")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE")
        
        if not url or not anon_key or not service_role_key:
            raise ValueError("Supabase URL, anon key, and service role key must be set in environment variables")
        
        # Create two clients - one with anon key and one with service role
        self.client: Client = create_client(url, anon_key)
        self.admin_client: Client = create_client(url, service_role_key)

    def get_client(self) -> Client:
        """Get the regular Supabase client instance."""
        return self.client

    def get_admin_client(self) -> Client:
        """Get the admin Supabase client instance."""
        return self.admin_client

    async def create_admin_user(self, email: str, password: str):
        """Create a new admin user using the service role client."""
        try:
            # Create user with service role client
            response = self.admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True  # Auto-confirm email
            })
            
            if response.user:
                # Set custom claims or role for admin
                await self.admin_client.rpc(
                    'set_claim',
                    {
                        'uid': response.user.id,
                        'claim': 'role',
                        'value': 'admin'
                    }
                )
            return response
        except Exception as e:
            raise Exception(f"Failed to create admin user: {str(e)}")

    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify a JWT token and return user data if valid."""
        try:
            user = self.admin_client.auth.get_user(token)
            return user.user if user else None
        except Exception:
            return None

    async def sign_in_with_password(self, email: str, password: str):
        """Sign in a user with email and password."""
        try:
            auth_response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            return auth_response
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")

    async def sign_out(self, token: str = None):
        """Sign out the current user or a specific session."""
        try:
            if token:
                self.admin_client.auth.admin.sign_out(token)
            else:
                self.client.auth.sign_out()
        except Exception as e:
            raise Exception(f"Sign out failed: {str(e)}")

# Create a singleton instance
supabase = SupabaseClient()
