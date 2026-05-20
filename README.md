# cvr.name.coder

> Advanced autonomous AI coding agent with persistent memory, streaming responses, and local LLM support. Runs inside VS Code as a fully self-contained extension.

## 🚀 What Is This?

An AI coding assistant that runs **entirely inside VS Code** as a sidebar extension. No external servers, no setup, no cloud dependency — just install the `.vsix` and start coding with AI.

## ✨ Quick Start

1. Install the extension from `.vsix`
2. Click the **cvr.name** icon in the Activity Bar
3. If you have Ollama running, it auto-detects — just start chatting
4. Or configure a cloud provider (Gemini, DeepSeek, Groq) in Settings

## 🎯 Key Features

- **Streaming** — AI output appears in real time, token by token
- **Cancel** — Stop in-flight requests with one click
- **Multi-session** — Switch between saved conversations with FTS5 full-text search
- **Workspace files** — Agent reads your project files and structure
- **Local AI** — Works offline with Ollama, llama.cpp, LM Studio
- **Cloud AI** — Gemini, OpenAI, Anthropic, DeepSeek, Groq, OpenRouter, Together, Mistral, BaseTen
- **MCP tools** — Connect external tool servers
- **Persistent memory** — Agent-written MEMORY.md + USER.md with markdown sections
- **Autonomous loop** — REACT cycle with true multi-step agent execution
- **Permission system** — allow/ask/deny with glob matching for tool safety
- **Subagent delegation** — Spawn child agents for parallel tasks
- **Learning loop** — Auto-create skills from completed agent loops
- **RAG memory** — Semantic search over documents with embeddings
- **Skills system** — Markdown-defined skills with YAML frontmatter
- **Cron tasks** — Scheduled agent runs with interval/cron expressions
- **Plugin system** — Hook-based extensibility via manifest.json
- **Custom tools** — JSON-defined tools without code changes
- **Rules** — AGENTS.md / CODER.md instruction injection into system prompt
- **Multi-agent system** — Specialized agents with `.cvr/agents/*.md` configs
- **Git automation** — Auto-commit/push, diff viewer, status panel
- **Cost tracking** — Per-provider token/cost monitoring with budgets
- **Voice input** — Web Speech API for hands-free chatting
- **MCP server** — Expose cvr as MCP server for Claude/Cursor
- **Code review mode** — AI reviews diffs with inline comments
- **Vision support** — Upload images to Gemini/OpenAI/Anthropic
- **Browser use** — Playwright automation for web testing/scraping
- **Team sync** — Sync MEMORY.md across team via git/cloud
- **Health check** — `/api/health` endpoint for monitoring
- **Response caching** — Reduces API costs for repeated queries
- **Structured logging** — Configurable log levels for debugging

## 🏗️ Architecture

### High-Level Architecture

```
VS Code Extension Host
  └─ Express server (internal)
     ├─ /api/chat — SSE streaming
     ├─ /api/workspace — file tree, read, write
     ├─ /api/sessions — SQLite + FTS5 session storage
     ├─ /api/memory — Persistent MEMORY.md / USER.md
     ├─ /api/skills — Markdown skill definitions
     ├─ /api/rag — Semantic document search
     ├─ /api/rules — AGENTS.md / CODER.md instructions
     ├─ /api/custom-tools — JSON-defined tools
     ├─ /api/plugins — Plugin management
     ├─ /api/cron — Scheduled tasks
     ├─ /api/agent/loop — Autonomous REACT loop
     ├─ /api/subagents — Subagent delegation
     ├─ /api/hooks — Lifecycle hooks
     └─ Static React SPA
```

### Project Structure

```
src/
├── components/
│   ├── chat/           # Chat interface
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── InputArea.tsx
│   │   ├── PermissionDialog.tsx
│   │   └── SubagentTree.tsx
│   ├── settings/       # Settings modal
│   ├── sidebar/        # Sidebar panels
│   │   ├── Sidebar.tsx
│   │   ├── MemoryPanel.tsx      # MEMORY.md / USER.md editor
│   │   ├── SkillsPanel.tsx      # Learned + available skills
│   │   ├── SessionsPanel.tsx    # FTS5 session search
│   │   ├── CronPanel.tsx        # Scheduled tasks
│   │   ├── PluginsPanel.tsx     # Plugin toggle
│   │   └── RulesPanel.tsx       # Rule viewer
│   └── shared/         # Reusable UI components
├── hooks/              # React hooks
│   ├── useSettings.ts
│   ├── useChat.ts
│   ├── usePersistentMemory.ts  # MEMORY.md / USER.md API
│   ├── useSessionSearch.ts     # FTS5 search hook
│   ├── useCron.ts              # Cron task management
│   └── useRAG.ts               # RAG semantic search
├── server/             # Server-side logic
│   ├── memoryStore.ts          # MEMORY.md / USER.md parser
│   ├── sessionStore.ts         # SQLite + FTS5 sessions
│   ├── skillLoader.ts          # Markdown skill parser
│   ├── skillCreator.ts         # Auto skill generation
│   ├── ragEngine.ts            # RAG chunk + similarity
│   ├── instructionLoader.ts    # AGENTS.md / CODER.md rules
│   ├── customToolLoader.ts     # JSON custom tool executor
│   ├── pluginManager.ts        # Plugin manifest loader
│   ├── pluginAPI.ts            # Safe plugin API
│   ├── cronScheduler.ts        # Lightweight cron engine
│   ├── agentLoop.ts            # Autonomous REACT loop
│   ├── subagentManager.ts      # Subagent spawn/manage
│   ├── permissions.ts          # Permission engine
│   ├── hooks.ts                # Lifecycle hook registry
│   ├── agentLoader.ts          # .cvr/agents/*.md configs
│   ├── prompts.ts              # Async system prompt builder
│   └── tools.ts                # Tool execution dispatcher
├── types/              # TypeScript types
├── services/           # Business logic
├── utils/              # Utilities
└── App.tsx
```

### The `.cvr/` Directory

All user-configurable extensibility lives in `.cvr/`:

```
.cvr/
├── agents/         # Agent configs (build.md, explore.md)
│   └── *.md        # YAML frontmatter + body
├── skills/         # Skill definitions
│   └── *.md        # YAML frontmatter + instructions
├── rules/          # Instruction rules
│   └── *.md        # YAML frontmatter + priority
├── tools/          # Custom tools
│   └── *.json      # Tool definitions
├── plugins/        # Plugins
│   └── */manifest.json
└── permissions.json # Permission rules
```

### State Management

- **Settings**: `useSettings` hook
- **Chat**: `useChat` hook with history persistence
- **Memory**: `usePersistentMemory` hook for MEMORY.md / USER.md
- **Sessions**: `useSessionSearch` hook with SQLite FTS5
- **Cron**: `useCron` hook for scheduled tasks

## 📦 Installation

See [VSCODE_EXTENSION.md](VSCODE_EXTENSION.md) for detailed installation instructions.

## 💻 Development

### Setup

```bash
# Root project (frontend + server)
npm install
npm run dev

# VS Code extension
cd vscode
npm install
npm run build
npx @vscode/vsce package
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Format code
npm run format
```

### Building

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

## 🔧 Configuration

### Local AI Setup

**Ollama:**
```bash
ollama pull llama3
ollama serve
```

### Cloud AI Setup

Configure API keys in Settings or `.env`:
- **Gemini**: `GEMINI_API_KEY`
- **OpenAI**: `OPENAI_API_KEY`
- **Anthropic**: `ANTHROPIC_API_KEY`
- **DeepSeek**: `DEEPSEEK_API_KEY`
- **Groq**: `GROQ_API_KEY`
- **OpenRouter**: `OPENROUTER_API_KEY`
- **Together**: `TOGETHER_API_KEY`
- **Mistral**: `MISTRAL_API_KEY`
- **BaseTen**: `BASETEN_API_KEY`

### Health Check

The server provides a health endpoint for monitoring:

```bash
curl http://localhost:3000/api/health
# Returns: {"status":"ok","uptime":123.45,"timestamp":"...","version":"1.0.0"}
```

### Logging

Set log level via environment variable:

```bash
LOG_LEVEL=debug npm run dev  # Verbose logging
LOG_LEVEL=info npm run dev   # Normal (default)
LOG_LEVEL=warn npm run dev   # Warnings only
LOG_LEVEL=error npm run dev  # Errors only
```

### Permission Rules

Create `.cvr/permissions.json`:

```json
{
  "rules": [
    { "pattern": "read_file", "action": "allow" },
    { "pattern": "write_file", "action": "ask" },
    { "pattern": "*.env*", "action": "deny" }
  ],
  "defaultAction": "ask"
}
```

### Custom Agents

Create `.cvr/agents/my-agent.md`:

```yaml
---
id: my-agent
triggers: ["/my"]
priority: 10
---
# My Agent
You are a specialized agent for...
```

### Custom Skills

Create `.cvr/skills/my-skill.md`:

```yaml
---
id: my-skill
name: My Skill
triggers: ["refactor", "optimize"]
---
# Instructions
When triggered, follow these steps...
```

### Custom Tools

Create `.cvr/tools/my-tool.json`:

```json
{
  "id": "my-tool",
  "name": "My Tool",
  "description": "Does something useful",
  "handler": { "type": "command", "command": "echo hello" },
  "parameters": { "name": { "type": "string", "required": true } }
}
```

### Rules / Instructions

Create `.cvr/rules/AGENTS.md`:

```yaml
---
priority: 100
---
# AGENTS Instructions
Always write tests before implementation...
```

### Plugins

Create `.cvr/plugins/my-plugin/manifest.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "hooks": [
    { "point": "loop.step", "handler": "console.log('Step:', ctx)" }
  ]
}
```

### Cron Tasks

Via UI or API:

```bash
curl -X POST http://localhost:3000/api/cron \
  -H "Content-Type: application/json" \
  -d '{"name":"Backup","schedule":"every 1 hour","command":"agent:backup","enabled":true}'
```

### Git Automation

The Git panel shows repository status, diff, and commit history. Enable auto-commit in Settings to automatically commit after agent loop completion.

### Cost Tracking

Costs are tracked automatically per provider. Set a budget in the Costs panel to get warnings. View breakdown by provider and time period.

### Voice Input

Enable in Settings → Voice Input. Click the microphone button in the chat input to dictate. Supports auto-send after silence.

### MCP Server

Configure `.cvr/mcp.json`:

```json
{
  "enabled": true,
  "transport": "sse",
  "basePath": "/mcp"
}
```

Use the VS Code command `cvr.name: Start MCP Server` to get the endpoint URL. Connect Claude Desktop or Cursor.

### Code Review Mode

Toggle to REVIEW mode or type `/review` to analyze the current git diff. The AI returns categorized comments (style, bug, security, performance, architecture) with severity levels. Accept or reject each suggestion inline.

### Vision Support

Enable in Settings → Vision. Click the image icon in the chat input to upload images. Supports drag-and-drop. Works with Gemini, OpenAI GPT-4o, and Anthropic Claude vision models.

### Browser Use

The agent can control a browser via Playwright tools:
- `browser_navigate` — go to URL
- `browser_click` — click element
- `browser_screenshot` — capture page
- `browser_evaluate` — run JavaScript

Requires: `npx playwright install chromium`

### Team Sync

Configure `.cvr/sync.json`:

```json
{
  "enabled": true,
  "provider": "git",
  "repo": "git@github.com:team/cvr-sync.git",
  "interval": 300,
  "encrypt": true
}
```

Syncs MEMORY.md, USER.md, sessions, and history across team members via git or cloud storage.

## 🎨 Features

### Multi-Agent System
- **Build Agent** — Default developer for coding tasks
- **Explore Agent** — Codebase exploration
- **Scout Agent** — Analysis and research
- **Prometheus Agent** — Strategic planning
- **Custom Agents** — Define your own via `.cvr/agents/*.md`

### Memory System
- **Persistent Memory** — Agent-written `.opencode-infinite/MEMORY.md`
- **User Preferences** — `.opencode-infinite/USER.md`
- **Auto skill creation** — Completed loops become skills
- **RAG** — Semantic search over ingested documents

### Commands
- `/analyze` — Deep project structure analysis
- `/fix` — Scan and repair code anomalies
- `/optimize` — Code complexity optimization
- `/audit` — Security and best practices audit
- `/explain` — Decode logic and architecture
- `/refactor` — Optimize and clean code

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Express.js, Node.js, SQLite (better-sqlite3)
- **AI Integration**: Google GenAI SDK, OpenAI-compatible APIs
- **State Management**: React hooks, localStorage, SQLite
- **Testing**: Vitest, @testing-library/react, jsdom

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.
