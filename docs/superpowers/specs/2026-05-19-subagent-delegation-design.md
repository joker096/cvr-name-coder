# Subagent Delegation — Design Spec

**Date:** 2026-05-19
**Status:** Design approved
**Priority:** 1 of 6

## Overview

Enable master agents (BUILD, GENERAL, EXPLORE, etc.) to automatically decompose complex tasks into parallelizable sub-tasks and spawn sub-agents for concurrent execution. Results are collected and synthesized by the master agent.

## Motivation

- Top AI coding agents in 2026 (Claude Code, GitHub Copilot Agent Mode) use multi-agent orchestration
- Currently cvr.name.coder agents work sequentially — no parallel task execution
- `MAX_SUBAGENT_CONCURRENT = 3` already defined in constants but unused
- Expected speedup: 2-3x for parallelizable tasks

## Architecture

```
User Task
    │
    ▼
Master Agent (BUILD/GENERAL/...)
    │
    ├── TaskDecomposer: analyzes task, detects parallelizable sub-tasks
    ├── Creates Plan: [subtask-1, subtask-2, subtask-3]
    │
    ├── SubAgentRunner: spawns sub-agents in parallel (max 3)
    │       ├── SubAgent 1 (5-10 steps)
    │       ├── SubAgent 2 (5-10 steps)
    │       └── SubAgent 3 (5-10 steps)
    │
    ├── ResultAggregator: collects, validates, merges results
    └── Master synthesizes final response
```

## Components

### 1. TaskDecomposer
- **Input:** User task description (string)
- **Output:** `SubTask[]` — array of parallelizable sub-tasks, or `null` if not parallelizable
- **Logic:** Master agent uses LLM to analyze task complexity. If task involves multiple independent operations (e.g., "update 3 files", "fix bugs in X and add feature Y"), it outputs a decomposition plan.
- **File:** `src/server/taskDecomposer.ts` (new)

### 2. SubAgentRunner
- **Input:** `SubTask[]`, parent agent config, shared context
- **Output:** `SubAgentResult[]`
- **Logic:** Creates SubAgent instances with their own agent loop, limited tool set, and step budget. Runs all in parallel via `Promise.all()`.
- **File:** `src/server/subAgentRunner.ts` (new)

### 3. ResultAggregator
- **Input:** `SubAgentResult[]`
- **Output:** Aggregated result string for master agent
- **Logic:** Concatenates sub-agent outputs with task labels. Reports any failures. Provides structured summary.
- **File:** `src/server/resultAggregator.ts` (new)

### 4. SubAgentContext
- **Input:** `SubTask`, parent config, step budget
- **Output:** Isolated agent loop instance
- **Logic:** Each sub-agent has its own message history, limited tool set (read_file, write_file, execute_command, search), and max step count (10). No access to git, browser, or permissions that require user input.
- **File:** `src/server/subAgentContext.ts` (new)

### 5. Existing files to modify
- `src/server/agentLoop.ts` — add decomposition step before main loop
- `src/hooks/useAgentLoop.ts` — expose sub-agent progress to UI
- `src/utils/constants.ts` — `SUBAGENT_MAX_STEPS = 10` (add)

## Data Types

```typescript
interface SubTask {
  id: string;
  description: string;
  priority: number; // 1=highest
}

interface SubAgentResult {
  taskId: string;
  success: boolean;
  output: string;
  stepsUsed: number;
  error?: string;
}

interface SubAgentState {
  status: 'idle' | 'decomposing' | 'running' | 'aggregating' | 'done';
  subTasks: SubTask[];
  results: SubAgentResult[];
  activeCount: number;
}
```

## Agent Loop Changes

Current flow:
```
1. Receive task
2. Run agent loop (steps 1..N)
3. Return result
```

New flow:
```
1. Receive task
2. TaskDecomposer: analyze + maybe split
3. If parallelizable:
   a. Spawn sub-agents (max 3)
   b. Wait for all to complete
   c. Aggregate results
   d. Run master loop with aggregated context
4. If NOT parallelizable:
   a. Run standard agent loop
5. Return result
```

## UI Changes

- **App.tsx:** Show sub-agent activity in the header/status area (e.g., "Sub-agents: 2/3 active")
- **ChatContainer:** Show sub-agent progress messages in chat
- **MessageItem:** Support sub-agent messages with type "subagent-progress"

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SUBAGENT_CONCURRENT` | 3 | Max parallel sub-agents |
| `SUBAGENT_MAX_STEPS` | 10 | Max steps per sub-agent |
| Sub-agent tools | `[read_file, write_file, execute_command, search_file, search_content]` | Limited set |

## Fallback Behavior

- If decomposition fails → proceed with standard agent loop
- If any sub-agent fails → mark as failed in results, continue with others
- If all sub-agents fail → report error, fall back to standard loop
- Timeout per sub-agent: 60 seconds

## Testing

- Unit tests for TaskDecomposer, ResultAggregator
- Integration test for full decomposition → execution → aggregation flow
- Test with simple parallelizable tasks ("create 2 files")
- Test with non-parallelizable tasks (should fall back to standard loop)
