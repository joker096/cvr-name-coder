# Codebase Improvements Design

**Date**: 2026-05-20
**Status**: Approved

## Overview

Comprehensive improvement plan for cvr.name.coder codebase focusing on test stability, code organization, and type safety.

## Current State

| Metric | Value |
|--------|-------|
| Failing tests | 82 / 249 (33%) |
| extension.ts | 61KB monolithic |
| server.ts | 35KB, duplicates logic |
| tools.ts | 15KB, multiple responsibilities |
| `any` types | Multiple in entry points |

## Phase 1: Test Stabilization

### Goals
- Fix all 82 failing tests
- Establish reliable test infrastructure

### Tasks
1. Create unified `vitest.setup.ts` with:
   - `fetch` mock
   - `localStorage` mock
   - VS Code API mock
   - `matchMedia` mock

2. Fix test categories:
   - `useValidation.test.ts` (6 failing)
   - `ModelConfig.test.tsx` (17 failing)
   - `useAIProviders.test.ts` (8 failing)
   - `ProviderSelector.test.tsx` (2 failing)
   - `useAutoDetect.test.ts` (2 failing)

3. Add missing test utilities:
   - `createMockConfig()` helper
   - `createMockProvider()` helper
   - `waitFor()` wrapper for async

### Success Criteria
- All 249 tests pass
- `npm test` exits with code 0

## Phase 2: Entry Point Refactoring

### Goals
- Split monolithic files into focused modules
- Eliminate code duplication between server.ts and extension.ts

### extension.ts Split (61KB → 5 files)
```
vscode/src/
├── extension/
│   ├── index.ts        # Entry point (~2KB)
│   ├── server.ts       # Express setup (~5KB)
│   ├── providers.ts     # AI provider handlers (~8KB)
│   ├── tools.ts         # Tool execution (~6KB)
│   └── routes.ts        # API routes (~8KB)
└── extension.ts         # Re-exports only (~1KB)
```

### server.ts Split (35KB → 4 files)
```
src/server/
├── standalone/
│   ├── index.ts         # Entry point (~2KB)
│   ├── routes.ts        # API routes (~8KB)
│   └── middleware.ts    # Express middleware (~3KB)
└── shared.ts            # Already exists
```

### Success Criteria
- No file > 15KB
- Both entry points use `src/server/shared.ts`
- TypeScript compiles without errors

## Phase 3: Type Safety

### Goals
- Eliminate `any` types
- Add runtime validation with Zod

### Tasks
1. Replace `any` in:
   - `server.ts` → use `ChatRequest`, `ChatResponse` from `api.ts`
   - `extension.ts` → same types
   - Tool handlers → use `ToolCall` type

2. Add Zod schemas:
   ```typescript
   const ChatRequestSchema = z.object({
     message: z.string(),
     config: ChatConfigSchema,
     history: z.array(MessageSchema).optional()
   });
   ```

3. Add type guards:
   ```typescript
   function isToolCall(obj: unknown): obj is ToolCall {
     return typeof obj === 'object' && 
            obj !== null && 
            'name' in obj;
   }
   ```

### Success Criteria
- `tsc --noEmit` passes with strict mode
- No `any` types in production code
- Runtime validation catches invalid inputs

## Phase 4: Tools Modularization

### Goals
- Split tools.ts into focused modules

### Structure
```
src/server/tools/
├── index.ts           # Registry & executeTool (~3KB)
├── file.ts            # read, write, glob, grep (~4KB)
├── git.ts             # git operations (~3KB)
├── web.ts             # fetch, browser (~3KB)
├── mcp.ts             # MCP tools (~2KB)
└── system.ts          # bash, env (~2KB)
```

### Success Criteria
- Each file < 5KB
- Single responsibility per module
- All tools still work

## Implementation Order

1. Phase 1 (Tests) — Foundation for safe refactoring
2. Phase 2 (Entry Points) — Largest impact on maintainability
3. Phase 3 (Types) — Safety net for future changes
4. Phase 4 (Tools) — Polish, lower priority

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Run tests after each change |
| VS Code extension breaks | Test in VS Code after Phase 2 |
| Type errors cascade | Incremental migration, not big bang |

## Estimated Effort

- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 1 hour
- Phase 4: 1 hour

**Total**: 5-7 hours
