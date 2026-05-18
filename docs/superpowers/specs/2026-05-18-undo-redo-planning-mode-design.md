# Design Specification: Undo/Redo + Planning Mode + Tool System

**Date:** 2026-05-18  
**Status:** Approved  
**Scope:** Server-side tool-use, client-side undo/redo, planning mode toggle  

---

## 1. Overview

Transform `cvr.name.coder` from a chat-only interface into a full coding agent with filesystem access, inspired by OpenCode. This spec covers three integrated features:

1. **Tool System** — AI can read/write files, search, and execute commands via structured tool calls.
2. **Undo/Redo** — Every file-modifying operation is snapshotted; users can roll back or re-apply changes.
3. **Planning Mode** — A toggle that restricts AI to read-only tools in "Plan" mode, allowing safe exploration before "Build" mode makes changes.

---

## 2. Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React Client  │◄────►│   Express API    │◄────►│   File System   │
│                 │      │                  │      │                 │
│ - Plan/Build    │      │ - /api/chat      │      │ - Project files │
│   toggle        │      │ - /api/tools/    │      │ - .opencode-    │
│ - Undo/Redo     │      │   execute        │      │   infinite/     │
│   buttons       │      │ - /api/undo      │      │   changes.json  │
│ - Tool output   │      │ - /api/redo      │      │                 │
│   rendering     │      │ - /api/changes   │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

---

## 3. Tool System

### 3.1 Available Tools

| Tool | Type | Params | Description |
|------|------|--------|-------------|
| `read_file` | read | `path` | Read file content |
| `list_directory` | read | `path` | List files in directory |
| `search_files` | read | `query`, `path?` | Search file names and contents |
| `write_file` | write | `path`, `content` | Write/overwrite file |
| `edit_file` | write | `path`, `oldString`, `newString` | Apply exact replacement |
| `execute_command` | write | `command`, `cwd?` | Run shell command |

### 3.2 Tool Call Format

AI returns tool calls in a structured block:

```xml
<tool_call>
<name>write_file</name>
<params>
{"path": "src/utils/commands.ts", "content": "..."}
</params>
</tool_call>
```

### 3.3 Tool Execution Endpoint

```
POST /api/tools/execute
Body: { toolCall: ToolCall, config: ChatConfig }
Response: { result: string, error?: string, changeId?: string }
```

**For `write_file` and `edit_file`:** Before writing, the system saves the previous file content to the changes history and returns a `changeId`.

### 3.4 Security

- All paths are resolved with `path.resolve()` and validated to stay within the project root (no `../` escaping).
- `execute_command` is restricted to a whitelist or requires explicit confirmation (Phase 2). For Phase 1, it is available but logged.

---

## 4. Undo/Redo System

### 4.1 Data Model

```typescript
interface FileChange {
  id: string;           // UUID
  timestamp: number;    // Unix ms
  filePath: string;     // Relative path
  operation: "write" | "edit";
  beforeContent: string | null;  // null if file didn't exist
  afterContent: string;
  description: string;  // Human-readable, e.g. "Edited src/App.tsx"
}

interface ChangeHistory {
  changes: FileChange[];
  undoStack: string[];  // change IDs that have been undone
  redoStack: string[];  // change IDs available to redo
}
```

### 4.2 Storage

File: `.opencode-infinite/changes.json`

- Maintains a linear `changes` array (max 50 items, FIFO eviction).
- `undoStack` and `redoStack` track state for navigation.

### 4.3 API Endpoints

```
POST /api/undo
Response: { success: boolean, restoredChange?: FileChange, error?: string }

POST /api/redo
Response: { success: boolean, restoredChange?: FileChange, error?: string }

GET /api/changes
Response: { changes: FileChange[], canUndo: boolean, canRedo: boolean }
```

### 4.4 Undo Logic

1. Pop last change ID from `changes` (or use `undoStack`/`redoStack` model).
2. If the file existed before (`beforeContent !== null`), restore it.
3. If the file was newly created (`beforeContent === null`), delete it.
4. Push the change ID onto `redoStack`.

### 4.5 Redo Logic

1. Pop from `redoStack`.
2. Re-apply the `afterContent` to the file.
3. Push back onto the active changes list.

---

## 5. Planning Mode

### 5.1 Mode States

- **Plan Mode** (read-only): AI can only use `read_file`, `list_directory`, `search_files`. If AI attempts to emit a write tool, the client/server ignores it and shows a warning.
- **Build Mode** (full): All tools are available.

### 5.2 UI Toggle

- Location: In the top header, next to the agent selector.
- Visual: Tab-like switch `[PLAN | BUILD]`.
- Plan mode: accent color (e.g., yellow/amber).
- Build mode: accent color (e.g., green/blue).

### 5.3 Prompt Integration

The `systemPrompt` sent to the AI is dynamically modified based on mode:

```
[PLANNING MODE ACTIVE]
You are in PLANNING mode. You may ONLY use read_file, list_directory, and search_files.
Do NOT write files, edit files, or execute commands. Provide a detailed implementation plan.

[BUILD MODE ACTIVE]
You are in BUILD mode. You have full access to all tools including write_file, edit_file, and execute_command.
Implement the plan directly.
```

---

## 6. AI Integration

### 6.1 Modified Chat Flow

1. User sends message.
2. Server calls AI with current mode context + tool descriptions.
3. AI responds with either:
   - Plain text (no tool calls needed).
   - Text containing `<tool_call>` blocks.
4. If tool calls present:
   - Client or server extracts them.
   - Executes them via `/api/tools/execute`.
   - Returns tool results as a follow-up user message (`role: "tool"`).
   - AI receives tool results and generates the next response.

### 6.2 Streaming Tool Results

Tool calls are rendered in the chat as collapsible "tool cards" showing:
- Tool name
- Parameters
- Result (success / error)

---

## 7. UI Changes

### 7.1 Header

Add to the top bar (between agent selector and settings):

```
[AGENT SELECTOR]  [PLAN | BUILD toggle]  [Undo ↶] [Redo ↷]  [Settings]
```

### 7.2 Chat Messages

When a message contains tool calls, render them as:

```
┌─ Tool: write_file ─────────────────┐
│ Path: src/utils/commands.ts        │
│ [Show diff / Collapse]             │
└────────────────────────────────────┘
```

### 7.3 Slash Commands

Add to `src/utils/commands.ts`:

```typescript
| "/undo"
| "/redo"
```

`/undo` calls the undo API and shows a system message.
`/redo` calls the redo API and shows a system message.

---

## 8. API Surface Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Existing; enhanced with mode context |
| POST | `/api/tools/execute` | Execute a single tool call |
| POST | `/api/undo` | Revert last file change |
| POST | `/api/redo` | Re-apply undone file change |
| GET | `/api/changes` | Get full change history + stack state |

---

## 9. Data Flow

### Tool Execution Flow

```
User Message → AI Response (with <tool_call>)
                    ↓
         Parse tool calls
                    ↓
         POST /api/tools/execute
                    ↓
         Execute on filesystem
                    ↓
         Save snapshot (for undo)
                    ↓
         Return result to AI
                    ↓
         AI final response
```

### Undo Flow

```
User clicks Undo /types /undo
         ↓
   POST /api/undo
         ↓
   Read beforeContent from changes.json
         ↓
   Restore file (or delete if new)
         ↓
   Update undo/redo stacks
         ↓
   Return success + updated state
```

---

## 10. Security & Constraints

1. **Path escaping**: `path.resolve(projectRoot, requestedPath)` + prefix check.
2. **Command execution**: Logged; optionally gated behind confirmation.
3. **Change history limit**: Max 50 changes; old ones evicted.
4. **File size limit**: Snapshots capped at 1MB per file to prevent storage bloat.
5. **Binary files**: `read_file` refuses binary files; `write_file` warns.

---

## 11. Testing Strategy

- **Unit**: Tool execution handlers (mock fs).
- **Unit**: Undo/redo logic (mock changes.json).
- **Integration**: Full roundtrip — message → tool call → undo → file restored.
- **E2E**: UI toggle, button clicks, slash commands.

---

## 12. Out of Scope (Future)

- Image support (drag & drop)
- Share conversations (/share)
- AGENTS.md auto-generation (/init)
- TUI/Desktop app
- Zen provider

---

**Next Step:** Proceed to implementation plan via `writing-plans` skill.
