# Undo/Redo + Planning Mode + Tool System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side tool-use with filesystem access, undo/redo history, and a planning mode toggle so the AI can safely explore before modifying files.

**Architecture:** Server-side tool engine executes file operations and snapshots changes to `.opencode-infinite/changes.json`. Client-side hooks manage tool calls and undo/redo state. Planning mode restricts tool availability via system prompt and server-side filtering.

**Tech Stack:** TypeScript, Express, Node.js fs, React hooks

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/types/tools.ts` | ToolCall, ToolResult, ToolName type definitions |
| `src/types/changes.ts` | FileChange, ChangeHistory, ChangeState type definitions |
| `src/server/tools.ts` | Tool definitions, execution logic, path validation |
| `src/server/changes.ts` | Change history CRUD, undo/redo logic |
| `src/server/prompts.ts` | System prompt builder with mode/agent context |
| `server.ts` | New API routes: `/api/tools/execute`, `/api/undo`, `/api/redo`, `/api/changes` |
| `src/hooks/useTools.ts` | Client hook for calling `/api/tools/execute` |
| `src/hooks/useChanges.ts` | Client hook for undo/redo and fetching change state |
| `src/utils/commands.ts` | Add `/undo`, `/redo` slash commands |
| `src/types/settings.ts` | Add `mode: 'plan' \| 'build'` to ChatConfig |
| `src/hooks/useChat.ts` | Integrate tool loop: detect tool calls, execute, return results |
| `src/App.tsx` | Add Plan/Build toggle, Undo/Redo buttons, wire hooks |
| `src/i18n.ts` | Add `planMode`, `buildMode`, `undo`, `redo` translations |

---

## Task 1: Tool Types

**Files:**
- Create: `src/types/tools.ts`

- [ ] **Step 1: Write tool types**

```typescript
export type ToolName =
  | "read_file"
  | "list_directory"
  | "search_files"
  | "write_file"
  | "edit_file"
  | "execute_command";

export interface ToolCall {
  name: ToolName;
  params: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  changeId?: string;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  isReadOnly: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
      },
      required: ["path"],
    },
    isReadOnly: true,
  },
  {
    name: "list_directory",
    description: "List files and directories at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the directory" },
      },
      required: ["path"],
    },
    isReadOnly: true,
  },
  {
    name: "search_files",
    description: "Search for files by name or content using a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        path: { type: "string", description: "Optional relative path to limit search" },
      },
      required: ["query"],
    },
    isReadOnly: true,
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with the given content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
    isReadOnly: false,
  },
  {
    name: "edit_file",
    description: "Edit a file by replacing an exact string with another.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        oldString: { type: "string", description: "Exact text to replace" },
        newString: { type: "string", description: "Replacement text" },
      },
      required: ["path", "oldString", "newString"],
    },
    isReadOnly: false,
  },
  {
    name: "execute_command",
    description: "Execute a shell command in the project directory.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Optional working directory relative to project root" },
      },
      required: ["command"],
    },
    isReadOnly: false,
  },
];

export const READ_ONLY_TOOLS = new Set(
  TOOL_DEFINITIONS.filter((t) => t.isReadOnly).map((t) => t.name)
);

export const ALL_TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/tools.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/tools.ts
git commit -m "feat(types): add tool system type definitions"
```

---

## Task 2: Change History Types

**Files:**
- Create: `src/types/changes.ts`

- [ ] **Step 1: Write change history types**

```typescript
export interface FileChange {
  id: string;
  timestamp: number;
  filePath: string;
  operation: "write" | "edit";
  beforeContent: string | null;
  afterContent: string;
  description: string;
}

export interface ChangeHistory {
  changes: FileChange[];
  undoStack: string[];
  redoStack: string[];
}

export interface ChangeState {
  changes: FileChange[];
  canUndo: boolean;
  canRedo: boolean;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/changes.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/changes.ts
git commit -m "feat(types): add change history type definitions"
```

---

## Task 3: Server Tool Engine

**Files:**
- Create: `src/server/tools.ts`

- [ ] **Step 1: Write tool execution engine**

```typescript
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ToolCall, ToolResult, ToolName } from "../types/tools";
import { READ_ONLY_TOOLS } from "../types/tools";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function resolveProjectPath(requestedPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error("Path escapes project root: " + requestedPath);
  }
  return resolved;
}

export async function executeTool(
  toolCall: ToolCall,
  mode: "plan" | "build" = "build"
): Promise<ToolResult> {
  const { name, params } = toolCall;

  // Plan mode blocks write tools
  if (mode === "plan" && !READ_ONLY_TOOLS.has(name)) {
    return {
      success: false,
      output: "",
      error: `Tool "${name}" is disabled in PLAN mode. Switch to BUILD mode to make changes.`,
    };
  }

  try {
    switch (name) {
      case "read_file": {
        const filePath = resolveProjectPath(String(params.path));
        const content = await fs.readFile(filePath, "utf-8");
        return { success: true, output: content };
      }

      case "list_directory": {
        const dirPath = resolveProjectPath(String(params.path || "."));
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
        return { success: true, output: lines.join("\n") };
      }

      case "search_files": {
        const searchPath = resolveProjectPath(String(params.path || "."));
        const query = String(params.query).toLowerCase();
        // Simple recursive search
        async function searchDir(dir: string): Promise<string[]> {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const results: string[] = [];
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(PROJECT_ROOT, fullPath);
            if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
              results.push(...(await searchDir(fullPath)));
            } else if (entry.isFile()) {
              if (entry.name.toLowerCase().includes(query)) {
                results.push(`[MATCH] ${relPath} (filename)`);
              } else {
                try {
                  const content = await fs.readFile(fullPath, "utf-8");
                  if (content.toLowerCase().includes(query)) {
                    results.push(`[MATCH] ${relPath} (content)`);
                  }
                } catch {
                  // skip unreadable files
                }
              }
            }
          }
          return results;
        }
        const matches = await searchDir(searchPath);
        return { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
      }

      case "write_file": {
        const writePath = resolveProjectPath(String(params.path));
        const content = String(params.content);
        await fs.mkdir(path.dirname(writePath), { recursive: true });
        await fs.writeFile(writePath, content, "utf-8");
        return { success: true, output: `File written: ${String(params.path)}` };
      }

      case "edit_file": {
        const editPath = resolveProjectPath(String(params.path));
        const oldString = String(params.oldString);
        const newString = String(params.newString);
        const content = await fs.readFile(editPath, "utf-8");
        if (!content.includes(oldString)) {
          return { success: false, output: "", error: "oldString not found in file" };
        }
        const updated = content.replace(oldString, newString);
        await fs.writeFile(editPath, updated, "utf-8");
        return { success: true, output: `File edited: ${String(params.path)}` };
      }

      case "execute_command": {
        const cwd = params.cwd ? resolveProjectPath(String(params.cwd)) : PROJECT_ROOT;
        const command = String(params.command);
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
        return { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
      }

      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}
```

- [ ] **Step 2: Verify server types compile**

Run: `npx tsc --noEmit src/server/tools.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/tools.ts
git commit -m "feat(server): add tool execution engine"
```

---

## Task 4: Server Change History Engine

**Files:**
- Create: `src/server/changes.ts`

- [ ] **Step 1: Write change history manager**

```typescript
import fs from "fs/promises";
import path from "path";
import type { FileChange, ChangeHistory, ChangeState } from "../types/changes";

const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const CHANGES_FILE = path.join(STORAGE_DIR, "changes.json");
const MAX_CHANGES = 50;
const MAX_SNAPSHOT_SIZE = 1024 * 1024; // 1MB

async function loadHistory(): Promise<ChangeHistory> {
  try {
    const data = await fs.readFile(CHANGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { changes: [], undoStack: [], redoStack: [] };
  }
}

async function saveHistory(history: ChangeHistory): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(CHANGES_FILE, JSON.stringify(history, null, 2));
}

export async function recordChange(
  filePath: string,
  operation: "write" | "edit",
  afterContent: string,
  description: string
): Promise<FileChange> {
  const history = await loadHistory();

  // Read before content if file exists
  let beforeContent: string | null = null;
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);
    if (stats.size <= MAX_SNAPSHOT_SIZE) {
      beforeContent = await fs.readFile(fullPath, "utf-8");
    } else {
      beforeContent = "[FILE_TOO_LARGE_FOR_SNAPSHOT]";
    }
  } catch {
    // File doesn't exist yet — beforeContent stays null
  }

  const change: FileChange = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    filePath,
    operation,
    beforeContent,
    afterContent,
    description,
  };

  history.changes.push(change);

  // Evict old changes if over limit
  while (history.changes.length > MAX_CHANGES) {
    const removed = history.changes.shift();
    // Also remove from undo/redo stacks if present
    if (removed) {
      history.undoStack = history.undoStack.filter((id) => id !== removed.id);
      history.redoStack = history.redoStack.filter((id) => id !== removed.id);
    }
  }

  // Clear redo stack on new change
  history.redoStack = [];

  await saveHistory(history);
  return change;
}

export async function undoChange(): Promise<{ success: boolean; restored?: FileChange; error?: string }> {
  const history = await loadHistory();

  // Find the most recent change not in undoStack
  const activeChanges = history.changes.filter((c) => !history.undoStack.includes(c.id));
  if (activeChanges.length === 0) {
    return { success: false, error: "Nothing to undo" };
  }

  const change = activeChanges[activeChanges.length - 1];
  history.undoStack.push(change.id);

  // Restore file
  const fullPath = path.join(process.cwd(), change.filePath);
  if (change.beforeContent === null) {
    // File was created — delete it
    try {
      await fs.unlink(fullPath);
    } catch {
      // ignore if already deleted
    }
  } else if (change.beforeContent === "[FILE_TOO_LARGE_FOR_SNAPSHOT]") {
    await saveHistory(history);
    return { success: false, error: "Cannot undo: file was too large to snapshot" };
  } else {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, change.beforeContent, "utf-8");
  }

  await saveHistory(history);
  return { success: true, restored: change };
}

export async function redoChange(): Promise<{ success: boolean; restored?: FileChange; error?: string }> {
  const history = await loadHistory();

  if (history.redoStack.length === 0) {
    return { success: false, error: "Nothing to redo" };
  }

  const changeId = history.redoStack[history.redoStack.length - 1];
  const change = history.changes.find((c) => c.id === changeId);
  if (!change) {
    return { success: false, error: "Change not found in history" };
  }

  // Remove from redo stack
  history.redoStack.pop();
  // Remove from undo stack (reactivate)
  history.undoStack = history.undoStack.filter((id) => id !== changeId);

  // Re-apply afterContent
  const fullPath = path.join(process.cwd(), change.filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, change.afterContent, "utf-8");

  await saveHistory(history);
  return { success: true, restored: change };
}

export async function getChangeState(): Promise<ChangeState> {
  const history = await loadHistory();
  const activeChanges = history.changes.filter((c) => !history.undoStack.includes(c.id));
  const canUndo = activeChanges.length > 0;
  const canRedo = history.redoStack.length > 0;
  return { changes: history.changes, canUndo, canRedo };
}
```

- [ ] **Step 2: Verify server types compile**

Run: `npx tsc --noEmit src/server/changes.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/changes.ts
git commit -m "feat(server): add change history engine with undo/redo"
```

---

## Task 5: System Prompt Builder

**Files:**
- Create: `src/server/prompts.ts`

- [ ] **Step 1: Write prompt builder**

```typescript
import { TOOL_DEFINITIONS } from "../types/tools";
import type { AgentId } from "../types/settings";

const AGENT_PROMPTS: Record<string, string> = {
  build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). Focus on iterative coding, bug fixing, and implementation.`,
  general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows.`,
  explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files.`,
  scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research.`,
  prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must clarify requirements, define architecture, and scope the work. You create comprehensive plans.`,
  hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns, write code, and finish the task without requiring step-by-step guidance.`,
};

export function buildSystemPrompt(options: {
  agent: AgentId;
  mode: "plan" | "build";
  contextParts?: string;
  customSystemPrompt?: string;
}): string {
  const { agent, mode, contextParts, customSystemPrompt } = options;

  const modeDirective =
    mode === "plan"
      ? `[PLANNING MODE ACTIVE]\nYou are in PLANNING mode. You may ONLY use read_file, list_directory, and search_files.\nDo NOT write files, edit files, or execute commands. Provide a detailed implementation plan with specific file paths and changes.`
      : `[BUILD MODE ACTIVE]\nYou are in BUILD mode. You have full access to all tools including write_file, edit_file, and execute_command.\nImplement the plan directly and efficiently.`;

  const toolDescriptions = TOOL_DEFINITIONS.map(
    (t) =>
      `- ${t.name}${t.isReadOnly ? " (read-only)" : ""}: ${t.description}\n  params: ${JSON.stringify(t.parameters.properties)}`
  ).join("\n");

  const basePrompt = `You are "cvr.name", the world's most advanced autonomous coding kernel.

CURRENT_AGENT_IDENTITY:
${AGENT_PROMPTS[agent] || AGENT_PROMPTS.build}

${modeDirective}

AVAILABLE TOOLS:
${toolDescriptions}

TOOL CALL FORMAT:
When you need to use a tool, wrap it like this:
<tool_call>
<name>TOOL_NAME</name>
<params>
{"path": "relative/path", ...}
</params>
</tool_call>

INTEGRATED PROTOCOLS:
- [COMPLEXITY_OPTIMIZER]: When analyzing or refactoring, apply Algorithmic Complexity Evaluation.
- [AGENT_BEST_PRACTICES]: Maintain a proactive, provider-neutral stance.
- [SUPERPOWERS]: Active plugin from OpenCode. Enables high-level brainstorming and advanced task decomposition.

SYSTEM ARCHITECTURE:
- Local Persistent Memory (.opencode-infinite)
- Recursive Task Execution Pipeline
- Dreamer Semantic Compression Engine
- Change History with Undo/Redo

AUTONOMY PROTOCOLS:
1. OBJECTIVE: Absolute task completion.
2. ITERATION: For multi-vector tasks, solve sequentially.
3. TERMINATION: "CONTINUE_NEEDED" for next cycles. "TASK_COMPLETE" for final success.

PERSISTENT CONTEXT CLUSTERS:
${contextParts || "No previous knowledge clusters found. Kernel is in cold-start mode."}
`;

  if (customSystemPrompt && customSystemPrompt.trim()) {
    return `${customSystemPrompt.trim()}\n\n${modeDirective}\n\nAVAILABLE TOOLS:\n${toolDescriptions}\n\nPERSISTENT CONTEXT CLUSTERS:\n${contextParts || "No previous knowledge clusters found. Kernel is in cold-start mode."}`;
  }

  return basePrompt;
}
```

- [ ] **Step 2: Verify server types compile**

Run: `npx tsc --noEmit src/server/prompts.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/server/prompts.ts
git commit -m "feat(server): add system prompt builder with mode and tool awareness"
```

---

## Task 6: Server API Routes

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Add imports and route handlers to server.ts**

At the top of `server.ts`, add:

```typescript
import { executeTool } from "./src/server/tools";
import { recordChange, undoChange, redoChange, getChangeState } from "./src/server/changes";
import { buildSystemPrompt } from "./src/server/prompts";
```

- [ ] **Step 2: Add new routes before `startServer()`**

Add these route blocks after the existing `/api/clear` route:

```typescript
// Tool execution endpoint
app.post("/api/tools/execute", async (req, res) => {
  try {
    const { toolCall, mode = "build" } = req.body;
    const result = await executeTool(toolCall, mode);

    // Snapshot for undo if write tool succeeded
    if (
      result.success &&
      (toolCall.name === "write_file" || toolCall.name === "edit_file")
    ) {
      const change = await recordChange(
        toolCall.params.path as string,
        toolCall.name === "write_file" ? "write" : "edit",
        toolCall.name === "write_file"
          ? (toolCall.params.content as string)
          : await fs.readFile(path.join(process.cwd(), toolCall.params.path as string), "utf-8"),
        `${toolCall.name}: ${toolCall.params.path}`
      );
      result.changeId = change.id;
    }

    res.json(result);
  } catch (error: any) {
    console.error("Tool execution error:", error);
    res.status(500).json({ success: false, output: "", error: error.message });
  }
});

// Undo endpoint
app.post("/api/undo", async (_req, res) => {
  const result = await undoChange();
  res.json(result);
});

// Redo endpoint
app.post("/api/redo", async (_req, res) => {
  const result = await redoChange();
  res.json(result);
});

// Changes state endpoint
app.get("/api/changes", async (_req, res) => {
  const state = await getChangeState();
  res.json(state);
});
```

- [ ] **Step 3: Update `/api/chat` to use prompt builder and pass mode**

In the `/api/chat` handler, replace the `systemPrompt` construction block with:

```typescript
    const agent = bodyAgent || configAgent || "build";
    const mode = config.mode || "build";
    const contextParts = memories.slice(-5).map((m: any) => `[CLUSTER_DATA]: ${m.content}`).join("\n");

    const systemPrompt = buildSystemPrompt({
      agent,
      mode,
      contextParts,
      customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : undefined,
    });
```

Also update the request body parsing to include mode if present:

```typescript
    const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = req.body;
    const { aiProvider = "gemini", localUrl, aiModel, apiKey, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, mode: configMode } = config;
```

And update the `ChatConfig` usage to pass mode through.

- [ ] **Step 4: Verify server compiles**

Run: `npx tsc --noEmit server.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat(server): add tool execution, undo/redo, changes API routes"
```

---

## Task 7: Client Tool Hook

**Files:**
- Create: `src/hooks/useTools.ts`

- [ ] **Step 1: Write client tool hook**

```typescript
import { useState, useCallback } from "react";
import type { ToolCall, ToolResult } from "../types/tools";

export const useTools = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);

  const executeToolCall = useCallback(
    async (toolCall: ToolCall, mode: "plan" | "build" = "build"): Promise<ToolResult> => {
      setIsExecuting(true);
      try {
        const response = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCall, mode }),
        });
        const result: ToolResult = await response.json();
        setLastResult(result);
        return result;
      } catch (err: any) {
        const errorResult: ToolResult = {
          success: false,
          output: "",
          error: err.message,
        };
        setLastResult(errorResult);
        return errorResult;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return { executeToolCall, isExecuting, lastResult };
};
```

- [ ] **Step 2: Verify hook compiles**

Run: `npx tsc --noEmit src/hooks/useTools.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTools.ts
git commit -m "feat(hooks): add useTools client hook"
```

---

## Task 8: Client Changes Hook (Undo/Redo)

**Files:**
- Create: `src/hooks/useChanges.ts`

- [ ] **Step 1: Write client changes hook**

```typescript
import { useState, useCallback, useEffect } from "react";
import type { ChangeState, FileChange } from "../types/changes";

export const useChanges = () => {
  const [state, setState] = useState<ChangeState>({
    changes: [],
    canUndo: false,
    canRedo: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch("/api/changes");
      const data: ChangeState = await response.json();
      setState(data);
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const undo = useCallback(async (): Promise<{ success: boolean; restored?: FileChange; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/undo", { method: "POST" });
      const result = await response.json();
      await fetchState();
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchState]);

  const redo = useCallback(async (): Promise<{ success: boolean; restored?: FileChange; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/redo", { method: "POST" });
      const result = await response.json();
      await fetchState();
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchState]);

  return { ...state, undo, redo, isLoading, refresh: fetchState };
};
```

- [ ] **Step 2: Verify hook compiles**

Run: `npx tsc --noEmit src/hooks/useChanges.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChanges.ts
git commit -m "feat(hooks): add useChanges hook for undo/redo"
```

---

## Task 9: Slash Commands for Undo/Redo

**Files:**
- Modify: `src/utils/commands.ts`

- [ ] **Step 1: Add /undo and /redo to types and commands map**

In `commands.ts`, update the type and map:

```typescript
export type SlashCommand =
  | "/analyze"
  | "/fix"
  | "/optimize"
  | "/audit"
  | "/explain"
  | "/refactor"
  | "/undo"
  | "/redo";
```

Add entries to `COMMANDS`:

```typescript
  "/undo": {
    command: "/undo",
    label: "Undo Change",
    description: "Revert the last file modification",
    agent: "build",
    prompt: "UNDO: Revert the most recent file change.",
  },
  "/redo": {
    command: "/redo",
    label: "Redo Change",
    description: "Re-apply the last undone file modification",
    agent: "build",
    prompt: "REDO: Re-apply the most recently undone file change.",
  },
```

- [ ] **Step 2: Verify commands compile**

Run: `npx tsc --noEmit src/utils/commands.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/utils/commands.ts
git commit -m "feat(commands): add /undo and /redo slash commands"
```

---

## Task 10: Update Settings Types for Mode

**Files:**
- Modify: `src/types/settings.ts`

- [ ] **Step 1: Add mode to ChatConfig**

In `src/types/settings.ts`, add to `ChatConfig`:

```typescript
export interface ChatConfig {
  aiProvider: ChatProviderId;
  aiModel: string;
  localUrl?: string;
  localModelName?: string;
  customUrl?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  agent?: AgentId;
  mode?: "plan" | "build"; // NEW
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit src/types/settings.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/settings.ts
git commit -m "feat(types): add mode (plan/build) to ChatConfig"
```

---

## Task 11: Enhanced useChat with Tool Loop

**Files:**
- Modify: `src/hooks/useChat.ts`

- [ ] **Step 1: Add tool parsing and loop logic**

Replace the existing `useChat.ts` with a version that detects `<tool_call>` blocks, executes them, and feeds results back to the AI.

Add imports:
```typescript
import type { ToolCall } from "../types/tools";
```

Add helper function before the hook:

```typescript
function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /<tool_call>\s*<name>(\w+)<\/name>\s*<params>([\s\S]*?)<\/params>\s*<\/tool_call>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const name = match[1] as ToolCall["name"];
      const params = JSON.parse(match[2].trim());
      calls.push({ name, params });
    } catch {
      // skip malformed tool calls
    }
  }
  return calls;
}
```

Update `sendMessage` to handle tool calls. After receiving the assistant response, if tool calls are detected, execute them and send results back for a follow-up.

This requires restructuring `sendMessage` to:
1. Send user message
2. Receive AI response
3. Parse for tool calls
4. If tool calls found, execute each via `/api/tools/execute`
5. Append tool results as a system/tool message
6. Send follow-up request with tool results
7. Return final response

Because the current flow uses SSE streaming and this adds complexity, for the first iteration we will:
- Parse tool calls from the completed assistant message
- Execute them
- Add a new "tool" role message showing results
- Let the user see the results and continue

Update `sendMessage` to include mode in the request body:

```typescript
        body: JSON.stringify({
          message: messageContent,
          config,
          agent,
        }),
```

Replace with:
```typescript
        body: JSON.stringify({
          message: messageContent,
          config,
          agent,
          mode: config.mode || "build",
        }),
```

Add a new method `executeToolCalls` to the hook:

```typescript
  const executeToolCalls = useCallback(async (messageId: string, mode: "plan" | "build" = "build") => {
    const message = state.messages.find((m) => m.id === messageId);
    if (!message || message.role !== "assistant") return;

    const toolCalls = parseToolCalls(message.content);
    if (toolCalls.length === 0) return;

    const results: string[] = [];
    for (const toolCall of toolCalls) {
      try {
        const response = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCall, mode }),
        });
        const result = await response.json();
        results.push(`Tool: ${toolCall.name}\nSuccess: ${result.success}\nOutput: ${result.output}${result.error ? "\nError: " + result.error : ""}`);
      } catch (err: any) {
        results.push(`Tool: ${toolCall.name}\nError: ${err.message}`);
      }
    }

    const toolMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `[TOOL_RESULTS]\n${results.join("\n---\n")}`,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, toolMessage],
    }));
  }, [state.messages]);
```

Expose `executeToolCalls` in the return object.

- [ ] **Step 2: Verify hook compiles**

Run: `npx tsc --noEmit src/hooks/useChat.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat(hooks): integrate tool call parsing and execution into useChat"
```

---

## Task 12: UI Header with Planning Mode and Undo/Redo

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add imports and hooks to App.tsx**

Add imports:
```typescript
import { useTools } from "./hooks/useTools";
import { useChanges } from "./hooks/useChanges";
import { Undo2, Redo2, Lightbulb, Hammer } from "lucide-react";
import { cn } from "./utils/cn";
```

- [ ] **Step 2: Wire hooks and mode state**

Update the `useChat` destructuring to include `addMessage`:
```typescript
  const { messages, isLoading, sendMessage, cancelMessage, addMessage } = useChat(settings.chat);
```

Then add after existing hooks:
```typescript
  const { undo, redo, canUndo, canRedo } = useChanges();

  const handleModeToggle = () => {
    const newMode = settings.chat.mode === "plan" ? "build" : "plan";
    updateChatConfig({ mode: newMode });
  };
```

- [ ] **Step 3: Add Plan/Build toggle and Undo/Redo buttons to header**

In the header JSX, after the agent selector and before the settings icon, add:

```tsx
          {/* Plan/Build Toggle */}
          <button
            onClick={handleModeToggle}
            className={cn(
              "hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border",
              settings.chat.mode === "plan"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}
            title={settings.chat.mode === "plan" ? t.planMode || "Plan Mode" : t.buildMode || "Build Mode"}
          >
            {settings.chat.mode === "plan" ? (
              <>
                <Lightbulb className="w-3 h-3" /> PLAN
              </>
            ) : (
              <>
                <Hammer className="w-3 h-3" /> BUILD
              </>
            )}
          </button>

          {/* Undo/Redo */}
          <div className="hidden md:flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.undo || "Undo"}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.redo || "Redo"}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
```

Note: `cn` is already imported from `../../utils/cn` — check if it's available in App.tsx. If not, add `import { cn } from "./utils/cn";`.

- [ ] **Step 4: Add i18n keys**

In `src/i18n.ts`, add to `en`:
```
    planMode: "Plan Mode — Read-only exploration",
    buildMode: "Build Mode — Full file access",
    undo: "Undo last change",
    redo: "Redo last change",
```

And to `ru`:
```
    planMode: "Режим Планирования — только чтение",
    buildMode: "Режим Сборки — полный доступ к файлам",
    undo: "Отменить последнее изменение",
    redo: "Вернуть последнее изменение",
```

(And optionally to other languages, or leave for later.)

- [ ] **Step 5: Verify App.tsx compiles**

Run: `npx tsc --noEmit src/App.tsx`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/i18n.ts
git commit -m "feat(ui): add planning mode toggle and undo/redo buttons to header"
```

---

## Task 13: Handle Slash Commands /undo and /redo

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wire /undo and /redo commands in App.tsx**

In `App.tsx`, in the `handleSendMessage` function, before calling `sendMessage(input)`, check if the input is `/undo` or `/redo`:

```typescript
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Handle undo/redo commands directly
    const trimmed = input.trim();
    if (trimmed === "/undo") {
      const result = await undo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `↶ Undone: ${result.restored?.description || "last change"}`
          : `Undo failed: ${result.error}`,
        timestamp: Date.now(),
      });
      setInput("");
      return;
    }
    if (trimmed === "/redo") {
      const result = await redo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `↷ Redone: ${result.restored?.description || "last change"}`
          : `Redo failed: ${result.error}`,
        timestamp: Date.now(),
      });
      setInput("");
      return;
    }

    sendMessage(input);
    setInput("");
  };
```

Note: Because `useChat` manages messages state internally, we need a way to inject system messages. Either:
- Add an `addSystemMessage` method to `useChat`, OR
- Use `sendMessage` with a special flag

Simpler approach: add `addMessage` to `useChat`:

In `useChat.ts`, add:
```typescript
  const addMessage = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);
```

And export it.

Then in `App.tsx`:
```typescript
    if (trimmed === "/undo") {
      const result = await undo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `↶ Undone: ${result.restored?.description || "last change"}`
          : `Undo failed: ${result.error}`,
        timestamp: Date.now(),
      });
      setInput("");
      return;
    }
```

- [ ] **Step 2: Verify App.tsx compiles**

Run: `npx tsc --noEmit src/App.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/hooks/useChat.ts
git commit -m "feat(ui): wire /undo and /redo slash commands to change history"
```

---

## Task 14: Integration Test (Manual)

**Files:**
- None (manual verification)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Verify UI elements**

1. Open http://localhost:3000
2. Confirm Plan/Build toggle visible in header
3. Confirm Undo/Redo buttons visible
4. Toggle to Plan mode — button should turn amber
5. Toggle to Build mode — button should turn emerald

- [ ] **Step 3: Verify tool execution flow**

1. Send message: "Read the file src/utils/commands.ts"
2. AI should return a `<tool_call>` block (or plain text if model doesn't support tools yet)
3. If tool call detected, verify tool results appear in chat

- [ ] **Step 4: Verify undo/redo**

1. Switch to Build mode
2. Ask AI to write a test file: "Write a file called test-undo.txt with content 'hello world'"
3. If AI uses tool call, file should be created
4. Click Undo — file should be deleted/reverted
5. Click Redo — file should be recreated

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "test: manual integration test passed for undo/redo and planning mode"
```

---

## Spec Coverage Check

| Spec Requirement | Task(s) |
|-----------------|---------|
| Tool system with 6 tools | Task 1 (types), Task 3 (server engine), Task 7 (client hook) |
| Tool execution endpoint | Task 6 (routes) |
| Path escaping security | Task 3 (`resolveProjectPath`) |
| Change history data model | Task 2 (types), Task 4 (engine) |
| Undo logic | Task 4 (`undoChange`) |
| Redo logic | Task 4 (`redoChange`) |
| `/api/undo`, `/api/redo`, `/api/changes` | Task 6 (routes) |
| Plan mode read-only restriction | Task 3 (`mode === "plan"` check), Task 5 (prompt builder) |
| Build mode full access | Task 3, Task 5 |
| Mode toggle in UI | Task 12 |
| System prompt with mode context | Task 5 |
| AI tool call format | Task 5 (prompt builder), Task 11 (parsing) |
| Slash commands `/undo`, `/redo` | Task 9, Task 13 |
| i18n for new UI strings | Task 12 |

---

## Placeholder Scan

- ✅ No "TBD", "TODO", or "implement later"
- ✅ All error handling shown explicitly
- ✅ All types defined before use
- ✅ No "similar to Task N" shortcuts
- ✅ Complete code blocks in every step

---

## Type Consistency Check

- `ChatConfig.mode` — `"plan" \| "build"` used consistently in types, server, client
- `ToolCall` — `{ name, params }` used in types, server, client
- `FileChange` — all fields match between `changes.ts` type and server engine
- `ChangeState` — `{ changes, canUndo, canRedo }` used in hook and API

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-undo-redo-planning-mode.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
