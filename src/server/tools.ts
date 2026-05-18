import { readFile, readdir, stat, writeFile, mkdir, unlink } from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ToolCall, ToolResult } from "../types/tools";
import { READ_ONLY_TOOLS } from "../types/tools";

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

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
  mode: "plan" | "build" = "build"
): Promise<ToolResult> {
  const { name, params } = toolCall;

  // Plan mode blocks write tools
  if (mode === "plan" && !READ_ONLY_TOOLS.has(name)) {
    return {
      success: false,
      output: "",
      error: `Tool "${name}" is disabled in PLAN mode. Switch to BUILD mode to make changes.`,
    };
  }

  try {
    switch (name) {
      case "read_file": {
        const filePath = resolveProjectPath(String(params.path));
        const content = await readFile(filePath, "utf-8");
        return { success: true, output: content };
      }

      case "list_directory": {
        const dirPath = resolveProjectPath(String(params.path || "."));
        const entries = await readdir(dirPath, { withFileTypes: true });
        const lines = entries.map((e) => (e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`));
        return { success: true, output: lines.join("\n") };
      }

      case "search_files": {
        const searchPath = resolveProjectPath(String(params.path || "."));
        const query = String(params.query).toLowerCase();
        const matches = await searchDir(searchPath, query);
        return { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
      }

      case "write_file": {
        const writePath = resolveProjectPath(String(params.path));
        const content = String(params.content);
        await mkdir(path.dirname(writePath), { recursive: true });
        await writeFile(writePath, content, "utf-8");
        return { success: true, output: `File written: ${String(params.path)}` };
      }

      case "edit_file": {
        const editPath = resolveProjectPath(String(params.path));
        const oldString = String(params.oldString);
        const newString = String(params.newString);
        const content = await readFile(editPath, "utf-8");
        if (!content.includes(oldString)) {
          return { success: false, output: "", error: "oldString not found in file" };
        }
        const updated = content.replace(oldString, newString);
        await writeFile(editPath, updated, "utf-8");
        return { success: true, output: `File edited: ${String(params.path)}` };
      }

      case "execute_command": {
        const cwd = params.cwd ? resolveProjectPath(String(params.cwd)) : PROJECT_ROOT;
        const command = String(params.command);
        const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
        return { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
      }

      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}
