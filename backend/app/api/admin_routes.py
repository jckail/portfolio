from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from backend.app.utils.supabase_client import supabase
from backend.app.models.resume_data import resume_data
from backend.app.middleware.auth_middleware import verify_admin_token
import os
import json
from datetime import datetime

router = APIRouter()

# @router.post("/setup")
# async def setup_admin():
#     """
#     Initial setup endpoint to create admin user.
#     This should only be called once to set up the initial admin account.
#     """
#     try:
#         admin_email = os.getenv("ADMIN_EMAIL")
#         admin_password = os.getenv("SUPABASE_PW")
        
#         if not admin_email or not admin_password:
#             raise HTTPException(
#                 status_code=500,
#                 detail="Admin credentials not configured in environment"
#             )
            
#         # Create admin user with service role
#         response = await supabase.create_admin_user(admin_email, admin_password)
        
#         if response.user:
#             return {"message": "Admin user created successfully"}
#         else:
#             raise HTTPException(status_code=500, detail="Failed to create admin user")
            
#     except Exception as e:
#         if "User already registered" in str(e):
#             raise HTTPException(status_code=400, detail="Admin user already exists")
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def admin_login(credentials: dict):
    """
    Authenticate admin user
    """
    try:
        email = credentials.get("email")
        password = credentials.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
            
        # Verify against admin email
        admin_email = os.getenv("ADMIN_EMAIL")
        if not admin_email:
            raise HTTPException(
                status_code=500, 
                detail="Admin email not configured in environment"
            )
            
        if email != admin_email:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
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
        # Get analytics data from Supabase
        # This is a placeholder - implement actual analytics gathering
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
        
        # Recursively get all log files
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
        # Update resume data
        # In a production environment, this should update the database
        # For now, we'll update the in-memory data
        resume_data.update(updated_data)
        
        # Save to a backup file
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
        # Get basic system health information
        health_info = {
            "status": "healthy",
            "lastChecked": datetime.utcnow().isoformat(),
            "diskSpace": "N/A",  # Implement actual disk space check
            "memoryUsage": "N/A",  # Implement actual memory usage check
            "activeUsers": 0  # Implement actual active users count
        }
        return health_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
