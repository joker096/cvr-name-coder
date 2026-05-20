# TypeScript Type Improvements Design

**Goal:** Increase type coverage from 94.72% to ~99% by replacing `any` types with proper interfaces, discriminated unions, and type guards.

## Architecture

### 1. Hook Context Types (Discriminated Union)

**File:** `src/types/hooks.ts`

```typescript
// Base types for each hook point
interface ToolBeforeData {
  tool: string;
  params: Record<string, unknown>;
}

interface ToolAfterData {
  tool: string;
  params: Record<string, unknown>;
  result: string;
  success: boolean;
}

interface MessageBeforeData {
  role: "user" | "assistant";
  content: string;
}

interface MessageAfterData {
  role: "user" | "assistant";
  content: string;
  tokens?: number;
}

interface FileWriteBeforeData {
  path: string;
  content: string;
}

interface FileWriteAfterData {
  path: string;
  content: string;
  success: boolean;
}

interface LoopStartData {
  agentId: string;
  task: string;
}

interface LoopStepData {
  step: number;
  tool?: string;
  result?: string;
}

interface LoopCompleteData {
  agentId: string;
  steps: number;
  success: boolean;
}

interface LoopErrorData {
  agentId: string;
  step: number;
  error: Error;
}

// Discriminated union mapping
type HookDataMap = {
  "tool.before": ToolBeforeData;
  "tool.after": ToolAfterData;
  "message.before": MessageBeforeData;
  "message.after": MessageAfterData;
  "file.write.before": FileWriteBeforeData;
  "file.write.after": FileWriteAfterData;
  "loop.start": LoopStartData;
  "loop.step": LoopStepData;
  "loop.complete": LoopCompleteData;
  "loop.error": LoopErrorData;
};

// Typed HookContext using discriminated union
export interface HookContext<P extends HookPoint = HookPoint> {
  hookPoint: P;
  data: HookDataMap[P];
  timestamp: number;
  sessionId: string;
}
```

### 2. Error Handling Pattern

**Pattern:** Replace `catch (e: any)` with `catch (e: unknown)` + type guard.

**File:** `src/types/errors.ts` (new)

```typescript
export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

export function getErrorMessage(e: unknown): string {
  if (isError(e)) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}
```

### 3. Database Types

**File:** `src/types/database.ts` (new)

```typescript
export interface DatabaseStatement {
  run(...params: unknown[]): { lastInsertRowid: number; changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface Database {
  prepare(sql: string): DatabaseStatement;
  exec(sql: string): void;
  pragma(pragma: string): void;
}

export interface RagChunk {
  id: number;
  source: string;
  content: string;
  embedding: string;
}
```

### 4. Frontmatter Types

**File:** `src/types/frontmatter.ts` (new)

```typescript
export interface SkillFrontmatter {
  id?: string;
  name?: string;
  description?: string;
  triggers?: string[];
}

export interface ParsedFrontmatter<T extends Record<string, unknown> = Record<string, unknown>> {
  frontmatter: T;
  body: string;
}

export function isSkillFrontmatter(obj: unknown): obj is SkillFrontmatter {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    (o.id === undefined || typeof o.id === "string") &&
    (o.name === undefined || typeof o.name === "string") &&
    (o.description === undefined || typeof o.description === "string") &&
    (o.triggers === undefined || Array.isArray(o.triggers))
  );
}
```

### 5. Browser Tools Interface

**File:** `src/types/browser.ts` (new)

```typescript
export interface BrowserNavigateResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface BrowserTools {
  browserNavigate(url: string): Promise<BrowserNavigateResult>;
  browserClick(selector: string): Promise<{ success: boolean; output?: string }>;
  browserScreenshot(): Promise<{ success: boolean; output?: string }>;
  browserEvaluate(script: string): Promise<{ success: boolean; output?: string }>;
}
```

## Implementation Plan

### Phase 1: Core Types
1. Create `src/types/errors.ts` with error utilities
2. Create `src/types/database.ts` with Database interface
3. Create `src/types/frontmatter.ts` with frontmatter types
4. Create `src/types/browser.ts` with browser tools interface

### Phase 2: Hook System
1. Update `src/types/hooks.ts` with discriminated union
2. Update `src/server/hooks.ts` to use typed context

### Phase 3: Server Files
1. Update `src/server/ragEngine.ts` - use Database interface
2. Update `src/server/skillLoader.ts` - use frontmatter types
3. Update `src/server/customToolLoader.ts` - use error utilities
4. Update `src/server/gitTools.ts` - use error utilities
5. Update `src/server/tools.ts` - use BrowserTools interface

### Phase 4: Verification
1. Run `npx type-coverage --ignoreFiles "**/*.js"` - target 99%+
2. Run `npm run type-check` - zero errors
3. Run `npm test` - all tests pass

## Constraints

- No runtime behavior changes
- No new dependencies
- Maintain backward compatibility
- All changes must pass existing tests

## Success Criteria

- Type coverage >= 99% (excluding .js files)
- Zero TypeScript compiler errors
- All existing tests pass
- No `any` types in source files (except justified cases)
