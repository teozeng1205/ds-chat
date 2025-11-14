# Python Agent Bridge

A minimal FastAPI application that reuses the `ds-agentic-workflows` chat agent
( `chat.py` ) and exposes it over HTTP so the Next.js UI can talk to the same
MCP-backed tooling.

## Setup

1. Ensure you have the `ds-agentic-workflows` repo checked out next to this
   project (default) or set `DS_AGENTIC_ROOT` to its path.
2. Create/activate a Python 3.11+ virtual environment.
3. Install dependencies:

```bash
pip install -r python-agent/requirements.txt
```

4. Export the environment variables required by `ds-agentic-workflows`
   (`AWS_PROFILE`, `AWS_DEFAULT_REGION`, `OPENAI_API_KEY`, etc.).

## Running

```bash
cd python-agent
uvicorn server:app --reload
```

Environment variables:

| Variable              | Description                                              | Default                                    |
| --------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `DS_AGENTIC_ROOT`     | Path to the `ds-agentic-workflows` repo.                 | `../ds-agentic-workflows` relative to app. |
| `AGENT_COMMON_TABLES` | Comma-separated tables passed to `GenericDatabaseMCPAgent` | Uses the defaults from `chat.py`.          |
| `AGENT_SERVER_HOST`   | Bind host for uvicorn entrypoint.                        | `127.0.0.1`                                |
| `AGENT_SERVER_PORT`   | Bind port for uvicorn entrypoint.                        | `8000`                                     |

The service keeps a single MCP agent session alive and serializes requests with
an asyncio lock, mirroring the behavior of the CLI chat loop.
