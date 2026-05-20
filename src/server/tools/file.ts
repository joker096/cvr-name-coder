import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import type { ToolResult } from "../../types/tools";
import { hookRegistry } from "../hooks.js";

const PROJECT_ROOT = process.cwd();

export function resolveProjectPath(requestedPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes project root: " + requestedPath);
  }
  return resolved;
}

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
          // skip unreadable files
        }
      }
    }
  }
  return results;
}

export async function executeReadFile(params: Record<string, unknown>): Promise<ToolResult> {
  const filePath = resolveProjectPath(String(params.path));
  const content = await readFile(filePath, "utf-8");
  return { success: true, output: content };
}

export async function executeListDirectory(params: Record<string, unknown>): Promise<ToolResult> {
  const dirPath = resolveProjectPath(String(params.path || "."));
  const entries = await readdir(dirPath, { withFileTypes: true });
  const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
  return { success: true, output: lines.join("\n") };
}

export async function executeSearchFiles(params: Record<string, unknown>): Promise<ToolResult> {
  const searchPath = resolveProjectPath(String(params.path || "."));
  const query = String(params.query).toLowerCase();
  const matches = await searchDir(searchPath, query);
  return { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
}

export async function executeWriteFile(params: Record<string, unknown>, sessionId: string = "default"): Promise<ToolResult> {
  const writePath = resolveProjectPath(String(params.path));
  const content = String(params.content);
  await hookRegistry.execute("file.write.before", { path: writePath, content }, sessionId);
  await mkdir(path.dirname(writePath), { recursive: true });
  await writeFile(writePath, content, "utf-8");
  await hookRegistry.execute("file.write.after", { path: writePath, content }, sessionId);
  return { success: true, output: `File written: ${String(params.path)}` };
}

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
  await hookRegistry.execute("file.write.after", { path: editPath, content: updated }, sessionId);
  return { success: true, output: `File edited: ${String(params.path)}` };
}
