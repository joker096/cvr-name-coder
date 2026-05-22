import { writeFile, readFile, mkdir, readdir, unlink } from "fs/promises";
import { join } from "path";
import type { GoalState } from "../types/goal";

let storageDir = "";

export function setGoalStorageDir(dir: string): void {
  storageDir = dir;
}

function getPath(id: string): string {
  if (!storageDir) throw new Error("GoalSessionStore: storage dir not set");
  return join(storageDir, `goal-${id}.json`);
}

export async function createGoalState(state: GoalState): Promise<void> {
  await mkdir(storageDir, { recursive: true });
  await writeFile(getPath(state.id), JSON.stringify(state, null, 2), "utf-8");
}

export async function saveGoalState(state: GoalState): Promise<void> {
  await writeFile(getPath(state.id), JSON.stringify(state, null, 2), "utf-8");
}

function isValidGoalState(obj: unknown): obj is GoalState {
  if (typeof obj !== "object" || obj === null) return false;
  const g = obj as Record<string, unknown>;
  return typeof g.id === "string" && typeof g.goal === "string" && typeof g.status === "string";
}

export async function loadGoalState(id: string): Promise<GoalState | null> {
  try {
    const raw = await readFile(getPath(id), "utf-8");
    const parsed = JSON.parse(raw);
    if (!isValidGoalState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function listGoalStates(): Promise<GoalState[]> {
  try {
    const files = await readdir(storageDir);
    const states: GoalState[] = [];
    for (const f of files) {
      if (f.startsWith("goal-") && f.endsWith(".json")) {
        const raw = await readFile(join(storageDir, f), "utf-8");
        const parsed = JSON.parse(raw);
        if (isValidGoalState(parsed)) {
          states.push(parsed);
        }
      }
    }
    return states;
  } catch {
    return [];
  }
}

export async function deleteGoalState(id: string): Promise<void> {
  try {
    await unlink(getPath(id));
  } catch { /* ignore */ }
}
