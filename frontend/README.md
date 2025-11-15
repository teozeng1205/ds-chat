# DS Chat Frontend

A beautiful, modern Next.js frontend for the Analytics Chat application. Inspired by ChatGPT-lite with real-time agent execution logging.

## Features

✨ **Beautiful UI** - Modern dark theme with glassmorphism effects
💬 **Real-time Chat** - Instant message streaming and display
📊 **Agent Logs** - View execution logs from the backend agent
⚡ **Fast** - Built with Next.js 14 and React 18
🎨 **Responsive** - Works on desktop and mobile
🔗 **API Integration** - Connected to FastAPI backend

## Prerequisites

- **Node.js** 18+ and npm/yarn
- **FastAPI Backend** running on `http://localhost:8000`

## Installation

```bash
cd frontend

# Install dependencies
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

Set the backend API URL via environment variable:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Or it will default to `http://localhost:8000`.

## Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page component
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   └── page.module.css    # Page-specific styles
├── components/            # Reusable components
│   ├── Chat.tsx          # Main chat component
│   ├── MessageItem.tsx    # Individual message display
│   └── ExecutionLog.tsx   # Agent execution logs
├── lib/
│   ├── api.ts            # Backend API client
│   └── store.ts          # Zustand state management
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Components

### Chat
Main chat interface component that handles:
- Message display and input
- Session management
- Metrics display (tools, tokens, time)
- Empty state and examples

### MessageItem
Displays individual messages with:
- User/assistant styling
- Basic markdown rendering
- Code block highlighting
- Icon indicators

### ExecutionLog
Shows agent execution logs with:
- Real-time log streaming
- Color-coded log levels (INFO, WARNING, ERROR)
- Source and timestamp information
- Auto-scroll to latest logs

## API Integration

The frontend communicates with the FastAPI backend via:

- `GET /health` - Health check
- `POST /api/sessions` - Create new session
- `POST /api/chat` - Send message and get response
- `GET /api/sessions` - List all sessions

See `lib/api.ts` for implementation details.

## State Management

Uses Zustand for simple, efficient state management:

- Session state (ID, initialization)
- Messages (user and assistant)
- Execution logs
- Loading and error states
- Metrics tracking

## Styling

- **Framework**: CSS Modules + vanilla CSS
- **Theme**: Dark mode with blue/purple accent
- **Effects**: Glassmorphism, gradients, smooth animations
- **Responsive**: Mobile-first design

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+

## Troubleshooting

### "Backend is not available"
- Make sure FastAPI backend is running: `python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000`
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable

### Messages not appearing
- Check browser console for errors
- Verify backend is accessible
- Check session ID in browser storage

### Logs not showing
- Click the "Logs" button in the header
- Ensure messages are being sent successfully

## Performance

- Next.js 14 with App Router
- React Server Components where possible
- CSS Modules for scoped styling
- Optimized images and assets
- ~150KB gzipped (without dependencies)

## Future Enhancements

- [ ] Streaming responses from backend
- [ ] Markdown code syntax highlighting
- [ ] Message editing/deletion
- [ ] Session history and switching
- [ ] Export chat as PDF
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Voice input support

## License

MIT - See parent project
