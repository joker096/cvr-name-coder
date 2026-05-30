import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import type { ToolResult } from "../../types/tools";
import { hookRegistry } from "../hooks.js";
import { log } from "../logger.js";

let _projectRoot: string | null = null;

export interface FileSystemEntry {
  name: string;
  type: "file" | "directory" | "other";
}

export interface WorkspaceFileSystem {
  readText(filePath: string): Promise<string>;
  writeText(filePath: string, content: string): Promise<void>;
  createDirectory(dirPath: string): Promise<void>;
  readDirectory(dirPath: string): Promise<FileSystemEntry[]>;
}

const nodeFileSystem: WorkspaceFileSystem = {
  readText: (filePath) => readFile(filePath, "utf-8"),
  writeText: (filePath, content) => writeFile(filePath, content, "utf-8"),
  createDirectory: (dirPath) => mkdir(dirPath, { recursive: true }).then(() => undefined),
  async readDirectory(dirPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
    }));
  },
};

let fileSystem: WorkspaceFileSystem = nodeFileSystem;

export function setWorkspaceFileSystem(nextFileSystem: WorkspaceFileSystem | null): void {
  fileSystem = nextFileSystem || nodeFileSystem;
}

export function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;
  _projectRoot = process.cwd();
  return _projectRoot;
}

export function setProjectRoot(root: string): void {
  _projectRoot = root;
}

/**
 * Resolves a user-requested path relative to the project root and validates it does not escape.
 * @param requestedPath - The path string to resolve.
 * @returns The absolute resolved path within the project root.
 * @throws {Error} If the resolved path escapes the project root directory.
 */
export function resolveProjectPath(requestedPath: string): string {
  const resolved = path.resolve(getProjectRoot(), requestedPath);
  const relative = path.relative(getProjectRoot(), resolved);
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
  const entries = await fileSystem.readDirectory(dir);
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(getProjectRoot(), fullPath);
    if (entry.type === "directory" && entry.name !== "node_modules" && entry.name !== ".git") {
      results.push(...(await searchDir(fullPath, query)));
    } else if (entry.type === "file") {
      if (entry.name.toLowerCase().includes(query)) {
        results.push(`[MATCH] ${relPath} (filename)`);
      } else {
        try {
          const content = await fileSystem.readText(fullPath);
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
  const content = await fileSystem.readText(filePath);
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
  const entries = await fileSystem.readDirectory(dirPath);
  const lines = entries.map((e) => (e.type === "directory" ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
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
  await fileSystem.createDirectory(path.dirname(writePath));
  await fileSystem.writeText(writePath, content);
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
  const content = await fileSystem.readText(editPath);
  if (!content.includes(oldString)) {
    return { success: false, output: "", error: "oldString not found in file" };
  }
  const updated = content.replace(oldString, newString);
  await hookRegistry.execute("file.write.before", { path: editPath, content: updated }, sessionId);
  await fileSystem.writeText(editPath, updated);
  await hookRegistry.execute("file.write.after", { path: editPath, content: updated, success: true }, sessionId);
  return { success: true, output: `File edited: ${String(params.path)}` };
}
