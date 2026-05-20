import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ToolResult } from "../types/tools";
import { READ_ONLY_TOOLS } from "../types/tools";
import { PermissionEngine } from "./permissions.js";
import type { PermissionRequest } from "../types/permissions.js";
import { hookRegistry } from "./hooks.js";
import { readMemory, writeMemory, readUser, writeUser } from "./memoryStore.js";
import { loadSkills, getSkillById } from "./skillLoader.js";
import { searchRAG } from "./ragEngine.js";
import type { EmbedFunction } from "./ragEngine.js";
import { loadCustomTools, executeCustomTool } from "./customToolLoader.js";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "./gitTools.js";
import { getErrorMessage } from "../types/errors";

interface BrowserToolsModule {
  browserNavigate: (
    sessionId: string,
    url: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClick: (
    sessionId: string,
    selector: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserType: (
    sessionId: string,
    selector: string,
    text: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserScreenshot: (
    sessionId: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string; base64?: string }>;
  browserEvaluate: (
    sessionId: string,
    script: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserGetHtml: (
    sessionId: string,
    headless: boolean
  ) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClose: (sessionId: string) => Promise<{ success: boolean; output?: string; error?: string }>;
}

let browserTools: BrowserToolsModule | null = null;

async function getBrowserTools(): Promise<BrowserToolsModule | null> {
  if (!browserTools) {
    try {
      const modulePath = "./browserTools.js";
      browserTools = (await import(modulePath)) as BrowserToolsModule;
    } catch {
      return null;
    }
  }
  return browserTools;
}

const execAsync = promisify(exec);

const PROJECT_ROOT = process.cwd();

let ragEmbedFn: EmbedFunction | null = null;

export function setRagEmbedFn(fn: EmbedFunction): void {
  ragEmbedFn = fn;
}

function resolveProjectPath(requestedPath: string): string {
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

export async function executeTool(
  toolCall: { name: string; params: Record<string, unknown> },
  mode: "plan" | "build" | "review" = "build",
  permissionEngine?: PermissionEngine,
  sessionId: string = "default"
): Promise<ToolResult> {
  const { name, params } = toolCall;

  await hookRegistry.execute("tool.before", { tool: name, params }, sessionId);

  let result: ToolResult;

  const isReadOnlyBuiltIn = READ_ONLY_TOOLS.has(name as import("../types/tools").ToolName);
  let isReadOnlyCustom = false;
  if (!isReadOnlyBuiltIn) {
    const customTools = await loadCustomTools();
    const customTool = customTools.find((t) => t.id === name);
    isReadOnlyCustom = customTool ? customTool.readOnly : false;
  }
  if (mode === "plan" && !isReadOnlyBuiltIn && !isReadOnlyCustom) {
    result = {
      success: false,
      output: "",
      error: `Tool "${name}" is disabled in PLAN mode. Switch to BUILD mode to make changes.`,
    };
    await hookRegistry.execute(
      "tool.after",
      { tool: name, params, result: result.output, success: false },
      sessionId
    );
    return result;
  }

  if (permissionEngine) {
    const permissionRequest: PermissionRequest = {
      tool: name,
      params: params as Record<string, string | number | boolean | null | undefined>,
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
      await hookRegistry.execute(
        "tool.after",
        { tool: name, params, result: result.output, success: false },
        sessionId
      );
      return result;
    }
    if (checkResult.action === "ask") {
      const pending = permissionEngine.createPending(permissionRequest);
      const approved = await permissionEngine.waitForResolution(pending.id, 5 * 60 * 1000);
      if (!approved) {
        result = {
          success: false,
          output: "",
          error: `Permission denied or timed out: ${name}`,
        };
        await hookRegistry.execute(
          "tool.after",
          { tool: name, params, result: result.output, success: false },
          sessionId
        );
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
        result = {
          success: true,
          output: matches.length > 0 ? matches.join("\n") : "No matches found.",
        };
        break;
      }

      case "write_file": {
        const writePath = resolveProjectPath(String(params.path));
        const content = String(params.content);
        await hookRegistry.execute("file.write.before", { path: writePath, content }, sessionId);
        await mkdir(path.dirname(writePath), { recursive: true });
        await writeFile(writePath, content, "utf-8");
        await hookRegistry.execute("file.write.after", { path: writePath, content, success: true }, sessionId);
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
        await hookRegistry.execute("file.write.after", { path: editPath, content: updated, success: true }, sessionId);
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

      case "memory_read": {
        const memoryType = String(params.type);
        if (memoryType === "user") {
          const userData = await readUser();
          result = { success: true, output: userData.raw };
        } else {
          const memData = await readMemory();
          result = { success: true, output: memData.raw };
        }
        break;
      }

      case "memory_write": {
        const memoryType = String(params.type);
        const content = String(params.content);
        const section = params.section ? String(params.section) : undefined;
        if (memoryType === "user") {
          await writeUser(content, section);
          result = { success: true, output: "User preference recorded." };
        } else {
          await writeMemory(content, section);
          result = { success: true, output: "Project memory recorded." };
        }
        break;
      }

      case "skill_list": {
        const skills = await loadSkills();
        const list = skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          triggers: s.triggers,
        }));
        result = { success: true, output: JSON.stringify(list, null, 2) };
        break;
      }

      case "skill_read": {
        const skillId = String(params.id);
        const skill = await getSkillById(skillId);
        if (!skill) {
          result = { success: false, output: "", error: `Skill not found: ${skillId}` };
        } else {
          result = { success: true, output: `## ${skill.name}\n${skill.description}\n\n${skill.content}` };
        }
        break;
      }

      case "skill_run": {
        const runId = String(params.id);
        const runSkill = await getSkillById(runId);
        if (!runSkill) {
          result = { success: false, output: "", error: `Skill not found: ${runId}` };
        } else {
          result = {
            success: true,
            output: `[SKILL: ${runSkill.name}]\nFollow these instructions:\n${runSkill.content}`,
          };
        }
        break;
      }

      case "rag_search": {
        const query = String(params.query);
        const topK = typeof params.topK === "number" ? params.topK : 3;
        if (!ragEmbedFn) {
          result = { success: false, output: "", error: "RAG embedding function not configured" };
        } else {
          const ragResults = await searchRAG(query, ragEmbedFn, topK);
          if (ragResults.length === 0) {
            result = { success: true, output: "No relevant RAG context found." };
          } else {
            const formatted = ragResults
              .map((r, i) => `[${i + 1}] ${r.source} (score: ${r.score.toFixed(3)})\n${r.content}`)
              .join("\n\n");
            result = { success: true, output: `RAG Results:\n${formatted}` };
          }
        }
        break;
      }

      case "git_status": {
        const status = await getGitStatus();
        result = { success: true, output: JSON.stringify(status, null, 2) };
        break;
      }

      case "git_diff": {
        const diffs = await getGitDiff(Boolean(params.staged));
        result = { success: true, output: JSON.stringify(diffs, null, 2) };
        break;
      }

      case "git_commit": {
        const commitResult = await gitCommit(String(params.message));
        result = {
          success: commitResult.success,
          output: commitResult.output,
          ...(commitResult.error ? { error: commitResult.error } : {}),
        };
        break;
      }

      case "git_push": {
        const pushResult = await gitPush();
        result = {
          success: pushResult.success,
          output: pushResult.output,
          ...(pushResult.error ? { error: pushResult.error } : {}),
        };
        break;
      }

      case "git_log": {
        const commits = await getGitLog(typeof params.limit === "number" ? params.limit : 10);
        result = { success: true, output: JSON.stringify(commits, null, 2) };
        break;
      }

      case "browser_navigate": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const navResult = await bt.browserNavigate(
          sessionId,
          String(params.url),
          Boolean(params.headless ?? true)
        );
        result = {
          success: navResult.success,
          output: navResult.output ?? "",
          ...(navResult.error ? { error: navResult.error } : {}),
        };
        break;
      }

      case "browser_click": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const clickResult = await bt.browserClick(
          sessionId,
          String(params.selector),
          Boolean(params.headless ?? true)
        );
        result = {
          success: clickResult.success,
          output: clickResult.output ?? "",
          ...(clickResult.error ? { error: clickResult.error } : {}),
        };
        break;
      }

      case "browser_type": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const typeResult = await bt.browserType(
          sessionId,
          String(params.selector),
          String(params.text),
          Boolean(params.headless ?? true)
        );
        result = {
          success: typeResult.success,
          output: typeResult.output ?? "",
          ...(typeResult.error ? { error: typeResult.error } : {}),
        };
        break;
      }

      case "browser_screenshot": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const ssResult = await bt.browserScreenshot(sessionId, Boolean(params.headless ?? true));
        result = {
          success: ssResult.success,
          output: ssResult.output ?? "",
          ...(ssResult.error ? { error: ssResult.error } : {}),
          ...(ssResult.base64 ? { base64: ssResult.base64 } : {}),
        };
        break;
      }

      case "browser_evaluate": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const evalResult = await bt.browserEvaluate(
          sessionId,
          String(params.script),
          Boolean(params.headless ?? true)
        );
        result = {
          success: evalResult.success,
          output: evalResult.output ?? "",
          ...(evalResult.error ? { error: evalResult.error } : {}),
        };
        break;
      }

      case "browser_get_html": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const htmlResult = await bt.browserGetHtml(sessionId, Boolean(params.headless ?? true));
        result = {
          success: htmlResult.success,
          output: htmlResult.output ?? "",
          ...(htmlResult.error ? { error: htmlResult.error } : {}),
        };
        break;
      }

      case "browser_close": {
        const bt = await getBrowserTools();
        if (!bt) {
          result = { success: false, output: "", error: "playwright-core not installed" };
          break;
        }
        const closeResult = await bt.browserClose(sessionId);
        result = {
          success: closeResult.success,
          output: closeResult.output ?? "",
          ...(closeResult.error ? { error: closeResult.error } : {}),
        };
        break;
      }

      default: {
        const customTools = await loadCustomTools();
        const customTool = customTools.find((t) => t.id === name);
        if (customTool) {
          result = await executeCustomTool(customTool, params);
        } else {
          result = { success: false, output: "", error: `Unknown tool: ${name}` };
        }
        break;
      }
    }
  } catch (err: unknown) {
    result = { success: false, output: "", error: getErrorMessage(err) };
  }

  await hookRegistry.execute(
    "tool.after",
    { tool: name, params, result: result.output, success: result.success },
    sessionId
  );
  return result;
}
