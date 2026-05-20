# Subagent Delegation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire existing SubagentManager/Planner infrastructure into the agent loop so agents can automatically spawn parallel sub-agents.

**Architecture:** Add `spawn_subagent` tool to tools registry, integrate SubagentManager singleton into server, enhance agent loop prompt with subagent instructions, add UI for subagent progress, add polling to useSubagents hook.

**Tech Stack:** TypeScript, React 19, Express, existing AgentLoop/SubagentManager/Planner

---

### Task 1: Add `spawn_subagent` tool definition

**Files:**
- Modify: `src/types/tools.ts:25` — add to ToolName union
- Modify: `src/types/tools.ts:345-351` — add tool definition and update exports

- [ ] **Step 1: Add `spawn_subagent` to ToolName union**

In `src/types/tools.ts`, line 1-25, append to the `ToolName` type (after `browser_close`):
```typescript
  | 'spawn_subagent';
```

- [ ] **Step 2: Add tool definition**

In `src/types/tools.ts`, after `TOOL_DEFINITIONS` array, before the `browser_close` entry, add:
```typescript
  {
    name: 'spawn_subagent' as ToolName,
    description: 'Spawn a sub-agent to execute a sub-task in parallel. Returns a task ID to track progress. Use for tasks that can be done independently and concurrently (e.g., analyzing multiple files, making parallel changes). Maximum 3 concurrent sub-agents.',
    parameters: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          description: 'The specific sub-task goal for the sub-agent',
        },
        agentId: {
          type: 'string',
          description: 'Agent type to use (build, explore, scout, general). Default: build',
        },
      },
      required: ['goal'],
    },
    isReadOnly: false,
  },
```

- [ ] **Step 3: Update READ_ONLY_TOOLS and ALL_TOOL_NAMES**

In `src/types/tools.ts`, line ~352, verify `READ_ONLY_TOOLS` and `ALL_TOOL_NAMES` are generated from `TOOL_DEFINITIONS` (they filter from the array, so no manual update needed).

- [ ] **Step 4: Commit**

```bash
git add src/types/tools.ts
git commit -m "feat: add spawn_subagent tool definition"
```

---

### Task 2: Wire SubagentManager into server as singleton

**Files:**
- Modify: `server.ts` — instantiate SubagentManager, pass to tool executor

- [ ] **Step 1: Import and instantiate SubagentManager**

In `server.ts`, add import:
```typescript
import { SubagentManager } from "./src/server/subagentManager.js";
```

After the permission engine initialization (around where `activeLoops` Map is created), add:
```typescript
const subagentManager = new SubagentManager();
```

- [ ] **Step 2: Store SubagentManager reference for tool access**

In `server.ts`, find where `executeTool` is wrapped for the AgentLoop (around line ~688 in the `/api/agent/loop` handler). The `executeToolFn` wrapper needs access to `subagentManager`. Modify the wrapper:

```typescript
const executeToolFn = async (toolCall: ToolCall, mode?: "plan" | "build" | "review") => {
  const result = await executeTool(toolCall, mode || "build", permissionEngine, sessionId, subagentManager);
  // broadcast step to SSE if connected
  return result;
};
```

- [ ] **Step 3: Update executeTool signature in tools.ts**

In `src/server/tools.ts`, update `executeTool` function signature (line ~75):
```typescript
export async function executeTool(
  toolCall: { name: string; params: Record<string, unknown> },
  mode: "plan" | "build" | "review" = "build",
  permissionEngine?: PermissionEngine,
  sessionId: string = "default",
  subagentManager?: SubagentManager
): Promise<ToolResult>
```

Add import at top of tools.ts:
```typescript
import { SubagentManager } from "./subagentManager.js";
```

- [ ] **Step 4: Commit**

```bash
git add server.ts src/server/tools.ts
git commit -m "feat: wire SubagentManager singleton into server"
```

---

### Task 3: Implement `spawn_subagent` tool handler

**Files:**
- Modify: `src/server/tools.ts` — add case for spawn_subagent

- [ ] **Step 1: Add `spawn_subagent` case to executeTool switch**

In `src/server/tools.ts`, in the switch statement (after `browser_close` case, around line 371), add:

```typescript
case "spawn_subagent": {
  const goal = params.goal as string;
  const agentId = (params.agentId as string) || "build";

  if (!subagentManager) {
    return { success: false, output: "", error: "Subagent manager not available" };
  }

  if (mode === "plan") {
    return { success: false, output: "", error: "Cannot spawn sub-agents in plan mode" };
  }

  const task = await subagentManager.spawn(
    agentId,
    goal,
    {
      id: agentId,
      name: `SubAgent-${agentId}`,
      model: "gemini-2.5-flash",
      provider: "gemini",
      maxSteps: 10,
      mode: "subagent" as const,
    },
    async (prompt: string) => {
      const result = await generateAIContent(prompt, [], "gemini", undefined, "gemini-2.5-flash");
      return result;
    },
    permissionEngine,
    sessionId
  );

  return {
    success: true,
    output: `Sub-agent spawned: ${task.id}\nGoal: ${goal}\nStatus: ${task.status}\n\nTrack progress with task ID: ${task.id}`,
  };
}
```

Add import at top:
```typescript
import { generateAIContent } from "./providers.js";
```

Note: `generateAIContent` is already a named export from providers.ts. Verify it's importable:
```typescript
// src/server/providers.ts line ~207
export async function generateAIContent(...)
```

- [ ] **Step 2: Update SubagentManager.spawn signature to accept permissionEngine and sessionId**

In `src/server/subagentManager.ts`, modify `spawn` method (line 21):
```typescript
async spawn(
  parentId: string,
  goal: string,
  agentConfig: AgentConfig,
  thinkFn: (prompt: string) => Promise<string>,
  permissionEngine?: PermissionEngine,
  sessionId?: string
): Promise<SubagentTask>
```

Pass `permissionEngine` and `sessionId` through to `executeTask` where they get passed to the AgentLoop constructor (if it accepts them). For now, we can store them for future use.

- [ ] **Step 3: Commit**

```bash
git add src/server/tools.ts src/server/subagentManager.ts
git commit -m "feat: implement spawn_subagent tool handler"
```

---

### Task 4: Enhance agent loop prompt with subagent instructions

**Files:**
- Modify: `src/server/agentLoop.ts` — update the think() prompt

- [ ] **Step 1: Update the prompt template in think() method**

In `src/server/agentLoop.ts`, `think()` method (around line 138-156), replace the prompt construction with:

```typescript
const prompt = `You are an autonomous coding agent. Current goal: "${this.state.goal}". 
You can use tools to achieve this goal. 

Available tools: read_file, write_file, edit_file, execute_command, search_files, list_directory, 
memory_read, memory_write, skill_list, skill_read, git_status, git_diff, git_commit, 
browser_navigate, spawn_subagent, and others.

IMPORTANT: If the goal involves multiple independent sub-tasks that can run in parallel 
(e.g., analyzing several files, making changes in different parts of the project), 
use spawn_subagent to create concurrent sub-agents. Each sub-agent handles one sub-task.
You can spawn up to 3 sub-agents at once. After spawning, continue with your own work.

Respond in this format:
THOUGHT: <your reasoning>
ACTION: <tool_name>
PARAMS: {"key": "value"}

Or when done:
THOUGHT: <summary>
COMPLETE: <final result>

${recentSteps.length > 0 ? `Recent steps:\\n${recentSteps.join("\\n")}` : ""}

Now think about what to do next for: "${this.state.goal}"`;
```

- [ ] **Step 2: Commit**

```bash
git add src/server/agentLoop.ts
git commit -m "feat: enhance agent prompt with subagent spawning instructions"
```

---

### Task 5: Add progress reporting for sub-agents

**Files:**
- Modify: `server.ts` — expose subagent state via API
- Modify: `src/hooks/useAgentLoop.ts` — include subagent tasks in state

- [ ] **Step 1: Update GET /api/agent/loop/:id to include subagent tasks**

In `server.ts`, the GET handler (around line ~700), modify the response to include subagent info:

```typescript
app.get("/api/agent/loop/:id", (req, res) => {
  const loop = activeLoops.get(req.params["id"]!);
  if (!loop) {
    res.status(404).json({ error: "Loop not found" });
    return;
  }
  const subagentTasks = subagentManager.getAllTasks();
  const loopSubagents = subagentTasks.filter((t: SubagentTask) => 
    t.parentId === req.params["id"]
  );
  res.json({
    id: req.params["id"],
    state: loop.getState(),
    subagents: loopSubagents,
  });
});
```

- [ ] **Step 2: Update useAgentLoop to include subagent state**

In `src/hooks/useAgentLoop.ts`, update the polling to extract subagent info. Add state for subagents:

```typescript
const [subagentTasks, setSubagentTasks] = useState<SubagentTask[]>([]);
```

In `pollState`, after the JSON parse:
```typescript
if (data.subagents) {
  setSubagentTasks(data.subagents);
}
```

Return `subagentTasks` from the hook:
```typescript
return { state, isRunning, subagentTasks, startLoop, abortLoop };
```

Add import:
```typescript
import type { SubagentTask } from "../server/subagentManager";
```

- [ ] **Step 3: Commit**

```bash
git add server.ts src/hooks/useAgentLoop.ts
git commit -m "feat: expose subagent tasks via agent loop API and hook"
```

---

### Task 6: Integrate SubagentTree into ChatContainer

**Files:**
- Modify: `src/components/chat/SubagentTree.tsx` — polish existing component
- Modify: `src/App.tsx` — wire SubagentTree into chat area

- [ ] **Step 1: Polish SubagentTree component**

Read and update `src/components/chat/SubagentTree.tsx` (35 lines) to accept subagent tasks and display them properly. The existing component already has status badges. Ensure it handles `SubagentTask[]` input correctly.

Replace current component with:
```tsx
import React from "react";
import type { SubagentTask } from "../../server/subagentManager";

interface SubagentTreeProps {
  tasks: SubagentTask[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-dash-text-muted",
  running: "text-dash-accent",
  completed: "text-dash-success",
  failed: "text-red-400",
};

export const SubagentTree: React.FC<SubagentTreeProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  return (
    <div className="border-t border-dash-border px-3 py-2">
      <div className="text-[10px] font-mono text-dash-text-muted uppercase tracking-wider mb-1.5">
        Sub-agents ({tasks.length})
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${task.status === "running" ? "bg-dash-accent animate-pulse" : task.status === "completed" ? "bg-dash-success" : task.status === "failed" ? "bg-red-400" : "bg-dash-text-muted"}`} />
            <span className="truncate text-dash-text-secondary">{task.goal.slice(0, 60)}{task.goal.length > 60 ? "..." : ""}</span>
            <span className={`ml-auto shrink-0 ${STATUS_COLORS[task.status] || "text-dash-text-muted"}`}>{task.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire SubagentTree into App.tsx**

In `src/App.tsx`, import SubagentTree:
```typescript
import { SubagentTree } from "./components/chat/SubagentTree";
```

In the `useAgentLoop` destructuring, extract `subagentTasks`:
```typescript
const { state: agentState, isRunning: isAgentRunning, subagentTasks, startLoop, abortLoop } = useAgentLoop();
```

Add SubagentTree below the Resources bar in the main area, between the ChatContainer and Resources:
```tsx
<SubagentTree tasks={subagentTasks || []} />
```

Place it right before the Resources div in the main section (around line 362 in current file).

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/SubagentTree.tsx src/App.tsx
git commit -m "feat: integrate SubagentTree into chat UI"
```

---

### Task 7: Add abort support for running sub-agents

**Files:**
- Modify: `src/server/subagentManager.ts` — store AgentLoop reference, implement abort

- [ ] **Step 1: Store AgentLoop reference in SubagentTask**

Update `SubagentTask` interface (line 4):
```typescript
interface SubagentTask {
  id: string;
  parentId: string;
  goal: string;
  agentConfig: AgentConfig;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
  _loop?: AgentLoop; // internal reference for abort
}
```

Add import:
```typescript
import { AgentLoop } from "./agentLoop.js";
```

- [ ] **Step 2: Store loop reference in executeTask**

In `executeTask` method (around line 49-75), after creating the AgentLoop, store the reference:
```typescript
task._loop = loop;
```

And clean up after completion:
```typescript
task._loop = undefined;
```

- [ ] **Step 3: Implement proper abort**

In `abort` method (line 105-118), before setting status to "failed":
```typescript
if (task._loop) {
  task._loop.abort();
  task._loop = undefined;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/server/subagentManager.ts
git commit -m "feat: implement proper sub-agent abort"
```

---

### Task 8: Add `SUBAGENT_MAX_STEPS` constant

**Files:**
- Modify: `src/utils/constants.ts`

- [ ] **Step 1: Add constant**

In `src/utils/constants.ts`, after `MAX_SUBAGENT_CONCURRENT` (line 15):
```typescript
export const SUBAGENT_MAX_STEPS = 10;
```

- [ ] **Step 2: Use it in SubagentManager**

In `src/server/subagentManager.ts`, `executeTask` method, replace hardcoded `maxSteps: agentConfig.maxSteps || 10` with:
```typescript
import { SUBAGENT_MAX_STEPS } from "../utils/constants.js";
// ...
maxSteps: agentConfig.maxSteps || SUBAGENT_MAX_STEPS,
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/constants.ts src/server/subagentManager.ts
git commit -m "feat: add SUBAGENT_MAX_STEPS constant"
```

---

### Task 9: Add `getAllTasks` method to SubagentManager

**Files:**
- Modify: `src/server/subagentManager.ts`

- [ ] **Step 1: Add method**

Add after `getRunningCount` method:
```typescript
getAllTasks(): SubagentTask[] {
  return Array.from(this.tasks.values());
}
```

(This may already be used in Task 5 — verify it exists, add if missing.)

- [ ] **Step 2: Commit**

```bash
git add src/server/subagentManager.ts
git commit -m "feat: add getAllTasks to SubagentManager"
```

---

### Task 10: Final integration test & verification

**Files:**
- Create: `src/server/__tests__/subagentIntegration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { describe, it, expect } from "vitest";
import { SubagentManager } from "../subagentManager";

describe("SubagentManager", () => {
  it("should track task lifecycle", async () => {
    const manager = new SubagentManager();
    
    const thinkFn = async (prompt: string) => {
      if (prompt.includes("should spawn")) {
        return "THOUGHT: testing\nACTION: spawn_subagent\nPARAMS: {\"goal\": \"test sub-task\"}";
      }
      return "THOUGHT: done\nCOMPLETE: task finished";
    };

    const task = await manager.spawn(
      "test-parent",
      "test goal",
      { id: "build", name: "test", model: "test", provider: "test", mode: "subagent" },
      thinkFn
    );

    expect(task).toBeDefined();
    expect(task.status).toBe("pending");
    expect(task.parentId).toBe("test-parent");

    const allTasks = manager.getAllTasks();
    expect(allTasks.length).toBeGreaterThanOrEqual(1);
  });

  it("should respect max concurrent limit (3)", () => {
    const manager = new SubagentManager();
    expect(manager.maxConcurrent).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/server/__tests__/subagentIntegration.test.ts
```

Expected: 2 passing tests.

- [ ] **Step 3: Full build verification**

```bash
npx tsc --noEmit
npx vite build
```

Expected: no new TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/server/__tests__/subagentIntegration.test.ts
git commit -m "test: add SubagentManager integration tests"
```

---

## Dependency Order

```
Task 1 (tool def) → Task 2 (singleton) → Task 3 (handler)
Task 4 (prompt) → independent
Task 5 (progress) → depends on Task 9 (getAllTasks)
Task 6 (UI) → depends on Task 5
Task 7 (abort) → depends on Task 2
Task 8 (constant) → independent
Task 9 (getAllTasks) → independent
Task 10 (test) → depends on all
```

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/types/tools.ts` | Modify | Add spawn_subagent tool definition |
| `server.ts` | Modify | Instantiate SubagentManager, pass to tools, update API response |
| `src/server/tools.ts` | Modify | Add spawn_subagent handler case |
| `src/server/agentLoop.ts` | Modify | Update prompt with subagent instructions |
| `src/hooks/useAgentLoop.ts` | Modify | Expose subagentTasks in hook return |
| `src/server/subagentManager.ts` | Modify | Store loop ref, implement abort, add getAllTasks |
| `src/components/chat/SubagentTree.tsx` | Modify | Polish existing UI component |
| `src/App.tsx` | Modify | Wire SubagentTree into chat |
| `src/utils/constants.ts` | Modify | Add SUBAGENT_MAX_STEPS |
| `src/server/__tests__/subagentIntegration.test.ts` | Create | Integration tests |
