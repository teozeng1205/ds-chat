# DS Chat Frontend

Next.js 14 interface for the analytics chat workflow. The app mirrors a ChatGPT-style experience, surfaces execution logs, and tracks tool/tokens/time metrics returned by the FastAPI backend.

## Highlights

- **Modern UX** – Dark gradient theme, responsive layout, keyboard-friendly input, and contextual prompts.
- **Session aware** – Initializes against `POST /api/sessions`, retains IDs, and stores the conversation transcript in state.
- **Execution transparency** – Side log rail streams MCP/agent events (simulated client-side today, ready to consume server events).
- **State management** – Lightweight Zustand store coordinates messages, logs, metrics, loading/error flags, and initialization flow.

## Requirements

- Node.js 18+
- Backend endpoint (default `http://localhost:8000`)

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` if the backend runs elsewhere.

## Getting Started

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

For production builds:

```bash
npm run build
npm start
```

## Project Layout

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout + fonts/styles
│   ├── page.tsx            # Bootstraps session + renders Chat component
│   └── globals.css         # Global theme tokens
├── components/
│   ├── Chat.tsx            # Main UI shell with sidebar, log panel, metrics bar
│   ├── MessageItem.tsx     # Markdown-aware renderer for user/assistant turns
│   └── ExecutionLog.tsx    # Collapsible execution log viewer
├── lib/
│   ├── api.ts              # Fetch helpers + optimistic log streaming
│   └── store.ts            # Zustand store describing chat state
└── app/page.module.css & component .module.css files for scoped styling
```

## API Contract

`lib/api.ts` calls the FastAPI backend:

- `GET /health` – readiness check prior to session creation.
- `POST /api/sessions` – allocate a session ID.
- `POST /api/chat` – send messages and retrieve tool/tokens/time metadata.

Execution logs are mocked client-side today (see `sendMessage`), so wiring a true SSE/websocket feed later only requires updating that helper.

## Troubleshooting

- **Initialization stuck** – ensure the backend is running and reachable at `NEXT_PUBLIC_API_BASE_URL`; the landing screen remains in “Initializing…” until `/health` passes and a session is created.
- **CORS errors** – backend must include your frontend origin or keep `allow_origins=["*"]` as in the default FastAPI config.
- **Missing fonts/styles** – run via `npm run dev` or `npm run build`; opening `page.tsx` directly in a browser is unsupported.

## Roadmap Ideas

- Stream backend tokens/logs over SSE or websockets.
- Persist session history and allow switching between conversations.
- Rich markdown & SQL formatting, code copy buttons, and share/export helpers.

Refer to `FRONTEND_SETUP.md` for an end-to-end deployment walkthrough covering backend coordination, Docker, and Vercel/EC2 options.
