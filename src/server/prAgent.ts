import { getGitDiff, getGitStatus, getGitLog, hasGitRepo } from "./gitTools.js";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();

async function runGit(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd: PROJECT_ROOT,
    timeout: 30000,
  });
  if (stderr && !stderr.startsWith("warning:")) throw new Error(stderr);
  return stdout.trim();
}

export interface PRContext {
  branch: string;
  baseBranch: string;
  diff: string;
  commits: string;
  changedFiles: string[];
  ahead: number;
  behind: number;
}

export interface PRResult {
  title: string;
  description: string;
  branch: string;
  baseBranch: string;
  prUrl?: string;
  prNumber?: string;
  error?: string;
}

export async function gatherPRContext(): Promise<PRContext> {
  if (!(await hasGitRepo())) throw new Error("Not a git repository");

  const status = await getGitStatus();
  const diff = (await getGitDiff(false)).map((d) => d.diff).join("\n\n");
  const commits = (await getGitLog(10))
    .map((c) => `- ${c.shortHash}: ${c.message}`)
    .join("\n");
  const changedFiles = status.modified.concat(status.staged).concat(status.deleted);

  let baseBranch = "main";
  try {
    baseBranch = await runGit(["rev-parse", "--abbrev-ref", "origin/HEAD"]);
    baseBranch = baseBranch.replace("origin/", "");
  } catch {
    try { await runGit(["rev-parse", "--verify", "main"]); baseBranch = "main"; }
    catch { try { await runGit(["rev-parse", "--verify", "master"]); baseBranch = "master"; }
    catch { baseBranch = "main"; } }
  }

  return {
    branch: status.branch,
    baseBranch,
    diff,
    commits,
    changedFiles,
    ahead: status.ahead,
    behind: status.behind,
  };
}

export async function generatePRDescription(
  ctx: PRContext,
  thinkFn: (prompt: string) => Promise<string>
): Promise<{ title: string; description: string }> {
  const prompt = `Generate a pull request title and description for the following changes.

BRANCH: ${ctx.branch} → ${ctx.baseBranch}
CHANGED FILES: ${ctx.changedFiles.join(", ")}
COMMITS AHEAD: ${ctx.ahead}
COMMITS BEHIND: ${ctx.behind}

RECENT COMMITS:
${ctx.commits.slice(0, 1500)}

GIT DIFF (first 4000 chars):
\`\`\`diff
${ctx.diff.slice(0, 4000)}
\`\`\`

Output ONLY a JSON object (no markdown, no code fences):
{
  "title": "Brief, conventional-commit style title (max 72 chars)",
  "description": "Detailed PR description with ## Summary, ## Changes, ## Testing sections"
}`;

  const response = await thinkFn(prompt);
  const cleaned = response
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || `Update: ${ctx.changedFiles.slice(0, 3).join(", ")}`,
      description: parsed.description || "Automated PR by CVRCoder",
    };
  } catch {
    return {
      title: `Update: ${ctx.changedFiles.slice(0, 3).join(", ")}`,
      description: response.slice(0, 4000) || "Automated PR by CVRCoder",
    };
  }
}

export async function createGitHubPR(
  title: string,
  description: string,
  baseBranch: string,
  draft: boolean = false
): Promise<PRResult> {
  const args = draft
    ? ["pr", "create", "--draft", "--title", title, "--body", description, "--base", baseBranch]
    : ["pr", "create", "--title", title, "--body", description, "--base", baseBranch];

  try {
    const stdout = await runGit(args);
    const urlMatch = stdout.match(/(https:\/\/github\.com\/\S+)/);
    return {
      title,
      description,
      branch: (await getGitStatus()).branch,
      baseBranch,
      prUrl: urlMatch?.[1] || stdout,
    };
  } catch (e: any) {
    return {
      title,
      description,
      branch: (await getGitStatus()).branch,
      baseBranch,
      error: e.message,
    };
  }
}

export async function listOpenPRs(): Promise<string> {
  try {
    return await runGit(["pr", "list", "--state", "open", "--json", "number,title,headRefName,baseRefName,url"]);
  } catch {
    throw new Error("gh CLI not available. Install GitHub CLI for PR management.");
  }
}

export async function createBranch(branchName: string): Promise<string> {
  return await runGit(["checkout", "-b", branchName]);
}

export async function switchBranch(branchName: string): Promise<string> {
  return await runGit(["checkout", branchName]);
}

export async function listBranches(): Promise<string> {
  return await runGit(["branch", "-a"]);
}

export async function getDefaultBranch(): Promise<string> {
  try {
    return await runGit(["rev-parse", "--abbrev-ref", "origin/HEAD"]);
  } catch {
    const branches = await runGit(["branch", "-r"]);
    if (branches.includes("origin/main")) return "main";
    if (branches.includes("origin/master")) return "master";
    return "main";
  }
}
