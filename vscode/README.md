# cvr.name.coder

Autonomous AI coding agent with persistent memory, streaming responses, and local LLM support. Runs fully inside VS Code.

## Features

- **Streaming** — AI output appears token-by-token in real time
- **Cancel** — Abort in-flight requests
- **Multi-session** — Tab-based conversation switching with auto-save
- **Workspace files** — Agent reads your project file tree and contents
- **Local AI** — Works offline with Ollama, llama.cpp, LM Studio, kobold.cpp, vllm
- **Cloud AI** — Gemini, OpenAI, Anthropic, DeepSeek, Groq
- **Auto-detection** — Finds Ollama/llama.cpp automatically
- **MCP tools** — Connect external tool servers
- **Persistent memory** — Long-term knowledge with auto-compression
- **Autonomous loop** — Agent triggers itself for multi-step tasks
- **Syntax highlighting** — Prism.js code blocks with copy button

## Quick Start

1. Install the extension from `.vsix`
2. Click the **cvr.name** icon in the Activity Bar
3. If Ollama is running — it auto-detects, just start chatting
4. Or configure a cloud provider in Settings (gear icon)

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| cvr.name: Launch Dashboard | — | Open full dashboard panel |
| cvr.name: Open Sidebar | `Ctrl+Shift+C` | Open sidebar view |
| cvr.name: Clear History | — | Wipe all conversations |

## Settings

Click the **⚙️** gear icon in the top right to configure:
- AI Provider (Local / Gemini / OpenAI / Anthropic / DeepSeek / Groq)
- Model name and API URL
- API key for cloud providers
- Language (EN / RU / ES / ZH)
- Auto-loop delay
- MCP servers

## Architecture

```
VS Code Extension Host
  └─ Express server (internal)
     ├─ /api/chat (SSE streaming)
     ├─ /api/workspace (file tree, read, write)
     ├─ /api/sessions (save/load conversations)
     ├─ /api/mcp-* (MCP tool server)
     └─ Static React SPA
```

## License

MIT
