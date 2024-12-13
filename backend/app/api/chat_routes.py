from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
from anthropic import AsyncAnthropic
import os
from dotenv import load_dotenv
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from backend.app.models import get_all_models
from backend.app.utils.supabase_client import supabase

all_data = get_all_models()

# Load environment variables
load_dotenv()

# Initialize router
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.page_contexts: Dict[str, str] = {}
        # Create one client for the entire application
        self.client = AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            max_retries=3,  # Add retry handling
            timeout=30.0    # Increase timeout slightly
        )
        # Cache the system prompt
        self._system_prompt: str | None = None

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.page_contexts:
            del self.page_contexts[client_id]

    def store_context(self, client_id: str, context: str):
        self.page_contexts[client_id] = context

    def get_context(self, client_id: str) -> str:
        return self.page_contexts.get(client_id, '')

    async def send_message(self, message: str, client_id: str, is_chunk: bool = False, ga_session_id: str = None):
        if client_id in self.active_connections:
            try:
                # Prepare the message once
                json_message = {
                    "message": message,
                    "sender": "assistant",
                    "is_chunk": is_chunk
                }
                websocket = self.active_connections[client_id]
                await websocket.send_json(json_message)

                # Store complete messages in Supabase
                if not is_chunk and ga_session_id:
                    await supabase.store_chat_message(
                        google_analytics_session_id=ga_session_id,
                        message_type='received',
                        message_detail=message
                    )
            except Exception as e:
                print(f"Error sending message: {e}")

    @asynccontextmanager
    async def get_streaming_response(self, client_id: str, user_message: str):
        """Context manager to handle Claude API streaming responses"""
        context = self.get_context(client_id)
        
        # Load system prompt if not cached
        if self._system_prompt is None:
            try:
                prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                    'assets', 'portfoliosystemprompt.md')
                with open(prompt_path, 'r') as file:
                    base_prompt = file.read()
                    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    self._system_prompt = f"Current Date and Time: {current_time}\n\n{base_prompt}"
            except Exception as e:
                print(f"Error loading system prompt: {e}")
                current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self._system_prompt = f"""Current Date and Time: {current_time}

You are an AI assistant for Jordan Kail's portfolio website. Your role is to help visitors:
1. Learn about Jordan's background, experience, and technical skills
2. Understand his projects and achievements
3. Discuss potential collaborations or opportunities
4. Answer questions about his work and expertise

Keep responses professional, informative, and focused on Jordan's professional background and capabilities.
You have access to the current page content to provide accurate, contextual responses."""

        try:
            stream = await self.client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=1024,
                system=self._system_prompt,
                messages=[{
                    "role": "user", 
                    "content": f"Context: {all_data}\n\nUser Message: {user_message}"
                }],
                stream=True
            )
            yield stream
        except Exception as e:
            print(f"Error creating stream: {e}")
            raise

manager = ConnectionManager()

async def handle_websocket_message(websocket: WebSocket, client_id: str, data: dict):
    try:
        if data["type"] == "context":
            manager.store_context(client_id, data["content"])
            return

        # Store user message in Supabase
        ga_session_id = data.get('ga_session_id')
        if ga_session_id and data["type"] == "message":
            await supabase.store_chat_message(
                google_analytics_session_id=ga_session_id,
                message_type='sent',
                message_detail=data['content']
            )

        complete_response = []  # Use list for efficient string building
        
        async with manager.get_streaming_response(client_id, data['content']) as stream:
            async for chunk in stream:
                if hasattr(chunk, 'type'):
                    if chunk.type == "content_block_delta":
                        if chunk.delta.text:
                            # Immediately send chunk
                            await manager.send_message(chunk.delta.text, client_id, is_chunk=True)
                            complete_response.append(chunk.delta.text)
                    elif chunk.type == "content_block_stop":
                        # Send complete message
                        if complete_response:
                            final_response = ''.join(complete_response)
                            await manager.send_message(final_response, client_id, is_chunk=False, ga_session_id=ga_session_id)

    except Exception as e:
        error_message = f"Error: {str(e)}"
        await manager.send_message(error_message, client_id, is_chunk=False)

@router.websocket("/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            parsed_data = json.loads(data)
            await handle_websocket_message(websocket, client_id, parsed_data)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        error_message = f"Connection Error: {str(e)}"
        await manager.send_message(error_message, client_id, is_chunk=False)
        manager.disconnect(client_id)
