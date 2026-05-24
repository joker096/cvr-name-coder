import type { ToolResult } from "../types/tools";
import { READ_ONLY_TOOLS } from "../types/tools";
import { PermissionEngine } from "./permissions.js";
import type { PermissionRequest } from "../types/permissions.js";
import { hookRegistry } from "./hooks.js";
import { loadCustomTools, executeCustomTool } from "./customToolLoader.js";
import { createIssue, listIssues, getIssue, addComment } from "./issueTracker.js";
import { getErrorMessage } from "../types/errors";
import {
  executeReadFile,
  executeListDirectory,
  executeSearchFiles,
  executeWriteFile,
  executeEditFile,
} from "./tools/file.js";
import { executeCommand } from "./tools/system.js";
import { executeMemoryRead, executeMemoryWrite } from "./tools/memory.js";
import { executeSkillList, executeSkillRead, executeSkillRun } from "./tools/skill.js";
import { setRagEmbedFn as setRagFn, executeRagSearch } from "./tools/rag.js";
import {
  executeGitStatus,
  executeGitDiff,
  executeGitCommit,
  executeGitPush,
  executeGitLog,
  executeGitBranch,
  executeGitBranches,
  executeGitSwitchBranch,
  executeGitPRContext,
  executeGitListPRs,
  executeGitCreatePR,
} from "./tools/git.js";
import {
  executeBrowserNavigate,
  executeBrowserClick,
  executeBrowserType,
  executeBrowserScreenshot,
  executeBrowserEvaluate,
  executeBrowserGetHtml,
  executeBrowserClose,
} from "./tools/browser.js";
import {
  executeDesignList,
  executeDesignApply,
  executeDesignPreview,
} from "./tools/design.js";

export { setRagFn as setRagEmbedFn };

/**
 * Executes a tool call by name with the given parameters.
 *
 * Supports ~35 built-in tools across file operations, git, browser automation,
 * issue tracking, skill management, memory, RAG search, design tools, and custom tools.
 * Handles plan-mode restrictions, permission checks (allow/deny/ask), hook events
 * (`tool.before`, `tool.after`), and custom tool fallback.
 *
 * @param toolCall - The tool call with name and params to execute
 * @param mode - Execution mode: "plan" (read-only), "build" (full access), or "review"
 * @param permissionEngine - Optional permission engine for access control
 * @param sessionId - Session identifier for hook correlation (default: "default")
 * @returns A Promise resolving to the tool result with success flag, output, and optional error
 */
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
    await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
    return result;
  }

  if (permissionEngine) {
    const permissionRequest: PermissionRequest = {
      tool: name,
      params: params as Record<string, string | number | boolean | null | undefined>,
    };
    if (params.path) permissionRequest.filePath = String(params.path);
    if (params.command) permissionRequest.command = String(params.command);
    const checkResult = permissionEngine.check(permissionRequest);
    if (checkResult.action === "deny") {
      result = {
        success: false,
        output: "",
        error: `Permission denied: ${checkResult.reason || checkResult.rule?.pattern || "default policy"}`,
      };
      await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
      return result;
    }
    if (checkResult.action === "ask") {
      const pending = permissionEngine.createPending(permissionRequest);
      const approved = await permissionEngine.waitForResolution(pending.id, 5 * 60 * 1000);
      if (!approved) {
        result = {
          success: false, output: "",
          error: `Permission denied or timed out: ${name}`,
        };
        await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
        return result;
      }
    }
  }

  try {
    switch (name) {
      case "read_file":
        result = await executeReadFile(params);
        break;
      case "list_directory":
        result = await executeListDirectory(params);
        break;
      case "search_files":
        result = await executeSearchFiles(params);
        break;
      case "write_file":
        result = await executeWriteFile(params, sessionId);
        break;
      case "edit_file":
        result = await executeEditFile(params, sessionId);
        break;
      case "execute_command":
        result = await executeCommand(params);
        break;
      case "memory_read":
        result = await executeMemoryRead(params);
        break;
      case "memory_write":
        result = await executeMemoryWrite(params);
        break;
      case "skill_list":
        result = await executeSkillList();
        break;
      case "skill_read":
        result = await executeSkillRead(params);
        break;
      case "skill_run":
        result = await executeSkillRun(params);
        break;
      case "rag_search":
        result = await executeRagSearch(params);
        break;
      case "git_status":
        result = await executeGitStatus();
        break;
      case "git_diff":
        result = await executeGitDiff(params);
        break;
      case "git_commit":
        result = await executeGitCommit(params);
        break;
      case "git_push":
        result = await executeGitPush();
        break;
      case "git_log":
        result = await executeGitLog(params);
        break;
      case "git_branch":
        result = await executeGitBranch(params);
        break;
      case "git_branches":
        result = await executeGitBranches();
        break;
      case "git_switch_branch":
        result = await executeGitSwitchBranch(params);
        break;
      case "git_pr_context":
        result = await executeGitPRContext();
        break;
      case "git_list_prs":
        result = await executeGitListPRs();
        break;
      case "git_create_pr":
        result = await executeGitCreatePR(params);
        break;
      case "issue_create": {
        const issueInput = {
          title: String(params.title),
          ...(params.description !== undefined ? { description: String(params.description) } : {}),
          ...(params.priority !== undefined ? { priority: String(params.priority) as "low" | "medium" | "high" | "urgent" } : {}),
          ...(params.labels !== undefined ? { labels: (Array.isArray(params.labels) ? params.labels : [params.labels]) as string[] } : {}),
        };
        const issue = await createIssue(issueInput);
        result = { success: true, output: JSON.stringify(issue, null, 2) };
        break;
      }
      case "issue_list":
        result = { success: true, output: JSON.stringify(await listIssues(
          params.status as string | undefined,
          typeof params.limit === "number" ? params.limit : 20
        ), null, 2) };
        break;
      case "issue_view":
        result = { success: true, output: JSON.stringify(await getIssue(params.key as string), null, 2) };
        break;
      case "issue_comment": {
        await addComment(params.key as string, params.body as string);
        result = { success: true, output: `Comment added to ${params.key}` };
        break;
      }
      case "browser_navigate":
        result = await executeBrowserNavigate(params, sessionId);
        break;
      case "browser_click":
        result = await executeBrowserClick(params, sessionId);
        break;
      case "browser_type":
        result = await executeBrowserType(params, sessionId);
        break;
      case "browser_screenshot":
        result = await executeBrowserScreenshot(params, sessionId);
        break;
      case "browser_evaluate":
        result = await executeBrowserEvaluate(params, sessionId);
        break;
      case "browser_get_html":
        result = await executeBrowserGetHtml(params, sessionId);
        break;
      case "browser_close":
        result = await executeBrowserClose(sessionId);
        break;
      case "design_list":
        result = await executeDesignList(params);
        break;
      case "design_apply":
        result = await executeDesignApply(params);
        break;
      case "design_preview":
        result = await executeDesignPreview(params);
        break;
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

  await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: result.success }, sessionId);
  return result;
}
