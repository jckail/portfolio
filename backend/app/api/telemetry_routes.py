from fastapi import APIRouter, HTTPException, Request, Header, Depends
from typing import Optional, List
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient
from ..middleware.auth_middleware import verify_admin_token
import os
from datetime import datetime
import ipaddress
import json

router = APIRouter()
logger = setup_logging()

def is_local_dev_environment(request: Request) -> bool:
    """Check if the request is coming from localhost/local network AND port 5173"""
    client_host = request.client.host
    origin = request.headers.get('origin', '')
    
    try:
        # Check if it's a local IP
        ip = ipaddress.ip_address(client_host)
        is_local = (
            ip.is_loopback or  # localhost
            ip.is_private or   # local network
            str(ip) == '::1'   # IPv6 localhost
        )
        
        # Check if it's coming from port 5173
        is_dev_port = ':5173' in origin
        
        return is_local and is_dev_port
    except ValueError:
        return False

async def verify_access(request: Request):
    """Verify access based on local dev environment or admin authentication"""
    if not is_local_dev_environment(request):
        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise HTTPException(status_code=401, detail="No authorization token provided")
        
        # Verify the admin token
        await verify_admin_token(auth_header)

def get_log_file_path(session_uuid=None):
    """Get the current log file path based on timestamp and session UUID"""
    now = datetime.utcnow()
    base_log_dir = os.path.join(os.path.dirname(__file__), "../logs")
    frontend_log_dir = os.path.join(base_log_dir, "frontend", now.strftime('%Y_%m_%d'))
    
    # Ensure frontend logs directory exists
    os.makedirs(frontend_log_dir, exist_ok=True)
    
    # Create filename with session UUID
    if session_uuid:
        filename = f"{session_uuid}.log"
    else:
        filename = "unknown_session.log"
    
    return os.path.join(frontend_log_dir, filename)

@router.get("/logs")
async def get_logs(request: Request, session_uuid: str = None):
    """Fetch logs from Supabase, falling back to file system if needed"""
    # Verify access (local dev environment or admin auth)
    await verify_access(request)
    
    try:
        # Get Supabase client only when needed
        supabase = SupabaseClient()
        
        # Try to fetch logs from Supabase first
        query = supabase.get_admin_client().table('logs').select('*')
        
        # Handle multiple session UUIDs
        if session_uuid:
            session_uuids = [uuid.strip() for uuid in session_uuid.split(',')]
            if len(session_uuids) > 0:
                query = query.in_('session_uuid', session_uuids)
        
        query = query.order('timestamp', desc=False)
        
        result = query.execute()
        if result.data:
            return {"logs": result.data}
            
        # Fall back to file system if no logs in Supabase
        logs = []
        if session_uuid:
            session_uuids = [uuid.strip() for uuid in session_uuid.split(',')]
            for uuid in session_uuids:
                log_file_path = get_log_file_path(uuid)
                if os.path.exists(log_file_path):
                    with open(log_file_path, "r", encoding='utf-8') as f:
                        file_logs = f.readlines()
                        for log in file_logs:
                            log = log.strip()
                            if log:
                                try:
                                    timestamp = log[1:log.index(']')]
                                    message = log[log.index(']')+1:].strip()
                                    logs.append({
                                        "timestamp": timestamp,
                                        "message": message
                                    })
                                except:
                                    logs.append({
                                        "timestamp": "",
                                        "message": log
                                    })
        
        return {"logs": logs}
    except Exception as e:
        logger.error(f"Error fetching logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log")
async def log_message(request: Request):
    """Log a single message"""
    try:
        body = await request.json()
        message = body.get("message", "")
        session_uuid = body.get("sessionUUID")
        
        if not session_uuid:
            logger.error("Session UUID is required")
            return {"status": "error", "message": "Session UUID is required"}
        
        return await store_log_message(message, session_uuid, request.client.host)
    except Exception as e:
        logger.error(f"Error in log_message endpoint: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/log/batch")
async def log_messages_batch(request: Request):
    """Log multiple messages in a single request"""
    try:
        body = await request.json()
        logs = body.get("logs", [])
        
        if not logs:
            return {"status": "error", "message": "No logs provided"}
        
        client_ip = request.client.host
        
        # Process all logs in the batch
        results = []
        for log_entry in logs:
            message = log_entry.get("message", "")
            session_uuid = log_entry.get("sessionUUID")
            
            if not session_uuid:
                logger.error("Session UUID is required for all logs")
                continue
                
            result = await store_log_message(message, session_uuid, client_ip)
            results.append(result)
        
        # Check if any logs were processed successfully
        if any(result.get("status") == "success" for result in results):
            return {"status": "success", "message": "Batch processed successfully"}
        else:
            return {"status": "error", "message": "Failed to process any logs in batch"}
            
    except Exception as e:
        logger.error(f"Error in log_messages_batch endpoint: {str(e)}")
        return {"status": "error", "message": str(e)}

async def store_log_message(message: str, session_uuid: str, client_ip: str):
    """Store a single log message"""
    try:
        # Add timestamp if not present
        if not message.startswith('[20'):  # Check if timestamp is already present
            timestamp = datetime.utcnow().isoformat() + 'Z'
            message = f'[{timestamp}] {message}'
        
        # Get Supabase client only when needed
        supabase = SupabaseClient()
        
        # Try to store in Supabase first
        try:
            await supabase.store_log(
                level="INFO",
                message=message,
                session_uuid=session_uuid,
                metadata={"raw_message": message},
                source="frontend",
                ip_address=client_ip
            )
        except Exception as e:
            logger.error(f"Failed to store frontend log in Supabase: {str(e)}")
            # If Supabase fails, fall back to file logging
            log_file_path = get_log_file_path(session_uuid)
            
            # Ensure message ends with newline
            if not message.endswith('\n'):
                message += '\n'
                
            # Append message to log file
            with open(log_file_path, "a", encoding='utf-8') as f:
                f.write(message)
        
        return {"status": "success", "message": "Log written successfully"}
    except Exception as e:
        logger.error(f"Error storing log message: {str(e)}")
        return {"status": "error", "message": str(e)}
