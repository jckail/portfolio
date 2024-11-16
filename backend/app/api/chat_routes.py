from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
from anthropic import AsyncAnthropic
import os
from dotenv import load_dotenv
import json
import asyncio

# Load environment variables
load_dotenv()

# Initialize router
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.page_contexts: Dict[str, str] = {}
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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

    async def send_message(self, message: str, client_id: str, is_chunk: bool = False):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json({
                "message": message,
                "sender": "assistant",
                "is_chunk": is_chunk
            })

manager = ConnectionManager()

async def handle_websocket_message(websocket: WebSocket, client_id: str, data: dict):
    try:
        if data["type"] == "context":
            manager.store_context(client_id, data["content"])
            return
        
        context = manager.get_context(client_id)
        
        # Load system prompt
        prompt_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                'assets', 'portfoliosystemprompt.md')
        try:
            with open(prompt_path, 'r') as file:
                system_prompt = file.read()
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            system_prompt = """You are an AI assistant for Jordan Kail's portfolio website..."""

        # Create the message - using await with async client
        response = await manager.client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            system=system_prompt,
            messages=[{
                "role": "user", 
                "content": f"Context: {context}\n\nUser Message: {data['content']}"
            }]
        )

        # Handle the response - no streaming needed as Claude 3 is very fast
        if response.content:
            # Send the complete message
            await manager.send_message(response.content[0].text, client_id, is_chunk=False)

    except Exception as e:
        error_message = f"Error: {str(e)}"
        await manager.send_message(error_message, client_id, is_chunk=False)

@router.websocket("/ws/{client_id}")
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