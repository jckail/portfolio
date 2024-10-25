from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from backend.app.utils.supabase_client import SupabaseClient
from backend.app.models.resume_data import resume_data
from backend.app.middleware.auth_middleware import verify_admin_token
import os
import json
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

class LoginCredentials(BaseModel):
    email: str
    password: str

@router.post("/login")
async def admin_login(credentials: LoginCredentials):
    """
    Authenticate admin user
    """
    try:
        email = credentials.email
        password = credentials.password
        
        # Verify against admin email
        admin_email = os.getenv("ADMIN_EMAIL")
        if not admin_email:
            raise HTTPException(
                status_code=500, 
                detail="Admin email not configured in environment"
            )
            
        if email != admin_email:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        # Get Supabase client only when needed
        supabase = SupabaseClient()
        
        # Attempt login with Supabase
        response = await supabase.sign_in_with_password(email, password)
        
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def admin_logout(user = Depends(verify_admin_token)):
    """
    Logout admin user
    """
    try:
        supabase = SupabaseClient()
        await supabase.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify")
async def verify_admin(user = Depends(verify_admin_token)):
    """
    Verify admin token is valid
    """
    return {"message": "Token is valid", "user": user.email}

@router.get("/analytics")
async def get_analytics(user = Depends(verify_admin_token)):
    """Get analytics data"""
    try:
        analytics = {
            "pageViews": 0,
            "uniqueVisitors": 0,
            "averageTimeOnSite": "0:00",
            "topReferrers": [],
            "lastUpdated": datetime.utcnow().isoformat()
        }
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_admin_logs(user = Depends(verify_admin_token)):
    """Get application logs"""
    try:
        log_dir = os.path.join(os.path.dirname(__file__), "../logs")
        logs = []
        
        for root, _, files in os.walk(log_dir):
            for file in files:
                if file.endswith('.log'):
                    with open(os.path.join(root, file), 'r') as f:
                        logs.extend(f.readlines())
        
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/resume-data")
async def update_resume_data(updated_data: dict, user = Depends(verify_admin_token)):
    """Update resume data"""
    try:
        resume_data.update(updated_data)
        
        backup_path = os.path.join(os.path.dirname(__file__), "../data/resume_backup.json")
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        with open(backup_path, 'w') as f:
            json.dump(resume_data, f, indent=2)
            
        return {"message": "Resume data updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def get_admin_health(user = Depends(verify_admin_token)):
    """Get system health information"""
    try:
        health_info = {
            "status": "healthy",
            "lastChecked": datetime.utcnow().isoformat(),
            "diskSpace": "N/A",
            "memoryUsage": "N/A",
            "activeUsers": 0
        }
        return health_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
