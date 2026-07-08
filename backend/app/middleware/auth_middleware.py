import asyncio
import logging

from fastapi import Header, HTTPException

from backend.app.config import get_settings
from backend.app.utils.supabase_client import SupabaseClient

logger = logging.getLogger(__name__)


async def verify_auth_token(authorization: str | None = Header(None)):
    """
    Verify the authentication token from the request header.
    This function is used as a dependency in protected routes.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")

    # Remove 'Bearer ' prefix if present
    token = authorization.replace('Bearer ', '')

    try:
        supabase = SupabaseClient()
        # supabase-py is synchronous; keep the event loop free
        user_response = await asyncio.to_thread(supabase.get_client().auth.get_user, token)
    except Exception as e:
        # Log details server-side; never leak provider internals to the client
        logger.warning("Token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user_response


async def verify_admin_token(authorization: str | None = Header(None)):
    """
    Verify that the token belongs to an admin user.
    This function is used as a dependency in admin-protected routes.
    """
    user_response = await verify_auth_token(authorization)

    admin_email = get_settings().admin_email
    if not admin_email:
        raise HTTPException(
            status_code=500,
            detail="Admin email not configured in environment variables"
        )

    # Check if user is admin
    user_email = user_response.user.email
    if not user_email or user_email != admin_email:
        raise HTTPException(
            status_code=403,
            detail="User is not authorized for admin access"
        )

    return user_response.user
