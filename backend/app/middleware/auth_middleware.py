from fastapi import HTTPException, Header
from typing import Optional
from backend.app.utils.supabase_client import supabase
import os
from functools import wraps

async def verify_auth_token(authorization: Optional[str] = Header(None)):
    """
    Verify the authentication token from the request header.
    This function is used as a dependency in protected routes.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization token provided")
    
    try:
        # Remove 'Bearer ' prefix if present
        token = authorization.replace('Bearer ', '')
        
        # Verify token with Supabase
        user = supabase.client.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

async def verify_admin_token(authorization: Optional[str] = Header(None)):
    """
    Verify that the token belongs to an admin user.
    This function is used as a dependency in admin-protected routes.
    """
    user = await verify_auth_token(authorization)
    
    # Get admin email from environment variable
    admin_email = os.getenv("ADMIN_EMAIL")
    if not admin_email:
        raise HTTPException(
            status_code=500, 
            detail="Admin email not configured in environment variables"
        )
    
    # Check if user is admin
    if user.email != admin_email:
        raise HTTPException(
            status_code=403, 
            detail="User is not authorized for admin access"
        )
    
    return user

def require_admin(func):
    """
    Decorator for routes that require admin authentication.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        auth_header = kwargs.get('authorization')
        if not auth_header:
            raise HTTPException(status_code=401, detail="No authorization token provided")
        
        await verify_admin_token(auth_header)
        return await func(*args, **kwargs)
    
    return wrapper
