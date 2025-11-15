"""
FastAPI backend for DS Chat - serves the analytics chat interface.
Wraps the agent runner with REST endpoints.
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agent_runner import AgentRunner, AgentRunnerError
from backend.session_manager import SessionManager

# Initialize managers
_agent_runner: AgentRunner | None = None
_session_manager: SessionManager | None = None


# Pydantic models for request/response
class ChatRequest(BaseModel):
    """Request to chat endpoint."""

    session_id: str | None = None  # If None, creates new session
    message: str


class ChatResponse(BaseModel):
    """Response from chat endpoint."""

    session_id: str
    response: str
    tools: dict[str, int]  # Tool name -> call count
    tokens: dict[str, int]  # input_tokens, output_tokens, total_tokens
    time_ms: float
    error: str | None = None


class SessionInfo(BaseModel):
    """Session information."""

    session_id: str
    created_at: str
    updated_at: str
    message_count: int
    last_response_metadata: dict[str, Any] | None = None


class SessionListResponse(BaseModel):
    """Response with session list."""

    sessions: list[SessionInfo]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    agent_initialized: bool


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    global _agent_runner, _session_manager

    # Startup
    print("Starting DS Chat Backend...", file=sys.stderr)

    try:
        # Initialize session manager (in-memory by default)
        _session_manager = SessionManager(persist_dir=None)
        print("✓ Session manager initialized", file=sys.stderr)

        # Initialize agent runner (with timeout to prevent blocking startup)
        _agent_runner = AgentRunner()
        try:
            # Try to initialize, but allow server to start even if this fails
            await _agent_runner.initialize()
            print("✓ Agent runner initialized", file=sys.stderr)
        except Exception as e:
            print(f"⚠ Agent runner initialization failed: {e}", file=sys.stderr)
            print("ℹ Server started anyway. Agent will retry on first chat request.", file=sys.stderr)
            # Don't re-raise - let server continue
            _agent_runner = None  # Mark as not initialized

    except Exception as e:
        print(f"✗ Failed to initialize backend: {e}", file=sys.stderr)
        # Session manager is critical, so raise only if that fails
        raise

    yield

    # Shutdown
    print("Shutting down DS Chat Backend...", file=sys.stderr)
    if _agent_runner:
        await _agent_runner.cleanup()
    print("✓ Cleanup complete", file=sys.stderr)


# Create FastAPI app
app = FastAPI(
    title="DS Chat Backend",
    description="Analytics chat interface backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if backend is healthy and ready."""
    return HealthResponse(
        status="ok",
        agent_initialized=_agent_runner is not None and _agent_runner._executor.agent_instance is not None,
    )


# Chat endpoint
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Execute a single chat turn.

    Args:
        request: ChatRequest with session_id (optional) and message

    Returns:
        ChatResponse with agent response, tools used, and metrics
    """
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Session manager not initialized")

    if not _agent_runner or not _agent_runner._executor.agent_instance:
        raise HTTPException(
            status_code=503,
            detail="Agent not initialized. Check AWS credentials and VPN connection."
        )

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        # Create or get session
        session_id = request.session_id
        if not session_id:
            session_id = _session_manager.create_session()
        else:
            session = _session_manager.get_session(session_id)
            if not session:
                # Create new session with this ID
                _session_manager.create_session()
                session_id = request.session_id  # Use provided ID if possible
                if session_id not in _session_manager.sessions:
                    session_id = _session_manager.create_session()

        # Get conversation history
        conversation_items = _session_manager.get_conversation_items(session_id)

        # Run agent
        response_text, tools_used, token_usage, time_taken = await _agent_runner.run_turn(
            request.message, conversation_items
        )

        # Add messages to session
        _session_manager.add_message(session_id, "user", request.message)
        _session_manager.add_message(
            session_id,
            "assistant",
            response_text,
            metadata={"tools": tools_used, "tokens": token_usage, "time_ms": time_taken * 1000},
        )

        return ChatResponse(
            session_id=session_id,
            response=response_text,
            tools=tools_used,
            tokens=token_usage,
            time_ms=time_taken * 1000,
        )

    except AgentRunnerError as e:
        print(f"Agent error: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error in chat endpoint: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Session management endpoints
@app.post("/api/sessions")
async def create_session():
    """Create a new chat session."""
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Session manager not initialized")

    session_id = _session_manager.create_session()
    return {"session_id": session_id}


@app.get("/api/sessions", response_model=SessionListResponse)
async def list_sessions():
    """List all sessions."""
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Session manager not initialized")

    sessions = _session_manager.list_sessions()
    session_infos = [
        SessionInfo(
            session_id=s.session_id,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages),
            last_response_metadata=s.metadata.get("last_response"),
        )
        for s in sessions
    ]

    return SessionListResponse(sessions=session_infos)


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session details and message history."""
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Session manager not initialized")

    session = _session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    return SessionInfo(
        session_id=session.session_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=len(session.messages),
        last_response_metadata=session.metadata.get("last_response"),
    )


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if not _session_manager:
        raise HTTPException(status_code=503, detail="Session manager not initialized")

    success = _session_manager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    return {"message": f"Session {session_id} deleted"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "DS Chat Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
