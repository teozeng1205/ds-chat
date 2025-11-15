"""
Agent runner extracted from chat.py - wraps GenericDatabaseMCPAgent execution.
Handles MCP server lifecycle and agent invocation.

This is now a thin wrapper around agent_core.AgentExecutor to avoid code duplication.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# Ensure local agent_core module is importable
AGENTIC_WORKFLOWS_ROOT = Path(__file__).resolve().parent.parent.parent / "ds-agentic-workflows"
if str(AGENTIC_WORKFLOWS_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENTIC_WORKFLOWS_ROOT))

from agent_core import AgentExecutor, AgentExecutorError, COMMON_TABLES

# Re-export for backwards compatibility
class AgentRunnerError(AgentExecutorError):
    """Base exception for agent runner errors. (Alias for AgentExecutorError)"""
    pass


class AgentRunner:
    """
    Wrapper around chat.py logic - handles agent setup and execution.
    Maintains MCP server lifecycle and executes agent runs.

    This is now a thin wrapper around AgentExecutor from agent_core.py
    to maintain backwards compatibility with the existing FastAPI app.
    """

    def __init__(self, common_tables: list[str] | None = None):
        """
        Initialize the agent runner.

        Args:
            common_tables: List of tables to expose to the agent.
                         Defaults to COMMON_TABLES if None.
        """
        self._executor = AgentExecutor(
            common_tables=common_tables,
            repo_root=AGENTIC_WORKFLOWS_ROOT,
        )

    async def initialize(self) -> None:
        """
        Initialize the MCP server and agent instance.
        Must be called before running chat turns.
        """
        await self._executor.initialize()

    async def run_turn(
        self,
        user_message: str,
        conversation_items: list[dict[str, Any]] | None = None,
    ) -> tuple[str, dict[str, int], dict[str, int], float]:
        """
        Execute a single chat turn.

        Args:
            user_message: The user's message
            conversation_items: Previous conversation state (for multi-turn)

        Returns:
            Tuple of (response_text, tools_used, token_usage, time_taken_seconds)

        Raises:
            AgentRunnerError: If agent execution fails
        """
        return await self._executor.run_turn(user_message, conversation_items)

    def get_updated_conversation_items(
        self, conversation_items: list[dict[str, Any]] | None = None
    ) -> list[dict[str, Any]] | None:
        """
        Get updated conversation items for next turn.

        Args:
            conversation_items: Previous conversation state

        Returns:
            Updated conversation items list
        """
        # Use the executor's method which properly tracks conversation state
        return self._executor.get_conversation_items_for_next_turn()

    async def cleanup(self) -> None:
        """Cleanup MCP server resources."""
        await self._executor.cleanup()

    async def __aenter__(self) -> AgentRunner:
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.cleanup()
