import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import type { ToolResult } from "../../types/tools";
import { hookRegistry } from "../hooks.js";
import { log } from "../logger.js";

const PROJECT_ROOT = process.cwd();

/**
 * Resolves a user-requested path relative to the project root and validates it does not escape.
 * @param requestedPath - The path string to resolve.
 * @returns The absolute resolved path within the project root.
 * @throws {Error} If the resolved path escapes the project root directory.
 */
export function resolveProjectPath(requestedPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes project root: " + requestedPath);
  }
  return resolved;
}

/**
 * Recursively searches a directory for files matching a query string (by filename or content).
 * @param dir - The directory to search.
 * @param query - The lowercase search query string.
 * @returns An array of match result strings prefixed with `[MATCH]`.
 */
async function searchDir(dir: string, query: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(PROJECT_ROOT, fullPath);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      results.push(...(await searchDir(fullPath, query)));
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().includes(query)) {
        results.push(`[MATCH] ${relPath} (filename)`);
      } else {
        try {
          const content = await readFile(fullPath, "utf-8");
          if (content.toLowerCase().includes(query)) {
            results.push(`[MATCH] ${relPath} (content)`);
          }
        } catch {
          log.debug("Skipping unreadable file", { path: fullPath });
        }
      }
    }
  }
  return results;
}

/**
 * Reads the contents of a file at the given project-relative path.
 * @param params - Contains `path` (the project-relative file path).
 * @returns A tool result with the file contents.
 * @throws {Error} If the path escapes the project root.
 */
export async function executeReadFile(params: Record<string, unknown>): Promise<ToolResult> {
  const filePath = resolveProjectPath(String(params.path));
  const content = await readFile(filePath, "utf-8");
  return { success: true, output: content };
}

/**
 * Lists the contents of a directory at the given project-relative path.
 * @param params - Contains optional `path` (defaults to "."); the project-relative directory path.
 * @returns A tool result with directory listing, entries prefixed with `[DIR]` or `[FILE]`.
 * @throws {Error} If the path escapes the project root.
 */
export async function executeListDirectory(params: Record<string, unknown>): Promise<ToolResult> {
  const dirPath = resolveProjectPath(String(params.path || "."));
  const entries = await readdir(dirPath, { withFileTypes: true });
  const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
  return { success: true, output: lines.join("\n") };
}

/**
 * Recursively searches files for a query string (filename or content match).
 * @param params - Contains `path` (starting directory, defaults to ".") and `query` (search string).
 * @returns A tool result with match lines or "No matches found."
 * @throws {Error} If the path escapes the project root.
 */
export async function executeSearchFiles(params: Record<string, unknown>): Promise<ToolResult> {
  const searchPath = resolveProjectPath(String(params.path || "."));
  const query = String(params.query).toLowerCase();
  const matches = await searchDir(searchPath, query);
  return { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
}

/**
 * Writes content to a file at the given project-relative path, creating parent directories as needed.
 * Fires `file.write.before` and `file.write.after` hooks.
 * @param params - Contains `path` (project-relative file path) and `content` (string to write).
 * @param sessionId - The current session identifier for hook execution.
 * @returns A tool result confirming the file was written.
 * @throws {Error} If the path escapes the project root.
 */
export async function executeWriteFile(params: Record<string, unknown>, sessionId: string = "default"): Promise<ToolResult> {
  const writePath = resolveProjectPath(String(params.path));
  const content = String(params.content);
  await hookRegistry.execute("file.write.before", { path: writePath, content }, sessionId);
  await mkdir(path.dirname(writePath), { recursive: true });
  await writeFile(writePath, content, "utf-8");
  await hookRegistry.execute("file.write.after", { path: writePath, content, success: true }, sessionId);
  return { success: true, output: `File written: ${String(params.path)}` };
}

/**
 * Replaces a string in an existing file. Returns an error if the old string is not found.
 * Fires `file.write.before` and `file.write.after` hooks.
 * @param params - Contains `path` (project-relative file path), `oldString`, and `newString`.
 * @param sessionId - The current session identifier for hook execution.
 * @returns A tool result confirming the edit or reporting the old string was not found.
 * @throws {Error} If the path escapes the project root.
 */
export async function executeEditFile(params: Record<string, unknown>, sessionId: string = "default"): Promise<ToolResult> {
  const editPath = resolveProjectPath(String(params.path));
  const oldString = String(params.oldString);
  const newString = String(params.newString);
  const content = await readFile(editPath, "utf-8");
  if (!content.includes(oldString)) {
    return { success: false, output: "", error: "oldString not found in file" };
  }
  const updated = content.replace(oldString, newString);
  await hookRegistry.execute("file.write.before", { path: editPath, content: updated }, sessionId);
  await writeFile(editPath, updated, "utf-8");
  await hookRegistry.execute("file.write.after", { path: editPath, content: updated, success: true }, sessionId);
  return { success: true, output: `File edited: ${String(params.path)}` };
}
