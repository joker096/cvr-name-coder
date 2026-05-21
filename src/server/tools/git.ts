import type { ToolResult } from "../../types/tools";
import { getGitStatus, getGitDiff, gitCommit, gitPush, getGitLog } from "../gitTools.js";
import { gatherPRContext, createGitHubPR, listOpenPRs, createBranch, switchBranch, listBranches } from "../prAgent.js";

export async function executeGitStatus(): Promise<ToolResult> {
  const status = await getGitStatus();
  return { success: true, output: JSON.stringify(status, null, 2) };
}

export async function executeGitDiff(params: Record<string, unknown>): Promise<ToolResult> {
  const diffs = await getGitDiff(Boolean(params.staged));
  return { success: true, output: JSON.stringify(diffs, null, 2) };
}

export async function executeGitCommit(params: Record<string, unknown>): Promise<ToolResult> {
  const commitResult = await gitCommit(String(params.message));
  return {
    success: commitResult.success,
    output: commitResult.output,
    ...(commitResult.error ? { error: commitResult.error } : {}),
  };
}

export async function executeGitPush(): Promise<ToolResult> {
  const pushResult = await gitPush();
  return {
    success: pushResult.success,
    output: pushResult.output,
    ...(pushResult.error ? { error: pushResult.error } : {}),
  };
}

export async function executeGitLog(params: Record<string, unknown>): Promise<ToolResult> {
  const commits = await getGitLog(typeof params.limit === "number" ? params.limit : 10);
  return { success: true, output: JSON.stringify(commits, null, 2) };
}

export async function executeGitBranch(params: Record<string, unknown>): Promise<ToolResult> {
  const output = await createBranch(params.name as string);
  return { success: true, output: `Created and switched to branch: ${output}` };
}

export async function executeGitBranches(): Promise<ToolResult> {
  const branches = await listBranches();
  return { success: true, output: branches };
}

export async function executeGitSwitchBranch(params: Record<string, unknown>): Promise<ToolResult> {
  const output = await switchBranch(params.name as string);
  return { success: true, output: `Switched to branch: ${output}` };
}

export async function executeGitPRContext(): Promise<ToolResult> {
  const ctx = await gatherPRContext();
  return { success: true, output: JSON.stringify(ctx, null, 2) };
}

export async function executeGitListPRs(): Promise<ToolResult> {
  const prs = await listOpenPRs();
  return { success: true, output: prs };
}

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
