# Agent Builder — AlphaMetricx

Generative UI chat app with React + OpenUI + Anthropic Claude. Upload data files, define agent instructions, and get AI responses rendered as live UI components (charts, tables, cards, forms). Deploy your agent as a shareable link.

## Quick Start

### 1. Install dependencies

```bash
# From the project root:
npm install
npm run install:all
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run both servers

```bash
# From the project root:
npm run dev
```

- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:3001

## How It Works

1. **Upload data** — Drop `.xlsx`, `.csv`, `.json`, or `.txt` files in the left panel. Content is parsed and included in the AI's context.
2. **Add instructions** — Tell the agent how to behave (e.g. "You are a competitive analyst. Always show comparison tables.")
3. **Chat** — Ask questions. Claude responds with live-rendered UI components via OpenUI Lang.
4. **Deploy** — Click **Deploy Agent** to get a shareable URL. Anyone with the link can chat with your configured agent.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 5 |
| UI Components | `@openuidev/react-ui` + `@openuidev/react-lang` |
| AI Model | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Backend | Express + Anthropic SDK |
| Streaming | SSE (Server-Sent Events) |
| File Parsing | SheetJS (`xlsx`) |

## Project Structure

```
Agent-with-OpenUI/
├── package.json          # Root — concurrently dev script
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Root layout + deploy modal
│   │   ├── components/
│   │   │   ├── LeftPanel.jsx    # Config: upload, instructions, settings
│   │   │   ├── ChatPanel.jsx    # Chat UI with OpenUI Renderer
│   │   │   └── ShareView.jsx    # Deployed agent public view
│   │   └── hooks/
│   │       └── useChat.js       # Streaming chat hook
│   └── vite.config.js    # Proxy /api → localhost:3001
└── backend/
    ├── server.js          # Express API
    └── .env.example       # ANTHROPIC_API_KEY, PORT
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/chat` | Stream Claude response (SSE) |
| `POST` | `/api/upload` | Parse uploaded files |
| `POST` | `/api/deploy` | Save agent config, return share ID |
| `GET` | `/api/share/:id` | Fetch deployed agent config |
