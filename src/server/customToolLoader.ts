import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import type { CustomToolDefinition, CustomToolResult } from "../types/customTool";

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
        tools.push(parsed as CustomToolDefinition);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return tools;
}

export function executeCustomTool(definition: CustomToolDefinition, params: Record<string, unknown>): CustomToolResult {
  try {
    if (definition.handler.type === "command") {
      let command = definition.handler.template;
      for (const [key, value] of Object.entries(params)) {
        command = command.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
      const cwd = definition.handler.cwd ? path.resolve(process.cwd(), definition.handler.cwd) : process.cwd();
      const output = execSync(command, { cwd, encoding: "utf-8", timeout: 30000 });
      return { success: true, output: output.trim() };
    }

    if (definition.handler.type === "node") {
      // Create a function from the script string
      const fn = new Function("params", definition.handler.script);
      const result = fn(params);
      return { success: true, output: String(result) };
    }

    return { success: false, output: "", error: "Unknown handler type" };
  } catch (e: any) {
    return { success: false, output: "", error: e.message };
  }
}
