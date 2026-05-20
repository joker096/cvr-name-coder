# AGENTS.md - AI Coder Instructions

> This file provides instructions for AI coding agents working on this codebase.

## Project Overview

cvr.name.coder is an autonomous AI coding agent that runs as a VS Code extension. It features:
- Multi-provider AI support (Gemini, OpenAI, Anthropic, DeepSeek, Groq, local LLMs)
- Streaming responses via SSE
- Persistent memory system (MEMORY.md, USER.md)
- Skills system for learned behaviors
- Agent loop for autonomous task execution
- Permission system for safe tool execution

## Architecture

```
cvr.name.coder/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── server/             # Server-side logic (shared with extension)
│   ├── types/              # TypeScript type definitions
│   └── App.tsx             # Main React app
├── vscode/                  # VS Code extension
│   └── src/extension.ts    # Extension entry point
├── server.ts               # Standalone server entry
└── .cvr/                   # User configuration directory
    ├── agents/             # Custom agent configs
    ├── skills/             # Skill definitions
    ├── rules/              # Instruction rules
    └── tools/              # Custom tool definitions
```

## Key Patterns

### 1. Dual Entry Points
- `server.ts` - Standalone Express server for development
- `vscode/src/extension.ts` - VS Code extension with embedded server

Both share code from `src/server/` directory.

### 2. Tool Execution Flow
```
User Message → /api/chat → buildSystemPrompt() → AI Provider → Tool Calls → executeTool() → Response
```

### 3. Memory System
- `.opencode-infinite/MEMORY.md` - Project-specific memory
- `.opencode-infinite/USER.md` - User preferences
- Auto-compression via "Dreamer Engine" every 5 messages

### 4. Permission System
- Rules in `.cvr/permissions.json`
- Actions: `allow`, `ask`, `deny`
- Pattern matching on tool names and file paths

## Coding Standards

### TypeScript
- Use strict mode
- Avoid `any` - use proper types from `src/types/`
- Prefer interfaces over type aliases for object shapes
- Use Zod for runtime validation

### React
- Functional components with hooks
- Controlled components for forms
- Use `cn()` utility for conditional classes

### API Design
- RESTful endpoints under `/api/`
- SSE for streaming responses
- JSON request/response bodies
- Proper HTTP status codes

### Error Handling
- Always catch and return meaningful errors
- Log errors with context
- Graceful degradation for AI provider failures

## Common Tasks

### Adding a New AI Provider
1. Add provider to `src/types/ai.ts`
2. Implement in `src/server/providers.ts` (or `extension.ts`)
3. Add to provider selector in `SettingsModal.tsx`

### Adding a New Tool
1. Define in `src/types/tools.ts` (TOOL_DEFINITIONS)
2. Implement in `src/server/tools.ts` executeTool switch
3. Add to READ_ONLY_TOOLS if read-only

### Adding a New Agent
1. Add to `AGENT_PROMPTS` in `src/server/prompts.ts`
2. Add to `AGENT_CONFIG` in `src/App.tsx`
3. Add to `AgentId` type in `src/types/settings.ts`

## Testing

```bash
npm test              # Run all tests
npm run type-check    # TypeScript validation
```

## Important Files

| File | Purpose |
|------|---------|
| `src/server/tools.ts` | Tool execution logic |
| `src/server/prompts.ts` | System prompt builder |
| `src/server/agentLoop.ts` | Autonomous agent loop |
| `src/server/permissions.ts` | Permission engine |
| `src/server/logger.ts` | Structured logging system |
| `src/server/cache.ts` | AI response caching |
| `src/server/shared.ts` | Shared code between server.ts and extension.ts |
| `src/types/api.ts` | API request/response types |
| `src/hooks/useChat.ts` | Chat state management |
| `src/App.tsx` | Main UI component |

## Security Considerations

- API keys stored in environment variables or localStorage
- Path traversal protection in file operations
- Rate limiting on API endpoints
- Permission checks before tool execution
- CSP headers in production

## Performance Notes

- History limited to last 10 messages in context
- Memory compression every 5 messages
- Streaming responses for better UX
- Lazy loading for React components

## Known Issues

1. ~~Duplicate code between server.ts and extension.ts~~ → Use `src/server/shared.ts`
2. ~~Some `any` types need proper typing~~ → Use `src/types/api.ts`
3. ~~No caching for repeated AI requests~~ → Use `src/server/cache.ts`
4. ~~No health check endpoint~~ → Use `/api/health`
5. ~~No structured logging~~ → Use `src/server/logger.ts`
6. ~~Monolithic tools.ts~~ → Use `src/server/tools/` modules
7. Some tests are flaky (network-dependent) - 16 failing, 7 skipped

## When Making Changes

1. Run `npm run type-check` before committing
2. Update types in `src/types/` when adding new features
3. Keep server.ts and extension.ts in sync for shared logic
4. Test with multiple AI providers if changing AI integration
5. Update README.md for user-facing changes
