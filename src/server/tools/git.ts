import type { ToolResult } from "../../types/tools";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "../gitTools.js";
import { gatherPRContext, createGitHubPR, listOpenPRs, createBranch, switchBranch, listBranches } from "../prAgent.js";

/**
 * Retrieves the current git working tree status.
 * @returns A tool result with JSON-encoded git status.
 */
export async function executeGitStatus(): Promise<ToolResult> {
  const status = await getGitStatus();
  return { success: true, output: JSON.stringify(status, null, 2) };
}

/**
 * Retrieves git diffs, optionally limited to staged changes.
 * @param params - Contains optional `staged` boolean (defaults to false).
 * @returns A tool result with JSON-encoded diff data.
 */
export async function executeGitDiff(params: Record<string, unknown>): Promise<ToolResult> {
  const diffs = await getGitDiff(Boolean(params.staged));
  return { success: true, output: JSON.stringify(diffs, null, 2) };
}

/**
 * Creates a git commit with the given message.
 * @param params - Contains `message` (the commit message string).
 * @returns A tool result indicating success or failure with error details.
 */
export async function executeGitCommit(params: Record<string, unknown>): Promise<ToolResult> {
  const commitResult = await gitCommit(String(params.message));
  return {
    success: commitResult.success,
    output: commitResult.output,
    ...(commitResult.error ? { error: commitResult.error } : {}),
  };
}

/**
 * Pushes commits to the remote repository.
 * @returns A tool result indicating success or failure with error details.
 */
export async function executeGitPush(): Promise<ToolResult> {
  const pushResult = await gitPush();
  return {
    success: pushResult.success,
    output: pushResult.output,
    ...(pushResult.error ? { error: pushResult.error } : {}),
  };
}

/**
 * Retrieves recent git commit log entries.
 * @param params - Contains optional `limit` number (defaults to 10).
 * @returns A tool result with JSON-encoded commit log.
 */
export async function executeGitLog(params: Record<string, unknown>): Promise<ToolResult> {
  const commits = await getGitLog(typeof params.limit === "number" ? params.limit : 10);
  return { success: true, output: JSON.stringify(commits, null, 2) };
}

/**
 * Creates and switches to a new git branch.
 * @param params - Contains `name` (the branch name to create).
 * @returns A tool result confirming the created branch name.
 */
export async function executeGitBranch(params: Record<string, unknown>): Promise<ToolResult> {
  const output = await createBranch(params.name as string);
  return { success: true, output: `Created and switched to branch: ${output}` };
}

/**
 * Lists all local git branches.
 * @returns A tool result with the branch listing.
 */
export async function executeGitBranches(): Promise<ToolResult> {
  const branches = await listBranches();
  return { success: true, output: branches };
}

/**
 * Switches to an existing git branch.
 * @param params - Contains `name` (the branch name to switch to).
 * @returns A tool result confirming the switch.
 */
export async function executeGitSwitchBranch(params: Record<string, unknown>): Promise<ToolResult> {
  const output = await switchBranch(params.name as string);
  return { success: true, output: `Switched to branch: ${output}` };
}

/**
 * Gathers context for pull request creation (branch info, diff summary, etc.).
 * @returns A tool result with JSON-encoded PR context data.
 */
export async function executeGitPRContext(): Promise<ToolResult> {
  const ctx = await gatherPRContext();
  return { success: true, output: JSON.stringify(ctx, null, 2) };
}

/**
 * Lists all open GitHub pull requests for the repository.
 * @returns A tool result with PR listing output.
 */
export async function executeGitListPRs(): Promise<ToolResult> {
  const prs = await listOpenPRs();
  return { success: true, output: prs };
}

/**
 * Creates a new GitHub pull request. If title and description are not provided,
 * returns the gathered PR context for the AI to choose.
 * @param params - Contains optional `title`, `description`, and `draft` fields.
 * @returns A tool result with the created PR JSON or PR context data.
 */
export async function executeGitCreatePR(params: Record<string, unknown>): Promise<ToolResult> {
  const ctx = await gatherPRContext();
  if (params.title && params.description) {
    const pr = await createGitHubPR(
      params.title as string,
      params.description as string,
      ctx.baseBranch,
      !!params.draft
    );
    return { success: true, output: JSON.stringify(pr, null, 2) };
  }
  return {
    success: true,
    output: `To create a PR, provide title and description.\n\nPR Context:\n${JSON.stringify(ctx, null, 2)}`,
  };
}
