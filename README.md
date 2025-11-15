# DS Chat Backend

A FastAPI-based backend server that wraps the analytics chat agent from `ds-agentic-workflows`. Provides REST API endpoints for conversational interaction with analytics databases.

## Architecture

```
Frontend (Browser/Client)
         ↓
FastAPI Backend (Port 8000)
    ├── /api/chat              (Chat endpoint)
    ├── /api/sessions          (Session management)
    ├── /health               (Health check)
    └── /docs                 (API documentation)
         ↓
Agent Runner (Async)
    ├── MCP Server (subprocess)
    └── GenericDatabaseMCPAgent
         ↓
Redshift Database
    ├── prod.monitoring.*
    └── local.analytics.*
```

## Files

### Core Modules

- **`app.py`** - FastAPI application with REST endpoints and lifespan management
- **`agent_runner.py`** - Wrapper around chat.py logic, manages MCP server lifecycle
- **`session_manager.py`** - Session and conversation state management
- **`test_client.py`** - Test client for API testing

### Configuration

- **`requirements.txt`** - Python dependencies (FastAPI, Uvicorn, Pydantic, etc.)

## Setup

### Installation

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Ensure environment variables are set
export AWS_PROFILE="3VDEV"
export AWS_DEFAULT_REGION="us-east-1"
export OPENAI_API_KEY="sk-..."

# Set PYTHONPATH to include submodules
export PYTHONPATH="/path/to/ds-agentic-workflows/ds-agents:/path/to/ds-agentic-workflows/ds-mcp/src"
```

### Running the Server

```bash
# From ds-chat directory
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000

# With reload enabled (development)
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload

# With auto-reload and log output
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload --log-level debug
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "agent_initialized": true
}
```

### Chat

Execute a single chat turn. Maintains conversation state across requests within a session.

```bash
POST /api/chat
Content-Type: application/json

{
  "session_id": "uuid-or-null",
  "message": "What are the top issues for provider QL2?"
}
```

Response:
```json
{
  "session_id": "b4e1bb63-...",
  "response": "Based on the data...",
  "tools": {
    "query_table": 1,
    "analyze_issue_scope": 2
  },
  "tokens": {
    "input_tokens": 1200,
    "output_tokens": 450,
    "total_tokens": 1650
  },
  "time_ms": 3450.5
}
```

**Query Parameters:**
- `session_id` (string, optional): Session UUID. If not provided or new, creates a new session
- `message` (string, required): User message/query

**Response:**
- `session_id`: Session ID for multi-turn conversations
- `response`: Assistant response text
- `tools`: Dictionary of tools used and call counts
- `tokens`: Token usage breakdown
- `time_ms`: Execution time in milliseconds

### Session Management

#### Create Session
```bash
POST /api/sessions
```

Response:
```json
{
  "session_id": "b4e1bb63-492e-4392-93d5-3763e68c66ef"
}
```

#### List All Sessions
```bash
GET /api/sessions
```

Response:
```json
{
  "sessions": [
    {
      "session_id": "b4e1bb63-...",
      "created_at": "2025-11-15T02:48:18.453683",
      "updated_at": "2025-11-15T02:48:18.453683",
      "message_count": 5,
      "last_response_metadata": {
        "tools": {"query_table": 1},
        "tokens": {"input_tokens": 800, "output_tokens": 350, "total_tokens": 1150},
        "time_ms": 2100.0
      }
    }
  ]
}
```

#### Get Session Details
```bash
GET /api/sessions/{session_id}
```

Response:
```json
{
  "session_id": "b4e1bb63-...",
  "created_at": "2025-11-15T02:48:18.453683",
  "updated_at": "2025-11-15T02:48:18.453683",
  "message_count": 5,
  "last_response_metadata": {...}
}
```

#### Delete Session
```bash
DELETE /api/sessions/{session_id}
```

Response:
```json
{
  "message": "Session b4e1bb63-... deleted"
}
```

### API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing

### Quick Test

Run the built-in test client:

```bash
# Test basic flow (health check, create session, send message, list sessions)
python backend/test_client.py basic

# Test multi-turn conversation
python backend/test_client.py multi
```

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:8000/health | jq

# Create session
SESSION_ID=$(curl -s -X POST http://localhost:8000/api/sessions | jq -r .session_id)
echo "Created session: $SESSION_ID"

# Send chat message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"message\": \"Hello!\"}" | jq

# List sessions
curl http://localhost:8000/api/sessions | jq

# Get session details
curl http://localhost:8000/api/sessions/$SESSION_ID | jq

# Delete session
curl -X DELETE http://localhost:8000/api/sessions/$SESSION_ID | jq
```

### Python Test Client

Use the included `test_client.py`:

```python
import asyncio
from backend.test_client import DSChatTestClient

async def main():
    client = DSChatTestClient("http://localhost:8000")

    # Check health
    await client.health_check()

    # Create and use session
    await client.create_session()
    response, data = await client.chat("What are the top issues?")
    print(f"Response: {response}")
    print(f"Tools: {data['tools']}")
    print(f"Tokens: {data['tokens']}")

asyncio.run(main())
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_PROFILE` | Yes | AWS SSO profile for Redshift access | `3VDEV` |
| `AWS_DEFAULT_REGION` | Yes | AWS region | `us-east-1` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM | `sk-...` |
| `PYTHONPATH` | Recommended | Path to submodules | See Setup section |

## Architecture Details

### Agent Runner (`agent_runner.py`)

Wraps the chat logic from the original `chat.py` file:

- **`AgentRunner.__init__`**: Initialize with table configuration
- **`AgentRunner.initialize()`**: Start MCP server and build agent
- **`AgentRunner.run_turn()`**: Execute a single chat turn with conversation history
- **`AgentRunner.cleanup()`**: Clean up MCP server resources
- **Async context manager**: Use `async with AgentRunner() as runner:`

Key features:
- Manages MCP server subprocess lifecycle
- Maintains agent instance
- Extracts metrics (tools used, tokens, execution time)
- Supports multi-turn conversations

### Session Manager (`session_manager.py`)

Manages conversation sessions and state:

- **In-memory storage** by default
- **Optional file persistence** (pass `persist_dir`)
- **Session creation** with UUID
- **Message history** tracking
- **Metadata storage** (tools, tokens, etc.)

### FastAPI App (`app.py`)

REST server with async support:

- **Lifespan management**: Initializes/cleans up resources
- **Error handling**: Graceful degradation if agent fails
- **CORS enabled**: Works with frontend clients
- **Type-safe**: Pydantic models for all requests/responses

## Deployment

### Local Development

```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

### Production (EC2)

#### Using Gunicorn + Uvicorn

```bash
pip install gunicorn

gunicorn \
  -w 4 \
  -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 \
  backend.app:app
```

#### Using Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache -r requirements.txt

COPY . .

ENV AWS_PROFILE=3VDEV
ENV AWS_DEFAULT_REGION=us-east-1

CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Using Systemd (EC2)

Create `/etc/systemd/system/ds-chat.service`:

```ini
[Unit]
Description=DS Chat Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/ds-chat

Environment="AWS_PROFILE=3VDEV"
Environment="AWS_DEFAULT_REGION=us-east-1"
Environment="OPENAI_API_KEY=sk-..."
Environment="PYTHONPATH=/opt/ds-agentic-workflows/ds-agents:/opt/ds-agentic-workflows/ds-mcp/src"

ExecStart=/opt/ds-chat/.venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable ds-chat
sudo systemctl start ds-chat
sudo systemctl status ds-chat
```

## Troubleshooting

### Agent Not Initializing

**Error**: `Agent not initialized. Check AWS credentials and VPN connection.`

**Solutions**:
1. Check AWS SSO token: `aws sso login --profile 3VDEV`
2. Verify VPN is connected (for Redshift access)
3. Check environment variables are set correctly
4. Verify PYTHONPATH includes ds-agents and ds-mcp/src

### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### CORS Issues

The server has CORS enabled for all origins. If you still have issues, the frontend might be making requests to the wrong URL.

### Database Connection Timeout

Ensure:
- VPN is connected
- AWS SSO token is valid (refresh with `aws sso login --profile 3VDEV`)
- Network connectivity to Redshift cluster

## Development

### Adding New Endpoints

```python
@app.post("/api/custom-endpoint")
async def custom_endpoint(request: CustomRequest):
    """Handle custom request."""
    return CustomResponse(...)
```

### Adding New Tools

Edit the MCP server in `ds-agentic-workflows/ds-mcp/src/ds_mcp/server.py` to add new tools, then restart the backend.

### Debugging

Enable debug logging:

```bash
python -m uvicorn backend.app:app --log-level debug
```

Or in code:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Performance

- **Session count**: Unlimited (in-memory by default)
- **Concurrent requests**: Limited by MCP server (usually fine for small teams)
- **Response time**: Depends on agent execution (typically 2-10 seconds)
- **Memory usage**: ~200-500MB (idle), grows with session count

To reduce memory usage, implement file-based session persistence:

```python
session_manager = SessionManager(persist_dir="/tmp/sessions")
```

## License

Same as parent `ds-agentic-workflows` project.
