"""
Agent runner extracted from chat.py - wraps GenericDatabaseMCPAgent execution.
Handles MCP server lifecycle and agent invocation.
"""

from __future__ import annotations

import os
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

# Ensure local submodules are importable
AGENTIC_WORKFLOWS_ROOT = Path(__file__).resolve().parent.parent.parent / "ds-agentic-workflows"
LOCAL_IMPORT_PATHS = [
    AGENTIC_WORKFLOWS_ROOT / "ds-agents",
    AGENTIC_WORKFLOWS_ROOT / "ds-mcp" / "src",
]

for _path in LOCAL_IMPORT_PATHS:
    if _path.exists():
        _str_path = str(_path)
        if _str_path not in sys.path:
            sys.path.insert(0, _str_path)

from agents import Runner
from agents.mcp import MCPServerStdio, create_static_tool_filter
from ds_agents.mcp_agents import GenericDatabaseMCPAgent

# Core tools exposed to the agent
EXPOSED_TOOLS = [
    "read_table_head",
    "query_table",
    "get_top_site_issues",
    "analyze_issue_scope",
]

# Common tables to expose to the agent
COMMON_TABLES = [
    "prod.monitoring.provider_combined_audit",
    "local.analytics.market_level_anomalies_v3",
]


class AgentRunnerError(Exception):
    """Base exception for agent runner errors."""
    pass


class AgentRunner:
    """
    Wrapper around chat.py logic - handles agent setup and execution.
    Maintains MCP server lifecycle and executes agent runs.
    """

    def __init__(self, common_tables: list[str] | None = None):
        """
        Initialize the agent runner.

        Args:
            common_tables: List of tables to expose to the agent.
                         Defaults to COMMON_TABLES if None.
        """
        self.common_tables = common_tables or COMMON_TABLES
        self.mcp_server = None
        self.agent_instance = None

    async def initialize(self) -> None:
        """
        Initialize the MCP server and agent instance.
        Must be called before running chat turns.
        """
        if self.mcp_server is not None:
            return  # Already initialized

        try:
            agent = GenericDatabaseMCPAgent(common_tables=self.common_tables)
            server_name = agent.get_server_name()

            # Setup environment for MCP server subprocess
            server_env = os.environ.copy()

            pythonpath_entries = []
            for _path in LOCAL_IMPORT_PATHS:
                pythonpath_entries.append(str(_path))

            if existing := server_env.get("PYTHONPATH"):
                pythonpath_entries.append(existing)

            if pythonpath_entries:
                server_env["PYTHONPATH"] = os.pathsep.join(pythonpath_entries)

            server_args = ["-m", "ds_mcp.server"]
            if server_name:
                server_args.extend(["--name", server_name])
            for table in self.common_tables:
                server_args.extend(["--table", table])

            # Create and start MCP server
            self.mcp_server = MCPServerStdio(
                name=server_name,
                params={"command": sys.executable, "args": server_args, "env": server_env},
                cache_tools_list=True,
                client_session_timeout_seconds=180.0,
                tool_filter=create_static_tool_filter(allowed_tool_names=EXPOSED_TOOLS),
            )
            await self.mcp_server.__aenter__()

            # Build agent instance
            self.agent_instance = agent.build(self.mcp_server)

        except Exception as e:
            raise AgentRunnerError(f"Failed to initialize agent: {e}") from e

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
        if self.agent_instance is None:
            raise AgentRunnerError("Agent not initialized. Call initialize() first.")

        try:
            # Build input payload
            if conversation_items is None:
                input_payload = user_message
            else:
                input_payload = list(conversation_items)
                input_payload.append({"role": "user", "content": user_message})

            # Run agent
            t0 = time.perf_counter()
            result = await Runner.run(self.agent_instance, input=input_payload)
            dt = time.perf_counter() - t0

            # Extract response text
            final_text = (result.final_output or "").strip()

            # Extract tools used
            tools = []
            for item in result.new_items:
                raw = getattr(item, "raw_item", None)
                name = getattr(raw, "name", None)
                if name:
                    tools.append(name)

            tools_used = dict(Counter(tools)) if tools else {}

            # Extract token usage
            token_usage = {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
            }
            for resp in result.raw_responses:
                if resp.usage:
                    token_usage["input_tokens"] += getattr(resp.usage, "input_tokens", 0) or 0
                    token_usage["output_tokens"] += getattr(resp.usage, "output_tokens", 0) or 0
                    token_usage["total_tokens"] += getattr(resp.usage, "total_tokens", 0) or 0

            return final_text, tools_used, token_usage, dt

        except Exception as e:
            raise AgentRunnerError(f"Agent execution failed: {e}") from e

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
        if self.agent_instance is None:
            return conversation_items

        # In a real multi-turn scenario, you'd extract from agent state
        # For now, return as-is (the agent maintains internal state)
        return conversation_items

    async def cleanup(self) -> None:
        """Cleanup MCP server resources."""
        if self.mcp_server is not None:
            try:
                await self.mcp_server.__aexit__(None, None, None)
            except Exception as e:
                print(f"Warning: Error cleaning up MCP server: {e}", file=sys.stderr)
            self.mcp_server = None
            self.agent_instance = None

    async def __aenter__(self) -> AgentRunner:
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.cleanup()
