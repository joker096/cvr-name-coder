import { readFile, writeFile, mkdir, unlink, stat } from "fs/promises";
import * as path from "path";
import type { FileChange, ChangeHistory, ChangeState } from "../types/changes";

const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const CHANGES_FILE = path.join(STORAGE_DIR, "changes.json");
const MAX_CHANGES = 50;
const MAX_SNAPSHOT_SIZE = 1024 * 1024; // 1MB

async function loadHistory(): Promise<ChangeHistory> {
  try {
    const data = await readFile(CHANGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { changes: [], undoStack: [], redoStack: [] };
  }
}

async function saveHistory(history: ChangeHistory): Promise<void> {
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(CHANGES_FILE, JSON.stringify(history, null, 2));
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
    const fileStats = await stat(fullPath);
    if (fileStats.size <= MAX_SNAPSHOT_SIZE) {
      beforeContent = await readFile(fullPath, "utf-8");
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
      await unlink(fullPath);
    } catch {
      // ignore if already deleted
    }
  } else if (change.beforeContent === "[FILE_TOO_LARGE_FOR_SNAPSHOT]") {
    await saveHistory(history);
    return { success: false, error: "Cannot undo: file was too large to snapshot" };
  } else {
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, change.beforeContent, "utf-8");
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
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, change.afterContent, "utf-8");

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
