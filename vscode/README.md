# cvr.name.coder

Autonomous AI coding agent for VS Code with persistent memory, Goal Loop, Project Oracle RAG, design systems, code review, browser automation, vision, cron tasks, Agent Marketplace, team sync, MCP tools/server, and local or cloud LLM support.

Autonomous coding workspace for VS Code with chat, tools, memory, automation, and design workflows in one extension.

## Features

- **Streaming** — AI output appears token-by-token in real time
- **Cancel** — Abort in-flight requests
- **Multi-session** — Tab-based conversation switching with auto-save
- **Workspace files** — Agent reads your project file tree and contents
- **Local AI** — Works offline with Ollama, llama.cpp, LM Studio, kobold.cpp, vllm
- **Cloud AI** — Gemini, OpenAI, Anthropic, DeepSeek, Groq
- **Auto-detection** — Finds Ollama/llama.cpp automatically
- **MCP tools** — Connect external tool servers
- **MCP server** — Expose cvr.name.coder as an MCP endpoint for external clients
- **Persistent memory** — Long-term knowledge with auto-compression
- **Autonomous loop** — Agent triggers itself for multi-step tasks
- **Goal Loop** — Run autonomous goals with judge-based success checks
- **Project Oracle RAG** — Auto-index the workspace for semantic search and retrieval
- **Code review** — Review diffs with categorized AI findings
- **Undo / Redo** — Revert and restore agent-applied changes
- **Browser automation** — Playwright-powered browser navigation, clicks, screenshots, and evaluation
- **Vision** — Upload images to supported multimodal models
- **Design systems** — Manage reusable design tokens and system presets from the app
- **Cron tasks** — Schedule recurring tasks and agent runs
- **Agent Marketplace** — Publish, browse, rate, and reuse agents, skills, plugins, and rules
- **Team sync** — Share and sync memory and project context
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
- Vision support
- Design systems
- MCP servers

## Architecture

```
VS Code Extension Host
  └─ Express server (internal)
     ├─ /api/chat (SSE streaming)
     ├─ /api/workspace (file tree, read, write)
     ├─ /api/sessions (save/load conversations)
     ├─ /api/goal (autonomous Goal Loop)
     ├─ /api/review (AI code review)
     ├─ /api/browser (browser automation)
     ├─ /api/cron (scheduled tasks)
     ├─ /api/marketplace (agents/skills/plugins/rules)
     ├─ /api/mcp-* (MCP tool server)
     └─ Static React SPA
```

## License

MIT
