# cvr.name.coder — Feature Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform cvr.name.coder from a chat-based AI coding assistant into a fully autonomous AI coding agent with inline editor UX, learning loop, and extensible skill system — matching capabilities of opencode and Hermes Agent.

**Architecture:** 4 sequential phases, each delivering a complete vertical slice. Phase 1 (Inline UX) is the foundation — without it the agent feels disconnected from the editor. Phase 2 (Agent Infrastructure) provides safety and autonomy. Phase 3 (Learning Loop) enables cross-session intelligence. Phase 4 (Extensibility) opens the ecosystem.

**Tech Stack:** TypeScript, React 19, VS Code Extension API, Express, SQLite (via better-sqlite3), Tailwind CSS 4, Motion (framer-motion)

---

## Phase 1: Inline Editor UX (Weeks 1-3)

**Goal:** Make the agent feel native inside VS Code — inline completions, selection-based editing, diff preview.

### Task 1.1: Tab Completion Provider

**Files:**
- Create: `vscode/src/providers/InlineCompletionProvider.ts`
- Create: `vscode/src/completion/completionEngine.ts`
- Create: `vscode/src/types/completion.ts`
- Modify: `vscode/src/extension.ts`

**Overview:** Implement VS Code's `InlineCompletionItemProvider` to show ghost text completions as the user types. This connects to an AI model (a fast/cheap one, configurable separately from chat) and displays completions inline.

- [ ] **Step 1: Create completion type definitions**

Create `vscode/src/types/completion.ts`:

```ts
export interface CompletionRequest {
  textBeforeCursor: string;
  textAfterCursor: string;
  filePath: string;
  language: string;
  maxLines: number;
}

export interface CompletionResponse {
  items: Array<{
    text: string;
    range?: [number, number]; // line range if multiline
    score?: number;
  }>;
}

export interface CompletionConfig {
  provider: string;
  model: string;
  debounceMs: number;
  maxPrefixLines: number;
  maxSuffixLines: number;
  enabled: boolean;
}
```

- [ ] **Step 2: Implement completion engine**

Create `vscode/src/completion/completionEngine.ts`:

```ts
import { CompletionRequest, CompletionResponse } from "../types/completion";

export class CompletionEngine {
  private abortController: AbortController | null = null;
  private cache = new Map<string, CompletionResponse>();

  async requestCompletion(
    req: CompletionRequest,
    signal?: AbortSignal
  ): Promise<CompletionResponse> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const combinedSignal = signal
      ? AbortSignal.any([signal, this.abortController.signal])
      : this.abortController.signal;

    // Cache hit check
    const cacheKey = `${req.filePath}:${req.textBeforeCursor.slice(-200)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: combinedSignal,
      });
      const result: CompletionResponse = await response.json();
      this.cache.set(cacheKey, result);
      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { items: [] };
      }
      throw err;
    }
  }

  cancel() {
    this.abortController?.abort();
    this.abortController = null;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

- [ ] **Step 3: Implement VS Code InlineCompletionItemProvider**

Create `vscode/src/providers/InlineCompletionProvider.ts`:

```ts
import * as vscode from "vscode";
import { CompletionEngine } from "../completion/completionEngine";
import type { CompletionConfig } from "../types/completion";

export class CvrInlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private engine = new CompletionEngine();
  private config: CompletionConfig;

  constructor(config: CompletionConfig) {
    this.config = config;
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    if (!this.config.enabled) return;

    const textBeforeCursor = document.getText(
      new vscode.Range(
        new vscode.Position(Math.max(0, position.line - this.config.maxPrefixLines), 0),
        position
      )
    );
    const textAfterCursor = document.getText(
      new vscode.Range(
        position,
        new vscode.Position(
          Math.min(document.lineCount - 1, position.line + this.config.maxSuffixLines),
          0
        )
      )
    );

    const result = await this.engine.requestCompletion(
      {
        textBeforeCursor,
        textAfterCursor,
        filePath: document.uri.fsPath,
        language: document.languageId,
        maxLines: 20,
      },
      token
    );

    return result.items.map(
      (item) => new vscode.InlineCompletionItem(item.text, item.range)
    );
  }
}
```

- [ ] **Step 4: Register provider in extension.ts**

Modify `vscode/src/extension.ts` — add after server start:

```ts
import { CvrInlineCompletionProvider } from "./providers/InlineCompletionProvider";
import type { CompletionConfig } from "./types/completion";

const completionConfig: CompletionConfig = {
  provider: "gemini",
  model: "gemini-2.0-flash",
  debounceMs: 150,
  maxPrefixLines: 50,
  maxSuffixLines: 10,
  enabled: true,
};

const completionProvider = vscode.languages.registerInlineCompletionItemProvider(
  { pattern: "**" },
  new CvrInlineCompletionProvider(completionConfig)
);

context.subscriptions.push(completionProvider);
```

- [ ] **Step 5: Add completion API route to Express server**

Modify `vscode/src/extension.ts` — add POST `/api/completions`:

```ts
app.post("/api/completions", async (req: any, res: any) => {
  const { textBeforeCursor, textAfterCursor, filePath, language, maxLines } =
    req.body;
  if (!textBeforeCursor) return res.json({ items: [] });

  try {
    const prompt = `You are a code completion engine. Complete the code at the cursor position (|).
Rules:
- Return ONLY the completion text, no explanations
- Match indentation of the surrounding code
- Max ${maxLines || 20} lines
- Consider file extension: ${filePath}, language: ${language}

Code:
\`\`\`
${textBeforeCursor}|${textAfterCursor}
\`\`\`

Completion:`;

    let completionText = "";
    await generateContentStream(
      prompt,
      [],
      (token) => { completionText += token; },
      completionConfig.provider || "gemini",
      undefined,
      completionConfig.model || "gemini-2.0-flash",
      undefined,
      0.2,
      256
    );

    const lines = completionText.split("\n");
    const cleanText = lines
      .filter((l) => !l.startsWith("```"))
      .join("\n")
      .trim();

    const items = cleanText ? [{ text: cleanText + "\n" }] : [];
    res.json({ items });
  } catch (err: any) {
    console.error("Completion error:", err);
    res.json({ items: [] });
  }
});
```

- [ ] **Step 6: Add completion config to VS Code settings**

Add to `vscode/package.json` contributes.configuration:

```json
"configuration": {
  "title": "cvr.name.coder",
  "properties": {
    "cvr.completion.enabled": {
      "type": "boolean",
      "default": true,
      "description": "Enable inline code completion"
    },
    "cvr.completion.model": {
      "type": "string",
      "default": "gemini-2.0-flash",
      "description": "Model for inline completions (use cheap/fast models)"
    },
    "cvr.completion.debounceMs": {
      "type": "number",
      "default": 150,
      "description": "Debounce delay in ms before fetching completion"
    }
  }
}
```

- [ ] **Step 7: Test completion provider manually**

Run: Launch VS Code extension in debug mode. Open a TypeScript file, start typing. Verify ghost text appears after ~200ms debounce.

---

### Task 1.2: Cmd+K Inline Edit

**Files:**
- Create: `vscode/src/commands/InlineEditCommand.ts`
- Create: `vscode/src/providers/InlineEditProvider.ts`
- Create: `vscode/src/types/edit.ts`
- Modify: `vscode/package.json` (command registration + keybinding)

- [ ] **Step 1: Create edit types**

Create `vscode/src/types/edit.ts`:

```ts
export interface InlineEditRequest {
  selectedCode: string;
  filePath: string;
  language: string;
  instruction: string;
  wholeFile: string;
  selectionStart: { line: number; character: number };
  selectionEnd: { line: number; character: number };
}

export interface InlineEditResponse {
  replacement: string;
  diff?: DiffLine[];
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
}
```

- [ ] **Step 2: Implement inline edit provider**

Create `vscode/src/providers/InlineEditProvider.ts`:

```ts
import * as vscode from "vscode";

export class InlineEditProvider {
  async edit(
    request: InlineEditRequest,
    token: vscode.CancellationToken
  ): Promise<string | null> {
    const response = await fetch("/api/edit/inline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: token,
    });

    if (!response.ok) return null;
    const result = await response.json();
    return result.replacement;
  }

  async showDiff(
    original: string,
    modified: string,
    filePath: string
  ): Promise<boolean> {
    const originalUri = vscode.Uri.parse(`untitled:${filePath}.original`);
    const modifiedUri = vscode.Uri.parse(`untitled:${filePath}.modified`);

    await vscode.commands.executeCommand<VSCodeCommandResult>(
      "vscode.diff",
      originalUri,
      modifiedUri,
      "Proposed Change"
    );

    const action = await vscode.window.showInformationMessage(
      "Apply this edit?",
      { modal: true },
      "Apply",
      "Cancel"
    );

    return action === "Apply";
  }
}
```

- [ ] **Step 3: Register command and keybinding**

Modify `vscode/package.json`:

```json
"contributes": {
  "commands": [
    {
      "command": "cvr.inlineEdit",
      "title": "cvr: Inline Edit Selection"
    }
  ],
  "keybindings": [
    {
      "command": "cvr.inlineEdit",
      "key": "ctrl+k ctrl+k",
      "mac": "cmd+k cmd+k",
      "when": "editorTextFocus"
    }
  ]
}
```

Register in `extension.ts`:

```ts
import { InlineEditProvider } from "./providers/InlineEditProvider";

const inlineEditProvider = new InlineEditProvider();

context.subscriptions.push(
  vscode.commands.registerCommand("cvr.inlineEdit", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const selectedCode = editor.document.getText(selection);
    if (!selectedCode) {
      vscode.window.showInformationMessage("Select code to edit");
      return;
    }

    const instruction = await vscode.window.showInputBox({
      prompt: "Describe the edit",
      placeHolder: "e.g., extract to function, add error handling...",
    });

    if (!instruction) return;

    const wholeFile = editor.document.getText();
    const request = {
      selectedCode,
      filePath: editor.document.uri.fsPath,
      language: editor.document.languageId,
      instruction,
      wholeFile,
      selectionStart: {
        line: selection.start.line,
        character: selection.start.character,
      },
      selectionEnd: {
        line: selection.end.line,
        character: selection.end.character,
      },
    };

    const replacement = await inlineEditProvider.edit(
      request,
      new vscode.CancellationTokenSource().token
    );

    if (replacement) {
      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacement);
      });
    }
  })
);
```

- [ ] **Step 4: Add /api/edit/inline route to server**

Modify `vscode/src/extension.ts` — add POST `/api/edit/inline`:

```ts
app.post("/api/edit/inline", async (req: any, res: any) => {
  const { selectedCode, instruction, filePath, language, wholeFile } = req.body;
  if (!selectedCode || !instruction) return res.status(400).json({ error: "Missing required fields" });

  const prompt = `You are an AI code editor. Apply the following instruction to the selected code.

File: ${filePath}
Language: ${language}

Instruction: ${instruction}

Selected code:
\`\`\`
${selectedCode}
\`\`\`

Full file context:
\`\`\`
${wholeFile}
\`\`\`

Return ONLY the replacement code for the selection. No explanations, no markdown.`;

  let result = "";
  await generateContentStream(prompt, [], (token) => { result += token; },
    config.aiProvider || "gemini", undefined, config.aiModel || "gemini-2.5-pro",
    undefined, 0.3, 2048
  );

  const clean = result.replace(/```[\w]*\n/g, "").replace(/```/g, "").trim();
  res.json({ replacement: clean });
});
```

- [ ] **Step 5: Test manually**

Run extension in debug mode. Select code in editor, press `Cmd+K Cmd+K`, type instruction. Verify replacement appears.

---

### Task 1.3: Diff View for File Changes

**Files:**
- Create: `vscode/src/providers/DiffViewProvider.ts`
- Create: `vscode/src/server/diffRoutes.ts`
- Modify: `vscode/src/extension.ts` (register diff routes)
- Modify: `src/hooks/useChanges.ts` (add diff support)
- Modify: `vscode/src/server/changes.ts` (generate diffs)

- [ ] **Step 1: Implement server-side diff generation**

Create `vscode/src/server/diffRoutes.ts`:

```ts
import { diffLines, Change } from "diff";

export function generateDiff(
  originalContent: string,
  newContent: string
): Array<{ type: "added" | "removed" | "unchanged"; content: string; lineNumber: number }> {
  const changes = diffLines(originalContent, newContent);
  const result = [];
  let lineNumber = 0;

  for (const change of changes) {
    const lines = change.value.split("\n").filter((l) => l !== "");
    const type = change.added ? "added" : change.removed ? "removed" : "unchanged";
    for (const line of lines) {
      result.push({ type, content: line, lineNumber: type === "removed" ? lineNumber : lineNumber });
      if (type !== "removed") lineNumber++;
    }
  }

  return result;
}
```

- [ ] **Step 2: Add diff API route**

Add to `vscode/src/extension.ts`:

```ts
app.post("/api/diff", (req: any, res: any) => {
  const { original, modified } = req.body;
  const diff = generateDiff(original, modified);
  res.json({ diff });
});

app.get("/api/changes/:id/diff", async (req: any, res: any) => {
  const { id } = req.params;
  const change = getChangeById(id);
  if (!change) return res.status(404).json({ error: "Change not found" });
  const diff = generateDiff(change.originalContent, change.content);
  res.json({ diff, change });
});
```

- [ ] **Step 3: Create VS Code diff view provider**

Create `vscode/src/providers/DiffViewProvider.ts`:

```ts
import * as vscode from "vscode";

export class DiffViewProvider {
  async showChangeDiff(
    originalContent: string,
    newContent: string,
    filePath: string,
    label: string
  ): Promise<boolean> {
    const originalDoc = await vscode.workspace.openTextDocument({
      content: originalContent,
      language: vscode.window.activeTextEditor?.document.languageId,
    });
    const newDoc = await vscode.workspace.openTextDocument({
      content: newContent,
      language: vscode.window.activeTextEditor?.document.languageId,
    });

    const originalUri = originalDoc.uri;
    const newUri = newDoc.uri;

    await vscode.commands.executeCommand(
      "vscode.diff",
      originalUri,
      newUri,
      `${filePath}: ${label}`
    );

    const accept = await vscode.window.showInformationMessage(
      "Apply this change?",
      { modal: true },
      "Apply",
      "Skip",
      "Show Details"
    );

    return accept === "Apply";
  }
}
```

- [ ] **Step 4: Integrate diff with file write**

Hook into file write in `vscode/src/extension.ts` — before write_file executes, show diff:

```ts
// Before workspace write, show diff
app.post("/api/workspace/write", async (req: any, res: any) => {
  const { file, content } = req.body;
  // ... existing path validation ...

  // Read original
  let originalContent = "";
  try {
    originalContent = await fs.promises.readFile(fullPath, "utf-8");
  } catch { /* new file */ }

  if (originalContent && diffEnabled) {
    const diff = generateDiff(originalContent, content);
    // Send diff to client for approval
    // If rejected, return early
  }

  // ... existing write logic ...
});
```

- [ ] **Step 5: Test**

Make an edit through the agent. Verify diff is shown. Accept/reject the change.

---

### Task 1.4: Inline Diagnostics After Edits

**Files:**
- Modify: `vscode/src/extension.ts` (add diagnostics route)
- Create: `vscode/src/providers/DiagnosticsProvider.ts`

- [ ] **Step 1: Create diagnostics provider**

```ts
import * as vscode from "vscode";

export class DiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("cvr-edits");
  }

  async checkFileAfterEdit(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const document = await vscode.workspace.openTextDocument(uri);

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    if (text.includes("debugger;")) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 10),
          "Debugger statement found in edited code",
          vscode.DiagnosticSeverity.Warning
        )
      );
    }

    if (text.includes("console.log")) {
      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 12),
          "Console.log in edited code",
          vscode.DiagnosticSeverity.Information
        )
      );
    }

    this.diagnosticCollection.set(uri, diagnostics);
  }

  clear() {
    this.diagnosticCollection.clear();
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}
```

- [ ] **Step 2: Register in extension.ts**

```ts
const diagnosticsProvider = new DiagnosticsProvider();
context.subscriptions.push(diagnosticsProvider);

// After file write
app.post("/api/workspace/write", async (req: any, res: any) => {
  // ... existing code ...
  await fs.promises.writeFile(fullPath, content, "utf-8");
  diagnosticsProvider.checkFileAfterEdit(fullPath);
  // ...
});
```

---

## Phase 2: Agent Infrastructure (Weeks 4-7)

**Goal:** Build the safety/control layer for fully autonomous operation.

### Task 2.1: Permission System (allow/ask/deny)

**Files:**
- Create: `src/server/permissions.ts`
- Create: `src/types/permissions.ts`
- Create: `src/hooks/usePermissions.ts`
- Create: `src/components/chat/PermissionDialog.tsx`
- Modify: `src/server/tools.ts` (add permission checks)
- Modify: `src/server/changes.ts` (permission-aware undo)
- Create: `.cvr/permissions.json` (default config)

### Task 2.2: True Autonomous Loop

**Files:**
- Create: `src/server/agentLoop.ts`
- Create: `src/hooks/useAgentLoop.ts`
- Create: `src/types/agent.ts`
- Create: `src/server/planner.ts`
- Modify: `src/hooks/useChat.ts` (integrate agent loop)
- Modify: `src/server/tools.ts` (plan/build mode enforcement)

### Task 2.3: Hooks System

**Files:**
- Create: `src/server/hooks.ts`
- Create: `src/types/hooks.ts`
- Create: `.opencode-infinite/hooks/` directory

### Task 2.4: Agent Config via Markdown

**Files:**
- Create: `.cvr/agents/` directory
- Create: `src/server/agentLoader.ts`
- Create: `src/types/agentConfig.ts`
- Modify: `src/server/prompts.ts` (load from .md files)

### Task 2.5: Subagent Delegation

**Files:**
- Create: `src/server/subagentManager.ts`
- Create: `src/hooks/useSubagents.ts`
- Create: `src/components/chat/SubagentTree.tsx`

---

## Phase 3: Learning Loop & Memory (Weeks 8-11)

**Goal:** Agent that learns across sessions using persistent memory, skill creation, and RAG.

### Task 3.1: Agent-Written Persistent Memory

**Files:**
- Create: `src/server/memoryStore.ts`
- Create: `.opencode-infinite/MEMORY.md`
- Create: `.opencode-infinite/USER.md`
- Create: `src/tools/memoryTool.ts`
- Modify: `src/server/prompts.ts`

### Task 3.2: FTS5 Session Search

**Files:**
- Create: `src/server/sessionStore.ts`
- Create: `src/hooks/useSessionSearch.ts`
- Add: `better-sqlite3` to package.json

### Task 3.3: Skill System (SKILL.md)

**Files:**
- Create: `src/server/skillLoader.ts`
- Create: `src/types/skill.ts`
- Create: `.cvr/skills/` directory structure
- Create: `src/tools/skillTool.ts`
- Modify: `src/components/sidebar/SkillsPanel.tsx`

### Task 3.4: Auto Skill Creation

**Files:**
- Create: `src/server/skillCreator.ts`
- Modify: `src/server/agentLoop.ts` (post-task skill creation hook)

### Task 3.5: RAG Memory

**Files:**
- Create: `src/server/ragEngine.ts`
- Create: `src/hooks/useRAG.ts`
- Add: embedding model integration

---

## Phase 4: Rules & Extensibility (Weeks 12-15)

**Goal:** User-extensible system with shared skills, custom tools, and plugins.

### Task 4.1: CODER.md / AGENTS.md Instructions

**Files:**
- Create: `src/server/instructionLoader.ts`
- Create: `.cvr/rules/` directory
- Modify: `src/server/prompts.ts` (load instruction files)

### Task 4.2: Custom Tools System

**Files:**
- Create: `.cvr/tools/` directory
- Create: `src/server/customToolLoader.ts`
- Create: `src/types/customTool.ts`

### Task 4.3: Plugin System

**Files:**
- Create: `src/server/pluginManager.ts`
- Create: `src/types/plugin.ts`
- Create: `src/server/pluginAPI.ts`

### Task 4.4: Scheduled Tasks (Cron)

**Files:**
- Create: `src/server/cronScheduler.ts`
- Create: `src/hooks/useCron.ts`
- Create: `src/components/settings/CronTab.tsx` (in SettingsModal)

---

## File Structure Summary

```
cvr.name.coder/
├── .cvr/
│   ├── agents/           # Agent .md definitions (Phase 2)
│   ├── skills/           # SKILL.md reusable workflows (Phase 3)
│   ├── tools/            # Custom tool definitions (Phase 4)
│   └── rules/            # AGENTS.md-style rules (Phase 4)
├── vscode/src/
│   ├── providers/
│   │   ├── InlineCompletionProvider.ts  (Phase 1)
│   │   ├── InlineEditProvider.ts        (Phase 1)
│   │   ├── DiffViewProvider.ts          (Phase 1)
│   │   └── DiagnosticsProvider.ts       (Phase 1)
│   ├── completion/
│   │   └── completionEngine.ts          (Phase 1)
│   ├── server/
│   │   ├── diffRoutes.ts               (Phase 1)
│   │   └── agentLoop.ts                (Phase 2)
│   └── types/
│       ├── completion.ts               (Phase 1)
│       └── edit.ts                     (Phase 1)
├── src/
│   ├── server/
│   │   ├── permissions.ts              (Phase 2)
│   │   ├── agentLoop.ts               (Phase 2)
│   │   ├── planner.ts                 (Phase 2)
│   │   ├── hooks.ts                   (Phase 2)
│   │   ├── agentLoader.ts             (Phase 2)
│   │   ├── subagentManager.ts         (Phase 2)
│   │   ├── memoryStore.ts             (Phase 3)
│   │   ├── sessionStore.ts            (Phase 3)
│   │   ├── skillLoader.ts             (Phase 3)
│   │   ├── skillCreator.ts            (Phase 3)
│   │   ├── ragEngine.ts              (Phase 3)
│   │   ├── instructionLoader.ts       (Phase 4)
│   │   ├── customToolLoader.ts        (Phase 4)
│   │   ├── pluginManager.ts          (Phase 4)
│   │   └── cronScheduler.ts          (Phase 4)
│   ├── hooks/
│   │   ├── usePermissions.ts          (Phase 2)
│   │   ├── useAgentLoop.ts           (Phase 2)
│   │   ├── useSubagents.ts           (Phase 2)
│   │   ├── useSessionSearch.ts       (Phase 3)
│   │   ├── useRAG.ts                 (Phase 3)
│   │   └── useCron.ts                (Phase 4)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── PermissionDialog.tsx   (Phase 2)
│   │   │   └── SubagentTree.tsx       (Phase 2)
│   │   └── settings/
│   │       └── CronTab.tsx            (Phase 4)
│   └── types/
│       ├── permissions.ts             (Phase 2)
│       ├── agent.ts                   (Phase 2)
│       ├── hooks.ts                   (Phase 2)
│       ├── agentConfig.ts             (Phase 2)
│       ├── skill.ts                   (Phase 3)
│       ├── customTool.ts              (Phase 4)
│       └── plugin.ts                  (Phase 4)
└── docs/superpowers/plans/
    └── 2026-05-18-cvr-agent-roadmap.md  (this file)
```

---

## Key Design Decisions

1. **Phase isolation**: Each phase is a complete vertical slice. Phase 1 is usable standalone. Phases 2+ build on it but don't require all prior tasks.

2. **VS Code first**: All Phase 1 tasks are VS Code native. Web app catches up in later phases.

3. **Permission system before autonomy**: Phase 2 starts with permissions because you can't have safe autonomous mode without it.

4. **Skills before plugins**: Skills (SKILL.md) are simpler and more impactful than a full plugin system. Phase 4's plugin system uses skills as a building block.

5. **SQLite for session search**: Chosen over Postgres/MySQL for zero-config local operation. `better-sqlite3` is synchronous (simpler) and works in VS Code's Node.js runtime.

6. **Agents as markdown files**: Following opencode's `.opencode/agents/*.md` pattern. YAML frontmatter + markdown body = zero-config agent creation.
