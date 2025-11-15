# ds-chat

Production-ready chat experience for analytics operators.  
This repo couples a FastAPI backend (wrapping the GenericDatabaseMCPAgent from `ds-agentic-workflows`) with a modern Next.js interface so analysts can ask Redshift-centric questions from the browser.

## Architecture Overview

```
Browser (Next.js frontend) ──▶ FastAPI backend (/api/*, /health, /docs)
                                   │
                                   ├─ SessionManager (conversation persistence)
                                   ├─ AgentRunner → agent_core.AgentExecutor
                                   └─ MCP server subprocess (ds-mcp) → Redshift
```

Key directories:

- `backend/` – FastAPI app (`app.py`), shared `AgentRunner`, session manager, and an `httpx` test client.
- `frontend/` – Next.js 14 App Router UI with Zustand store, chat components, execution log panel, and CSS Modules.
- `Dockerfile` / `docker-compose.yml` – reference deployment stack.
- `FRONTEND_SETUP.md` & `IMPLEMENTATION.md` – deep-dive docs.

## Prerequisites

- Python 3.12+
- Node.js 18+
- Access to the `ds-agentic-workflows` repo (sibling directory recommended)
- AWS SSO profile (e.g., `3VDEV`) + VPN for Redshift access
- `OPENAI_API_KEY` for the OpenAI Agents SDK

Environment variables used by the backend:

| Variable | Purpose |
| --- | --- |
| `AWS_PROFILE` / `AWS_ACCESS_KEY_ID` etc. | Credentials for `AnalyticsReader`. |
| `AWS_DEFAULT_REGION` | Usually `us-east-1`. |
| `OPENAI_API_KEY` | Required by `openai-agents`. |
| `PYTHONPATH` | Must include `../ds-agentic-workflows/ds-agents` and `../ds-agentic-workflows/ds-mcp/src` when running outside that repo. |

## Quick Start

1. **Backend**
   ```bash
   cd ds-chat
   python -m venv .venv && source .venv/bin/activate
   pip install -r backend/requirements.txt

   export AWS_PROFILE=3VDEV
   export AWS_DEFAULT_REGION=us-east-1
   export OPENAI_API_KEY=sk-...
   export PYTHONPATH="../ds-agentic-workflows/ds-agents:../ds-agentic-workflows/ds-mcp/src"

   python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   # App is available at http://localhost:3000 (talks to http://localhost:8000 by default)
   ```

3. **Smoke test**
   ```bash
   python backend/test_client.py basic   # health, session creation, agent turn
   ```

## API Surface

| Endpoint | Description |
| --- | --- |
| `GET /health` | Ready check; reports if the agent is initialized. |
| `POST /api/chat` | Executes a single turn for a given session ID, returning agent text + tool/token metrics. |
| `POST /api/sessions` | Creates a brand-new session UUID. |
| `GET /api/sessions` | Lists sessions with timestamps and last-response metadata. |
| `GET /api/sessions/{id}` | Fetches a single session summary. |
| `DELETE /api/sessions/{id}` | Removes a session (and conversation state). |
| `GET /docs` | Swagger UI (automatic FastAPI docs). |

The frontend’s `frontend/lib/api.ts` client consumes these endpoints and streams execution-log placeholders while waiting for responses.

## Deployment

- **Docker Compose**
  ```bash
  docker compose up --build
  ```
  The backend container runs uvicorn; the frontend container runs `npm run dev` or `npm run start` depending on profile.

- **Bare metal / systemd**
  Use the service template in `FRONTEND_SETUP.md` (mirrors the previous README example) to install the backend as `ds-chat.service`. Ensure the virtual environment includes the backend requirements and that `PYTHONPATH` points at the ds-agentic-workflows submodules.

- **Vercel + EC2**
  Deploy the Next.js app to Vercel (or another provider) and host the FastAPI backend on EC2/ECS. Set `NEXT_PUBLIC_API_BASE_URL` so the frontend calls the remote API.

## Troubleshooting

- **“Agent not initialized”** – Run `aws sso login --profile 3VDEV`, confirm VPN, and restart the backend so the MCP subprocess can reach Redshift.
- **401s or CORS errors** – Verify the frontend is pointing to the correct `NEXT_PUBLIC_API_BASE_URL`; CORS is currently open to all origins.
- **Slow responses** – The MCP server executes real SQL; expect multi-second round trips. Inspect backend stderr (tool usage + timings are logged) or open the “Logs” drawer in the UI.

## Related Documentation

- `FRONTEND_SETUP.md` – full-stack walkthrough, UI design notes, deployment steps.
- `IMPLEMENTATION.md` – backend implementation narrative and operational guide.
- `backend/test_client.py` – handy harness for automated smoke testing.

Once both services are running you can explore provider anomalies entirely from the browser while keeping the same toolset as the CLI agent.
