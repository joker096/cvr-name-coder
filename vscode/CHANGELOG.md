# Changelog

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
