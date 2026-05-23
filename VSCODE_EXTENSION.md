# VS Code Extension — cvr.name.coder

Run an **autonomous AI coding agent** directly inside VS Code with Goal Loop, Project Oracle RAG, design systems, code review, browser automation, vision, cron tasks, Agent Marketplace, team sync, MCP tools/server, and local or cloud LLM support.


Скрипт готов: release.ps1
Использование:
--------------------
.\release.ps1 "твоё сообщение коммита"
--------------------
Что делает:
1. npm run type-check — проверка типов
2. npm run build — сборка основного проекта
3. npm run package:vscode — сборка и bump версии .vsix
4. git add . + git commit + git push (пропускается, если нет изменений)
5. Выводит хеш коммита и путь к .vsix
---

## What It Does

**cvr.name.coder** is a VS Code sidebar extension that embeds an AI coding assistant running an internal Express server. Everything is bundled — no external URLs, no `npm run dev`, no setup.

### Key Features

| Feature | Description |
|---------|-------------|
| **Streaming responses** | AI output appears token-by-token in real time, like ChatGPT |
| **Cancel button** | Abort in-flight requests with one click |
| **Multi-session chats** | Tab-based conversation switching — save, load, rename sessions |
| **Auto-save** | Sessions saved automatically after each message |
| **Workspace files** | Agent reads your project file tree and file contents |
| **Syntax highlighting** | Code blocks rendered with Prism.js + copy button |
| **Local AI** | Works offline with Ollama, llama.cpp, LM Studio, kobold.cpp, vllm |
| **Cloud AI** | Gemini, OpenAI, Anthropic, DeepSeek, Groq |
| **Auto-detection** | Automatically finds Ollama/llama.cpp on startup |
| **MCP tools** | Connect external MCP servers (web search, file ops, etc.) |
| **MCP server** | Expose the extension as an MCP endpoint for external clients |
| **Persistent memory** | Long-term memory with Dreamer compression engine |
| **Autonomous loop** | Agent can trigger itself for multi-step tasks |
| **Goal Loop** | Launch autonomous goals with judge-based success checks |
| **Project Oracle RAG** | Auto-index the workspace for semantic retrieval |
| **Code review** | Review git diffs with categorized AI findings |
| **Undo / Redo** | Revert and restore agent-applied changes |
| **Browser automation** | Playwright-powered navigation, screenshots, and evaluation |
| **Vision** | Upload images to supported multimodal models |
| **Design systems** | Manage reusable design tokens and system presets |
| **Cron tasks** | Schedule recurring jobs and agent runs |
| **Agent Marketplace** | Publish and reuse agents, skills, plugins, and rules |
| **Team sync** | Share and sync memory/project context |

---

## Installation

### From .vsix file

1. Build the extension (or use pre-built `.vsix`):
   ```bash
   npx @vscode/vsce package
   ```

2. In VS Code: **Extensions** → `...` → **Install from VSIX...** → select `.vsix`

3. Click the **cvr.name** icon in the Activity Bar (sidebar)

---

## Quick Start

### Option 1: Local AI (free, offline)

1. Install [Ollama](https://ollama.com)
2. Run: `ollama pull llama3`
3. Open cvr.name sidebar — it auto-detects Ollama
4. Start chatting

### Option 2: Cloud AI

1. Open **Settings** (gear icon in top right)
2. Select provider: Gemini / DeepSeek / Groq / etc.
3. Enter API key
4. Start chatting

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `cvr.name: Launch Dashboard` | — | Open full dashboard panel |
| `cvr.name: Open Sidebar` | `Ctrl+Shift+C` | Open sidebar view |
| `cvr.name: Clear History & Memory` | — | Wipe all conversations and memory |

---

## Sidebar Tabs

- **Memory** — Persistent knowledge clusters (facts, rules, progress, goals)
- **Skills** — Learned and available capabilities
- **Files** — Browse workspace files, click to preview

---

## Settings

Click the **⚙️** gear icon in the top right to configure:

- **AI Provider** — Local (Ollama/llama.cpp), Gemini, OpenAI, Anthropic, DeepSeek, Groq
- **Model** — Select or type model name
- **Local URL** — Presets for Ollama (11434), LM Studio (1234), llama.cpp (8080)
- **API Key** — For cloud providers
- **Language** — EN / RU / ES / ZH
- **Auto-loop delay** — Time between autonomous steps
- **Vision** — Enable image upload for multimodal models
- **Design systems** — Configure reusable design presets
- **MCP Servers** — Configure external tool servers

---

## Architecture

```
VS Code Extension Host
  └─ Express server (internal, port 0 = random)
     ├─ API routes: /api/chat (SSE streaming)
     ├─ /api/history, /api/clear
     ├─ /api/workspace (file tree, read, write)
     ├─ /api/sessions (save, load)
     ├─ /api/goal (autonomous Goal Loop)
     ├─ /api/review (AI code review)
     ├─ /api/browser (browser automation)
     ├─ /api/cron (scheduled tasks)
     ├─ /api/marketplace (agents/skills/plugins/rules)
     ├─ /api/mcp-* (MCP tool server)
     └─ Static files: bundled React SPA
        └─ Webview iframe loads localhost:<port>
```

- **Frontend**: React 19 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Express + Google GenAI SDK + MCP stdio transport
- **Bundle**: esbuild bundles everything into 2MB .vsix

---

## Security

- All data stored in VS Code's extension storage (`globalStorage`)
- Local AI never sends code to the cloud
- MCP servers run as child processes with isolated stdio
- File write API restricts paths to workspace root (no traversal)

---

## License

MIT
