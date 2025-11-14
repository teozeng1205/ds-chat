"""FastAPI bridge exposing the ds-agentic GenericDatabaseMCPAgent over HTTP."""

from __future__ import annotations

import asyncio
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def _resolve_ds_agentic_root() -> Path:
    env_root = os.environ.get("DS_AGENTIC_ROOT")
    if env_root:
        root = Path(env_root).expanduser().resolve()
    else:
        root = Path(__file__).resolve().parents[2] / "ds-agentic-workflows"

    if not root.exists():
        raise RuntimeError(
            "Unable to locate ds-agentic-workflows repo. Set DS_AGENTIC_ROOT env var."
        )

    paths = [root, root / "ds-agents", root / "ds-mcp" / "src"]
    for path in paths:
        if path.exists() and str(path) not in sys.path:
            sys.path.insert(0, str(path))

    return root


DS_AGENTIC_ROOT = _resolve_ds_agentic_root()

from agents import Agent, Runner  # type: ignore  # noqa: E402
from ds_agents.mcp_agents import GenericDatabaseMCPAgent  # type: ignore  # noqa: E402


class ChatMessage(BaseModel):
    role: Literal["assistant", "user", "system"]
    content: str


class ChatRequest(BaseModel):
    input: str
    messages: list[ChatMessage] = Field(default_factory=list)
    prompt: str | None = None
    conversation: list[dict[str, Any]] | None = None


class ChatResponse(BaseModel):
    output: str
    tool_counts: dict[str, int] | None = None
    usage: dict[str, int] | None = None
    conversation: list[dict[str, Any]] = Field(default_factory=list)


COMMON_TABLES_ENV = os.environ.get("AGENT_COMMON_TABLES")
if COMMON_TABLES_ENV:
    COMMON_TABLES = [table.strip() for table in COMMON_TABLES_ENV.split(",") if table.strip()]
else:
    COMMON_TABLES = [
        "prod.monitoring.provider_combined_audit",
        "local.analytics.market_level_anomalies_v3",
    ]


app = FastAPI(title="DS Agent Chat Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_agent_lock = asyncio.Lock()
_agent: GenericDatabaseMCPAgent | None = None
_agent_instance: Agent | None = None
_server_cm = None


async def _ensure_agent_initialized() -> None:
    global _agent, _agent_instance, _server_cm
    if _agent_instance is not None:
        return

    _agent = GenericDatabaseMCPAgent(common_tables=COMMON_TABLES)
    _server_cm = _agent.create_mcp_server()
    server = await _server_cm.__aenter__()
    _agent_instance = _agent.build(server)


@app.on_event("startup")
async def _startup() -> None:
    await _ensure_agent_initialized()


@app.on_event("shutdown")
async def _shutdown() -> None:
    global _server_cm, _agent_instance
    if _server_cm is not None:
        await _server_cm.__aexit__(None, None, None)
    _server_cm = None
    _agent_instance = None


def _build_agent_input(payload: ChatRequest) -> list[dict[str, Any]]:
    if payload.conversation:
        conversation = list(payload.conversation)
    else:
        conversation = []
        if payload.prompt:
            conversation.append({"role": "system", "content": payload.prompt})
        for message in payload.messages:
            conversation.append(message.model_dump())
    conversation.append({"role": "user", "content": payload.input})
    return conversation


def _collect_tool_counts(result: Any) -> dict[str, int]:
    tools: list[str] = []
    for item in getattr(result, "new_items", []) or []:
        raw_item = getattr(item, "raw_item", None)
        name = getattr(raw_item, "name", None)
        if name:
            tools.append(name)
    return dict(Counter(tools)) if tools else {}


def _collect_usage(result: Any) -> dict[str, int]:
    usage_totals = {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
    }
    for resp in getattr(result, "raw_responses", []) or []:
        usage = getattr(resp, "usage", None)
        if not usage:
            continue
        usage_totals["input_tokens"] += getattr(usage, "input_tokens", 0) or 0
        usage_totals["output_tokens"] += getattr(usage, "output_tokens", 0) or 0
        usage_totals["total_tokens"] += getattr(usage, "total_tokens", 0) or 0
    return usage_totals if any(usage_totals.values()) else {}


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    await _ensure_agent_initialized()
    if _agent_instance is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent not initialized",
        )

    async with _agent_lock:
        agent_input = _build_agent_input(payload)
        try:
            result = await Runner.run(_agent_instance, input=agent_input)
        except Exception as exc:  # pragma: no cover
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agent execution failed: {exc}",
            ) from exc

    final_output = (result.final_output or "").strip()
    conversation_items = result.to_input_list()
    tool_counts = _collect_tool_counts(result)
    usage = _collect_usage(result)

    return ChatResponse(
        output=final_output,
        tool_counts=tool_counts or None,
        usage=usage or None,
        conversation=conversation_items,
    )


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("AGENT_SERVER_HOST", "127.0.0.1")
    port = int(os.environ.get("AGENT_SERVER_PORT", "8000"))
    uvicorn.run("python-agent.server:app", host=host, port=port, reload=False)
