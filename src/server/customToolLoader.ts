import { readdir, readFile, access } from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { CustomToolDefinition, CustomToolResult } from "../types/customTool";
import { getErrorMessage } from "../types/errors";
import { log } from "./logger.js";

const execFileAsync = promisify(execFile);

const TOOLS_DIR = path.resolve(process.cwd(), ".cvr", "tools");
let _toolsDir = TOOLS_DIR;

/**
 * Sets the directory from which custom tool JSON definitions are loaded.
 * @param dir - Absolute or relative path to the custom tools directory.
 */
export function setCustomToolsDir(dir: string): void {
  _toolsDir = dir;
}

interface ParsedToolJson {
  id?: string;
  name?: string;
  handler?: { type?: string };
}

/**
 * Loads all custom tool definitions from the configured tools directory.
 * Each `.json` file is parsed as a {@link CustomToolDefinition}. Tools using
 * the `"node"` handler type are skipped for security reasons.
 *
 * @returns An array of valid {@link CustomToolDefinition} objects.
 */
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
      const parsed: ParsedToolJson = JSON.parse(raw) as ParsedToolJson;
      if (parsed.id && parsed.name && parsed.handler) {
        if (parsed.handler.type === "node") {
          log.warn(`Custom tool ${parsed.id}: "node" handler type is disabled for security. Use "command" only.`);
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

function shellEscape(str: string): string {
  if (/^[a-zA-Z0-9_./:@~-]+$/.test(str)) return str;
  return "'" + str.replace(/'/g, "'\"'\"'") + "'";
}

/**
 * Executes a custom tool with the given parameters.
 * Supports `"command"` handler type only; the `{param}` placeholders in the
 * command template are replaced with shell-escaped parameter values.
 *
 * @param definition - The custom tool definition loaded from a JSON file.
 * @param params - Key-value map of parameter values to substitute.
 * @returns A {@link CustomToolResult} indicating success/failure and output.
 */
export async function executeCustomTool(
  definition: CustomToolDefinition,
  params: Record<string, unknown>
): Promise<CustomToolResult> {
  try {
    if (definition.handler.type === "command") {
      let command = definition.handler.template;
      for (const [key, value] of Object.entries(params)) {
        command = command.replace(new RegExp(`\\{${key}\\}`, "g"), shellEscape(String(value)));
      }
      const cwd = definition.handler.cwd
        ? path.resolve(process.cwd(), definition.handler.cwd)
        : process.cwd();

      if (/[;&|`$(){}[\]<>!\\]/.test(command)) {
        return { success: false, output: "", error: "Command contains unsafe shell metacharacters" };
      }

      const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
        cwd,
        encoding: "utf-8",
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      return { success: true, output: (stdout + (stderr ? "\n" + stderr : "")).trim() };
    }

    return { success: false, output: "", error: "Unknown or disabled handler type" };
  } catch (e: unknown) {
    return { success: false, output: "", error: getErrorMessage(e) };
  }
}
