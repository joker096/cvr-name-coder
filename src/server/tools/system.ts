import { exec } from "child_process";
import { promisify } from "util";
import type { ToolResult } from "../../types/tools";
import { resolveProjectPath } from "./file.js";

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();

export async function executeCommand(params: Record<string, unknown>): Promise<ToolResult> {
  const cwd = params.cwd ? resolveProjectPath(String(params.cwd)) : PROJECT_ROOT;
  const command = String(params.command);
  const { stdout, stderr } = await execAsync(command, { cwd, timeout: 30000 });
  return { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
}
