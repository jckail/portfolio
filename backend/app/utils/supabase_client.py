from supabase import create_client, Client
import os
import sys
from dotenv import load_dotenv
from typing import Optional, Dict, Any, List
from datetime import datetime

load_dotenv()

def get_supabase_config():
    """Get Supabase configuration from environment variables."""
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE")
    
    if not url or not anon_key or not service_role_key:
        raise ValueError("Supabase URL, anon key, and service role key must be set in environment variables")
    
    return url, anon_key, service_role_key

class SupabaseClient:
    _regular_client = None
    _admin_client = None
    _url = None
    _anon_key = None
    _service_role_key = None

    @classmethod
    def initialize_config(cls):
        """Initialize configuration if not already done."""
        if cls._url is None:
            cls._url, cls._anon_key, cls._service_role_key = get_supabase_config()

    @classmethod
    def get_client(cls) -> Client:
        """Get the regular Supabase client instance (lazy loaded)."""
        if cls._regular_client is None:
            cls.initialize_config()
            cls._regular_client = create_client(cls._url, cls._anon_key)
        return cls._regular_client

    @classmethod
    def get_admin_client(cls) -> Client:
        """Get the admin Supabase client instance (lazy loaded)."""
        if cls._admin_client is None:
            cls.initialize_config()
            cls._admin_client = create_client(cls._url, cls._service_role_key)
        return cls._admin_client

    @classmethod
    async def create_admin_user(cls, email: str, password: str):
        """Create a new admin user using the service role client."""
        try:
            admin_client = cls.get_admin_client()
            response = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            
            if response.user:
                await admin_client.rpc(
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

    @classmethod
    async def verify_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Verify a JWT token and return user data if valid."""
        try:
            admin_client = cls.get_admin_client()
            user = admin_client.auth.get_user(token)
            return user.user if user else None
        except Exception:
            return None

    @classmethod
    async def sign_in_with_password(cls, email: str, password: str):
        """Sign in a user with email and password."""
        try:
            client = cls.get_client()
            auth_response = client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            return auth_response
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")

    @classmethod
    async def sign_out(cls, token: str = None):
        """Sign out the current user or a specific session."""
        try:
            if token:
                admin_client = cls.get_admin_client()
                admin_client.auth.admin.sign_out(token)
            else:
                client = cls.get_client()
                client.auth.sign_out()
        except Exception as e:
            raise Exception(f"Sign out failed: {str(e)}")

    @classmethod
    async def store_log(cls, level: str, message: str, session_uuid: str = None, metadata: Dict[str, Any] = None, source: str = "backend", ip_address: str = None):
        """Store a log entry in Supabase."""
        try:
            admin_client = cls.get_admin_client()
            log_entry = {
                'timestamp': datetime.utcnow().isoformat(),
                'level': level.upper(),
                'message': message,
                'session_uuid': session_uuid,
                'metadata': metadata or {},
                'source': source,
                'ip_address': ip_address
            }
            
            result = admin_client.table('logs').insert(log_entry).execute()
            return result
        except Exception as e:
            print(f"Failed to store log in Supabase: {str(e)}", file=sys.stderr)
            return None

    @classmethod
    async def store_logs_batch(cls, logs: List[Dict[str, Any]]):
        """Store multiple log entries in Supabase at once."""
        try:
            admin_client = cls.get_admin_client()
            log_entries = []
            
            for log in logs:
                log_entry = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': log['level'].upper(),
                    'message': log['message'],
                    'metadata': log['metadata'],
                    'source': log['source'],
                    'ip_address': log['ip_address']
                }
                log_entries.append(log_entry)
            
            if log_entries:
                result = admin_client.table('logs').insert(log_entries).execute()
                return result
            return None
        except Exception as e:
            print(f"Failed to store log batch in Supabase: {str(e)}", file=sys.stderr)
            return None

# Create a module-level interface
supabase = SupabaseClient()
