from fastapi import APIRouter, HTTPException, Request, Header, Depends
from typing import Optional, List, Dict, Any
from ..config import get_settings
from ..utils.logger import setup_logging
from ..utils.supabase_client import SupabaseClient
from ..middleware.auth_middleware import verify_admin_token
import asyncio
import os
from datetime import datetime, timezone
import ipaddress
import json
import uuid

router = APIRouter()
logger = setup_logging()

def is_local_dev_environment(request: Request) -> bool:
    """Allow the admin-auth bypass only when the server itself is explicitly
    running in dev mode AND the request comes from a loopback address.

    The Origin header is client-controlled and must never be used as a
    security signal on its own.
    """
    if not get_settings().dev_mode:
        return False

    client_host = request.client.host
    try:
        ip = ipaddress.ip_address(client_host)
        return ip.is_loopback
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
    now = datetime.now(timezone.utc)
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

@router.post("/telemetry")
async def store_telemetry(request: Request):
    """Store telemetry data from the frontend"""
    try:
        telemetry_data: Dict[str, Any] = await request.json()
        
        # Validate required fields
        if 'sessionUUID' not in telemetry_data:
            raise HTTPException(status_code=400, detail="Missing sessionUUID")
        if 'timestamp' not in telemetry_data:
            raise HTTPException(status_code=400, detail="Missing timestamp")
            
        # Validate UUID format
        try:
            uuid_obj = uuid.UUID(telemetry_data['sessionUUID'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid sessionUUID format")
            
        # Ensure timestamp is in ISO format
        try:
            timestamp = datetime.fromisoformat(telemetry_data['timestamp'].replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid timestamp format")
        
        # Get Supabase client
        supabase = SupabaseClient()
        
        # Store telemetry data in Supabase (off the event loop; the SDK is sync)
        try:
            entry = {
                'timestamp': timestamp.isoformat(),
                'session_uuid': str(uuid_obj),
                'browser_info': telemetry_data.get('browserInfo', {}),
                'connection_info': telemetry_data.get('connectionInfo', {}),
                'device_info': telemetry_data.get('deviceInfo', {}),
                'feature_support': telemetry_data.get('featureSupport', {}),
                'ip_address': request.client.host
            }
            result = await asyncio.to_thread(
                lambda: supabase.get_admin_client().table('telemetry').insert(entry).execute()
            )
            
            return {"status": "success", "message": "Telemetry data stored successfully"}
            
        except Exception as e:
            logger.error(f"Failed to store telemetry data in Supabase: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to store telemetry data"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing telemetry data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

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
        session_uuids = []
        if session_uuid:
            session_uuids = [sid.strip() for sid in session_uuid.split(',') if sid.strip()]
            if session_uuids:
                query = query.in_('session_uuid', session_uuids)
        
        query = query.order('timestamp', desc=False)
        
        result = await asyncio.to_thread(query.execute)
        if result.data:
            return {"logs": result.data}
            
        # Fall back to file system if no logs in Supabase
        logs = []
        if session_uuids:
            for sid in session_uuids:
                log_file_path = get_log_file_path(sid)
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
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            message = f'[{timestamp}] {message}'
        
        # Get Supabase client only when needed
        supabase = SupabaseClient()

        # Try to store in Supabase first. store_log() swallows its own errors
        # and returns None on failure, so check the result rather than
        # relying on an exception that will never be raised.
        result = await supabase.store_log(
            level="INFO",
            message=message,
            session_uuid=session_uuid,
            metadata={"raw_message": message},
            source="frontend",
            ip_address=client_ip
        )
        if result is None:
            logger.error("Failed to store frontend log in Supabase; using file fallback")
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
