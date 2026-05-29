import { spawn, ChildProcess } from "child_process";
import type { ToolResult } from "../../types/tools";
import { resolveProjectPath, getProjectRoot } from "./file.js";

/**
 * Splits a command string into an array of arguments, respecting quoted strings.
 * @param cmd - The raw command string to parse.
 * @returns An array of individual argument strings.
 */
function splitArgs(cmd: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  for (const ch of cmd) {
    if (inQuotes) {
      if (ch === quoteChar) { inQuotes = false; continue; }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuotes = true;
      quoteChar = ch;
    } else if (ch === " " || ch === "\t") {
      if (current) { args.push(current); current = ""; }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

/**
 * Executes a shell command within the project context.
 * @param params - Contains `command` (the shell command string) and optional `cwd` (working directory relative to project root).
 * @returns A tool result with stdout+stderr output on success, or an error message on timeout/failure.
 */
export async function executeCommand(params: Record<string, unknown>): Promise<ToolResult> {
  const resolvedCwd: string = params.cwd !== undefined && params.cwd !== null ? resolveProjectPath(String(params.cwd)) : getProjectRoot();
  const command = String(params.command);
  const args = splitArgs(command);
  if (args.length === 0) {
    return { success: false, output: "", error: "Empty command" };
  }
  const [program, ...programArgs] = args as [string, ...string[]];
  const timeoutMs = 30000;
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn(program, programArgs, { cwd: resolvedCwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true } as any) as ChildProcess;
    let stdoutData = "";
    let stderrData = "";
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        resolve({ success: false, output: "", error: "Command timed out after 30s" });
      }
    }, timeoutMs);
    child.stdout!.on("data", (data: Buffer) => { stdoutData += data.toString(); });
    child.stderr!.on("data", (data: Buffer) => { stderrData += data.toString(); });
    child.on("error", (err: Error) => {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ success: false, output: "", error: err.message }); }
    });
    child.on("close", (code: number | null) => {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ success: code === 0, output: stdoutData + (stderrData ? "\n" + stderrData : "") }); }
    });
  });
}
