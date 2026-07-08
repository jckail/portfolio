# Backend Technical Documentation 🔧

## Technology Stack

- **FastAPI** for high-performance API
- **Pydantic** for data validation
- **Uvicorn** for ASGI server
- **Python 3.12+** for modern features
- **Custom middleware** for security

## Core Features 🚀

### API Endpoints

#### Resume Data Management
```http
GET /api/resume_data       # Get formatted resume data
GET /api/resume           # Download PDF resume
GET /api/resume_file_name # Get resume filename
```

#### AI Assistant Integration

The AI assistant is powered by Anthropic's **Claude Haiku 4.5** and streams
responses over a WebSocket connection:

```http
WS /ws/{client_id}       # Streaming AI chat (Claude Haiku 4.5)
```

Messages are JSON objects:
- `{"type": "context", "content": "..."}` — page context for the assistant
- `{"type": "message", "content": "...", "ga_session_id": "..."}` — a user message

The model can be overridden with the `CHAT_MODEL` environment variable
(defaults to `claude-haiku-4-5`). Conversation history is maintained
per-connection, and the static system prompt + portfolio data use Anthropic
prompt caching to reduce latency and cost.

#### Analytics & Telemetry
```http
POST /api/telemetry      # Log user interactions
GET /api/health         # Service health check
```

## Architecture 🏗️

```
backend/
├── app/
│   ├── api/            # API routes
│   ├── middleware/     # Custom middleware
│   ├── models/        # Data models
│   ├── utils/         # Helper functions
│   └── main.py       # Application entry
├── tests/            # Test suite
└── logs/            # Application logs
```

## Security Features 🔒

- CORS configuration
- Rate limiting
- Request validation
- Error handling
- Secure file operations

## Data Models 📊

### Resume Data
```python
class ResumeData(BaseModel):
    personal_info: PersonalInfo
    experience: List[Experience]
    projects: List[Project]
    skills: TechnicalSkills
```

### Chat Messages
```python
class ChatMessage(BaseModel):
    content: str
    timestamp: datetime
    user_id: str
```

## Logging System 📝

- Structured JSON logging
- Rotating file handlers
- Error tracking
- Performance metrics
- Debug information

## Development Guide 👩‍💻

### Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --port 8080

# Run tests
pytest
```

### Environment Variables
```env
ALLOWED_ORIGINS=http://localhost:5173
RESUME_FILE=YourResume.pdf
LOG_LEVEL=INFO
```

### Best Practices

#### Code Organization
- Clear module structure
- Type hints everywhere
- Docstrings for functions
- Proper error handling

#### API Design
- RESTful principles
- Clear endpoint naming
- Proper status codes
- Comprehensive validation

#### Performance
- Async operations
- Efficient data processing
- Proper caching
- Resource optimization

## Testing Strategy 🧪

- Unit tests for utilities
- Integration tests for APIs
- Performance benchmarks
- Security testing

## Monitoring 📊

- Health checks
- Performance metrics
- Error tracking
- Usage analytics

## Contributing 🤝

1. Follow Python best practices
2. Add tests for new features
3. Update documentation
4. Maintain type safety
