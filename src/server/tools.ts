import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ToolCall, ToolResult } from "../types/tools";
import { READ_ONLY_TOOLS } from "../types/tools";
import { PermissionEngine } from "./permissions.js";
import type { PermissionRequest } from "../types/permissions.js";
import { hookRegistry } from "./hooks.js";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();

function resolveProjectPath(requestedPath: string): string {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  if (!resolved.startsWith(PROJECT_ROOT)) {
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

export async function executeTool(
  toolCall: ToolCall,
  mode: "plan" | "build" = "build",
  permissionEngine?: PermissionEngine,
  sessionId: string = "default"
): Promise<ToolResult> {
  const { name, params } = toolCall;

  await hookRegistry.execute("tool.before", { tool: name, params }, sessionId);

  let result: ToolResult;

  // Plan mode blocks write tools
  if (mode === "plan" && !READ_ONLY_TOOLS.has(name)) {
    result = {
      success: false,
      output: "",
      error: `Tool "${name}" is disabled in PLAN mode. Switch to BUILD mode to make changes.`,
    };
    await hookRegistry.execute("tool.after", { tool: name, params, result }, sessionId);
    return result;
  }

  // Permission check
  if (permissionEngine) {
    const permissionRequest: PermissionRequest = {
      tool: name,
      params: params as Record<string, any>,
    };
    if (params.path) {
      permissionRequest.filePath = String(params.path);
    }
    if (params.command) {
      permissionRequest.command = String(params.command);
    }
    const checkResult = permissionEngine.check(permissionRequest);
    if (checkResult.action === "deny") {
      result = {
        success: false,
        output: "",
        error: `Permission denied: ${checkResult.reason || checkResult.rule?.pattern || "default policy"}`,
      };
      await hookRegistry.execute("tool.after", { tool: name, params, result }, sessionId);
      return result;
    }
    if (checkResult.action === "ask") {
      const pending = permissionEngine.createPending(permissionRequest);
      const TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const startTime = Date.now();
      while (Date.now() - startTime < TIMEOUT) {
        const current = permissionEngine.getPending(pending.id);
        if (current?.resolved) {
          if (current.approved) break;
          result = {
            success: false,
            output: "",
            error: `Permission denied by user: ${name}`,
          };
          await hookRegistry.execute("tool.after", { tool: name, params, result }, sessionId);
          return result;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!permissionEngine.getPending(pending.id)?.resolved) {
        result = {
          success: false,
          output: "",
          error: `Permission request timed out: ${name}`,
        };
        await hookRegistry.execute("tool.after", { tool: name, params, result }, sessionId);
        return result;
      }
    }
  }

  try {
    switch (name) {
      case "read_file": {
        const filePath = resolveProjectPath(String(params.path));
        const content = await readFile(filePath, "utf-8");
        result = { success: true, output: content };
        break;
      }

      case "list_directory": {
        const dirPath = resolveProjectPath(String(params.path || "."));
        const entries = await readdir(dirPath, { withFileTypes: true });
        const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
        result = { success: true, output: lines.join("\n") };
        break;
      }

      case "search_files": {
        const searchPath = resolveProjectPath(String(params.path || "."));
        const query = String(params.query).toLowerCase();
        const matches = await searchDir(searchPath, query);
        result = { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
        break;
      }

      case "write_file": {
        const writePath = resolveProjectPath(String(params.path));
        const content = String(params.content);
        await hookRegistry.execute("file.write.before", { path: writePath, content }, sessionId);
        await mkdir(path.dirname(writePath), { recursive: true });
        await writeFile(writePath, content, "utf-8");
        await hookRegistry.execute("file.write.after", { path: writePath, content }, sessionId);
        result = { success: true, output: `File written: ${String(params.path)}` };
        break;
      }

      case "edit_file": {
        const editPath = resolveProjectPath(String(params.path));
        const oldString = String(params.oldString);
        const newString = String(params.newString);
        const content = await readFile(editPath, "utf-8");
        if (!content.includes(oldString)) {
          result = { success: false, output: "", error: "oldString not found in file" };
          break;
        }
        const updated = content.replace(oldString, newString);
        await hookRegistry.execute("file.write.before", { path: editPath, content: updated }, sessionId);
        await writeFile(editPath, updated, "utf-8");
        await hookRegistry.execute("file.write.after", { path: editPath, content: updated }, sessionId);
        result = { success: true, output: `File edited: ${String(params.path)}` };
        break;
      }

      case "execute_command": {
        const cwd = params.cwd ? resolveProjectPath(String(params.cwd)) : PROJECT_ROOT;
        const command = String(params.command);
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
        result = { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
        break;
      }

      default:
        result = { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    result = { success: false, output: "", error: err.message };
  }

  await hookRegistry.execute("tool.after", { tool: name, params, result }, sessionId);
  return result;
}
