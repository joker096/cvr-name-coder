import { writeFile, readFile, mkdir, readdir, unlink } from "fs/promises";
import { join } from "path";
import type { GoalState } from "../types/goal";

let storageDir = "";

/**
 * Sets the filesystem directory used for persisting goal session state.
 * @param {string} dir - Absolute path to the storage directory.
 */
export function setGoalStorageDir(dir: string): void {
  storageDir = dir;
}

function getPath(id: string): string {
  if (!storageDir) throw new Error("GoalSessionStore: storage dir not set");
  return join(storageDir, `goal-${id}.json`);
}

/**
 * Creates a new goal state file on disk.
 * @param {GoalState} state - The goal state to persist.
 * @returns {Promise<void>} Resolves when the file has been written.
 * @throws {Error} If the storage directory has not been set via {@link setGoalStorageDir}.
 */
export async function createGoalState(state: GoalState): Promise<void> {
  await mkdir(storageDir, { recursive: true });
  await writeFile(getPath(state.id), JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Saves (overwrites) a goal state file on disk.
 * @param {GoalState} state - The goal state to persist.
 * @returns {Promise<void>} Resolves when the file has been written.
 * @throws {Error} If the storage directory has not been set via {@link setGoalStorageDir}.
 */
export async function saveGoalState(state: GoalState): Promise<void> {
  await writeFile(getPath(state.id), JSON.stringify(state, null, 2), "utf-8");
}

function isValidGoalState(obj: unknown): obj is GoalState {
  if (typeof obj !== "object" || obj === null) return false;
  const g = obj as Record<string, unknown>;
  return typeof g.id === "string" && typeof g.goal === "string" && typeof g.status === "string";
}

/**
 * Loads a goal state from disk by its ID.
 * @param {string} id - The unique goal identifier.
 * @returns {Promise<GoalState | null>} The parsed goal state, or `null` if not found or invalid.
 */
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

/**
 * Lists all goal states currently stored on disk.
 * @returns {Promise<GoalState[]>} An array of saved goal states.
 */
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

/**
 * Deletes a goal state file from disk.
 * @param {string} id - The unique goal identifier.
 * @returns {Promise<void>} Resolves when the file has been deleted (or if it didn't exist).
 */
export async function deleteGoalState(id: string): Promise<void> {
  try {
    await unlink(getPath(id));
  } catch { /* ignore */ }
}
