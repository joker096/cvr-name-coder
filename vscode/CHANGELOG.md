# Changelog

## 1.5.29 — Feature Description Refresh

### Added
- **Marketplace metadata refresh** — Extension description and keywords now reflect the current product surface in VS Code Marketplace
- **README refresh** — VS Code README now highlights Goal Loop, Project Oracle RAG, design systems, code review, browser automation, vision, cron tasks, Agent Marketplace, team sync, and MCP server support

### Changed
- **Feature positioning** — Store-facing copy is now aligned with the functionality already shipped in the extension
- **Architecture overview** — README endpoint summary now includes goal, review, browser, cron, and marketplace APIs

### Fixed
- **Outdated listing copy** — The extension no longer looks limited to the older chat + local LLM + MCP subset in Marketplace materials

## 1.5.0 — Phase 2+3: Intelligence & Ecosystem 🎉

### Added
- **Persistent Cache (SQLite)** — Two-level caching L1 (in-memory) + L2 (SQLite WAL), SHA-256 + TTL, warm-up from DB
- **Multi-Model Swapping** — Dual model routing with think/code/auto purpose-based selection
- **Project Oracle** — Auto-index workspace into RAG on startup (30+ text file types, skip node_modules/.git)
- **Context Window** — Token budget 128K with priority-based trimming (CRITICAL→HIGH→NORMAL→LOW)
- **A/B Prompt Testing** — Run N prompt variants, AI-judge comparison (quality/efficiency/creativity)
- **PR Agent** — Auto-generate PR title/description from git diff, create PR via `gh cli`
- **Issue Tracker** — Unified API for Jira REST v3 / Linear GraphQL / GitHub Issues (CRUD + comments)
- **CI/CD Generator** — Generate GitHub Actions workflows (4 types: node-ci, docker-deploy, cvr-agent, static-deploy)
- **Self-Hosting Gateway** — Dockerfile, docker-compose.yml, deploy.sh (one-command deployment)
- **Web Dashboard** — Real-time server monitoring (heap, cache hit rate, requests, active loops, errors)
- **Gamification** — Level/XP, Health/Focus, Coins/Streak system with GamerStatusBar component
- **P2P Collaboration Sync** — WebSocket peer-to-peer with AES-256-GCM encrypted shares
- **Agent Marketplace** — Local registry for publishing/downloading/rating/reviewing agents, skills, plugins, rules
- **Health endpoint enhanced** — Now returns stats (requests, cache hits/misses, tool calls, active loops, errors) + system info
- **Tools expanded** — 25→31 tools (+git_branch, git_pr_context, git_create_pr, git_list_prs, issue_create, issue_list, issue_view, issue_comment)

### Changed
- **Tool execution** — Now tracks tool calls for dashboard metrics
- **Agent loop** — Tracks active loop count for gamification and dashboard
- **Chat flow** — Context window replaces hardcoded history.slice(-10) with priority-based sliding window
- **Server startup** — Non-blocking Project Oracle indexing, P2P sync setup (opt-in via env vars)
- **Settings UI** — Multi-Model toggles + thinking model selector in Settings → Chat AI

### Files
- 23 new files added (12 server modules, 4 component files, 3 deployment files, 4 type declarations)
- Total codebase: 28 components, 31 tools, 100+ API endpoints, 7 agents

### Added
- **Modular component architecture** — 20+ reusable components with clear separation of concerns
- **Custom React hooks** — 7 custom hooks for state management (useSettings, useChat, useMemory, etc.)
- **Business logic services** — 3 services for storage, validation, and preset management
- **Comprehensive TypeScript types** — Full type coverage with 0 errors
- **Test infrastructure** — 27 test files for all components and hooks
- **Preset management system** — Create, apply, and delete configuration presets
- **Enhanced validation** — Clear error and warning messages for all inputs
- **Improved documentation** — ARCHITECTURE.md, TEST_RESULTS.md, and updated README.md

### Changed
- **Massive code reduction** — App.tsx reduced from 2,539 to 176 lines (93% reduction)
- **Component extraction** — All UI components extracted into separate files
- **State management** — Replaced inline state with custom hooks
- **Service layer** — Business logic separated into reusable services
- **Type safety** — Full TypeScript coverage with strict type checking
- **Code organization** — Clear directory structure (components/, hooks/, services/, types/, utils/)

### Fixed
- **All TypeScript errors** — 0 errors in production code
- **Tailwind CSS issues** — Fixed unknown utility class errors
- **Import/export issues** — Fixed all module resolution problems
- **Type definition issues** — Added missing types and fixed type mismatches

### Performance
- **Build optimization** — Successful production build with 1.2MB bundle
- **No performance degradation** — All features working as expected
- **Improved maintainability** — Easy to add new features and fix bugs

## 1.2.0 — Improved Readability & Localization

### Added
- **12 new languages** — German, French, Portuguese, Italian, Japanese, Korean, Arabic, Turkish, Polish, Ukrainian, Vietnamese, Hindi
- **Sidebar close button** — X button appears when sidebar is open on desktop
- **Improved font sizes** — All text elements increased for better readability

### Changed
- **Removed Files tab** — Duplicates VS Code Explorer, removed from sidebar
- **Removed Brain icon** — Simplified UI, removed brain icon from all locations
- **Increased font sizes** — Main text: 12px → 16px, Headers: 9px → 13px, Buttons: 8px → 12px

### Fixed
- **Font readability** — All text elements now have larger, more readable sizes
- **Icon consistency** — Replaced Brain icon with Settings icon throughout the app

## 1.1.0 — Self-Contained & Streaming

### Added
- **Self-contained extension** — Express server starts inside VS Code, no external processes needed
- **Streaming SSE responses** — AI output appears token-by-token in real time
- **Cancel button** — Abort in-flight requests via AbortController
- **Workspace integration** — Agent reads project file tree and file contents
- **Multi-session chat** — Tab-based conversation switching with save/load
- **Auto-save** — Sessions saved automatically 3s after last message
- **Syntax highlighting** — Prism-based code highlighting with copy button
- **Files explorer in sidebar** — Browse workspace files, click to preview
- **MCP (Model Context Protocol)** — Run MCP tool servers, agent uses their tools
- **Status bar indicator** — Shows cvr.name status (starting/running/error)
- **Command palette** — `cvr.name: Launch Dashboard`, `cvr.name: Open Sidebar`, `cvr.name: Clear History`
- **Keyboard shortcut** — `Ctrl+Shift+C` / `Cmd+Shift+C` to open sidebar

### Changed
- **Bundled with esbuild** — 808 files → 10 files, 26MB → 2MB package size
- **Lazy server start** — Server starts only when sidebar opens or after 2s delay
- **Default provider** — Changed from `gemini` to `local` (Ollama)
- **Updated accent color** — From bright blue `#3E5CFF` to muted steel `#5B6B8A`
- **Minimal header** — Removed logo and branding text to save space

### Fixed
- **Missing handleSend declaration** — Function was broken after refactor
- **Binary icons** — Resized from 1408x768 to 128x128 square
- **Dark theme consistency** — Select dropdowns, scrollbars, native elements

## 1.0.0 — Initial VS Code Extension

- Sidebar webview with cvr.name.coder dashboard
- AI provider selection (Gemini, OpenAI, Anthropic, DeepSeek, Groq, Local, Custom)
- Local model support (Ollama, LM Studio, LocalAI)
- Persistent memory with Dreamer compression engine
- Autonomous recursive loop
- Multi-language UI (EN, RU, ES, ZH)
- Settings panel with full provider configuration
