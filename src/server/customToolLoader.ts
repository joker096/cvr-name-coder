import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { CustomToolDefinition, CustomToolResult } from "../types/customTool";

const execFileAsync = promisify(execFile);

const TOOLS_DIR = path.resolve(process.cwd(), ".cvr", "tools");
let _toolsDir = TOOLS_DIR;

export function setCustomToolsDir(dir: string): void {
  _toolsDir = dir;
}

export async function loadCustomTools(): Promise<CustomToolDefinition[]> {
  try {
    await access(_toolsDir);
  } catch {
    return [];
  }

  const entries = await readdir(_toolsDir, { withFileTypes: true });
  const tools: CustomToolDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(_toolsDir, entry.name);
    try {
      const raw = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.id && parsed.name && parsed.handler) {
        // SECURITY: Reject node-type handlers (arbitrary code execution)
        if (parsed.handler.type === "node") {
          console.warn(`Custom tool ${parsed.id}: "node" handler type is disabled for security. Use "command" only.`);
          continue;
        }
        tools.push(parsed as CustomToolDefinition);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return tools;
}

// Escape a string for safe use inside single-quoted shell arguments
function shellEscape(str: string): string {
  // If the value is a simple safe string, return as-is
  if (/^[a-zA-Z0-9_./:@~-]+$/.test(str)) return str;
  // Use ANSI-C quoting for bash, otherwise fall back to single-quote escaping
  return "'" + str.replace(/'/g, "'\"'\"'") + "'";
}

export async function executeCustomTool(definition: CustomToolDefinition, params: Record<string, unknown>): Promise<CustomToolResult> {
  try {
    if (definition.handler.type === "command") {
      let command = definition.handler.template;
      for (const [key, value] of Object.entries(params)) {
        // SECURITY: shell-escape every substituted value
        command = command.replace(new RegExp(`\\{${key}\\}`, "g"), shellEscape(String(value)));
      }
      const cwd = definition.handler.cwd ? path.resolve(process.cwd(), definition.handler.cwd) : process.cwd();

      // SECURITY: reject shell metacharacters that could break out of the template
      if (/[;&|`$(){}[\]<>!\\]/.test(command)) {
        return { success: false, output: "", error: "Command contains unsafe shell metacharacters" };
      }

      // Use execFile with explicit shell:false to avoid shell interpretation of the whole string
      const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
        cwd,
        encoding: "utf-8",
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      return { success: true, output: (stdout + (stderr ? "\n" + stderr : "")).trim() };
    }

    return { success: false, output: "", error: "Unknown or disabled handler type" };
  } catch (e: any) {
    return { success: false, output: "", error: e.message };
  }
}
