"""
Session manager - handles conversation state and session persistence.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class ChatMessage:
    """A single chat message."""

    role: str  # "user" or "assistant"
    content: str


@dataclass
class ChatSession:
    """A conversation session with history and metadata."""

    session_id: str
    created_at: str
    updated_at: str
    messages: list[dict[str, Any]]  # Raw conversation items for agent
    metadata: dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "session_id": self.session_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "messages": self.messages,
            "metadata": self.metadata,
        }


class SessionManager:
    """
    Manages chat sessions and conversation state.
    Supports in-memory and file-based persistence.
    """

    def __init__(self, persist_dir: str | Path | None = None):
        """
        Initialize session manager.

        Args:
            persist_dir: Directory to persist sessions to. If None, uses in-memory only.
        """
        self.sessions: dict[str, ChatSession] = {}
        self.persist_dir = Path(persist_dir) if persist_dir else None

        if self.persist_dir:
            self.persist_dir.mkdir(parents=True, exist_ok=True)
            self._load_all_sessions()

    def create_session(self) -> str:
        """
        Create a new chat session.

        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        session = ChatSession(
            session_id=session_id,
            created_at=now,
            updated_at=now,
            messages=[],
        )

        self.sessions[session_id] = session
        self._save_session(session_id)
        return session_id

    def get_session(self, session_id: str) -> ChatSession | None:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    def add_message(
        self, session_id: str, role: str, content: str, metadata: dict[str, Any] | None = None
    ) -> None:
        """
        Add a message to a session.

        Args:
            session_id: Session ID
            role: "user" or "assistant"
            content: Message content
            metadata: Optional metadata (tools used, tokens, etc.)
        """
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Add message to conversation
        msg = {"role": role, "content": content}
        session.messages.append(msg)

        # Update metadata
        if metadata:
            if role == "assistant":
                session.metadata["last_response"] = {
                    "tools": metadata.get("tools", {}),
                    "tokens": metadata.get("tokens", {}),
                    "time_ms": metadata.get("time_ms", 0),
                }

        # Update timestamp
        session.updated_at = datetime.utcnow().isoformat()

        # Save to disk if enabled
        self._save_session(session_id)

    def get_conversation_items(self, session_id: str) -> list[dict[str, Any]] | None:
        """
        Get conversation items in format expected by agent.

        Args:
            session_id: Session ID

        Returns:
            List of conversation items or None if no messages
        """
        session = self.get_session(session_id)
        if not session or not session.messages:
            return None

        return session.messages

    def list_sessions(self) -> list[ChatSession]:
        """List all sessions."""
        return sorted(self.sessions.values(), key=lambda s: s.updated_at, reverse=True)

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id not in self.sessions:
            return False

        del self.sessions[session_id]

        if self.persist_dir:
            session_file = self.persist_dir / f"{session_id}.json"
            if session_file.exists():
                session_file.unlink()

        return True

    def clear_all(self) -> None:
        """Clear all sessions."""
        self.sessions.clear()
        if self.persist_dir:
            for f in self.persist_dir.glob("*.json"):
                f.unlink()

    # Private methods for persistence

    def _save_session(self, session_id: str) -> None:
        """Save session to disk if persistence is enabled."""
        if not self.persist_dir:
            return

        session = self.sessions.get(session_id)
        if not session:
            return

        session_file = self.persist_dir / f"{session_id}.json"
        with open(session_file, "w") as f:
            json.dump(session.to_dict(), f, indent=2)

    def _load_all_sessions(self) -> None:
        """Load all sessions from disk."""
        if not self.persist_dir:
            return

        for session_file in self.persist_dir.glob("*.json"):
            try:
                with open(session_file, "r") as f:
                    data = json.load(f)
                    session = ChatSession(**data)
                    self.sessions[session.session_id] = session
            except Exception as e:
                print(f"Warning: Failed to load session {session_file}: {e}")
