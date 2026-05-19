import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  deleted: string[];
  renamed: string[];
  clean: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitDiff {
  file: string;
  status: string;
  diff: string;
}

async function runGit(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd: PROJECT_ROOT, timeout: 30000 });
  if (stderr && !stderr.includes("warning")) {
    throw new Error(stderr);
  }
  return stdout.trim();
}

export async function getGitStatus(): Promise<GitStatus> {
  try {
    // Check if git repo
    await runGit(["rev-parse", "--git-dir"]);
  } catch {
    return {
      branch: "",
      ahead: 0,
      behind: 0,
      modified: [],
      staged: [],
      untracked: [],
      deleted: [],
      renamed: [],
      clean: true,
    };
  }

  const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "");
  const statusOutput = await runGit(["status", "--porcelain", "-b"]).catch(() => "");
  
  const lines = statusOutput.split("\n").filter((l) => l.length > 0);
  const branchLine = lines[0] || "";
  const fileLines = lines.slice(1);

  // Parse branch info
  let ahead = 0;
  let behind = 0;
  const branchMatch = branchLine.match(/\[ahead (\d+).*behind (\d+)\]/);
  if (branchMatch) {
    ahead = parseInt(branchMatch[1]!, 10);
    behind = parseInt(branchMatch[2]!, 10);
  } else {
    const aheadMatch = branchLine.match(/\[ahead (\d+)\]/);
    if (aheadMatch) ahead = parseInt(aheadMatch[1]!, 10);
    const behindMatch = branchLine.match(/\[behind (\d+)\]/);
    if (behindMatch) behind = parseInt(behindMatch[1]!, 10);
  }

  const modified: string[] = [];
  const staged: string[] = [];
  const untracked: string[] = [];
  const deleted: string[] = [];
  const renamed: string[] = [];

  for (const line of fileLines) {
    if (!line.trim()) continue;
    const status = line.substring(0, 2);
    const file = line.substring(3);

    // Staged (first char)
    if (status[0] === "M" || status[0] === "A") staged.push(file);
    if (status[0] === "D") staged.push(file);
    if (status[0] === "R") renamed.push(file);

    // Unstaged (second char)
    if (status[1] === "M") modified.push(file);
    if (status[1] === "D") deleted.push(file);

    // Untracked
    if (status === "??") untracked.push(file);
  }

  return {
    branch,
    ahead,
    behind,
    modified,
    staged: [...new Set(staged)],
    untracked,
    deleted,
    renamed: [...new Set(renamed)],
    clean: modified.length === 0 && staged.length === 0 && untracked.length === 0 && deleted.length === 0 && renamed.length === 0,
  };
}

export async function getGitDiff(stagedOnly = false): Promise<GitDiff[]> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
  } catch {
    return [];
  }

  const args = stagedOnly ? ["diff", "--cached"] : ["diff"];
  const diffOutput = await runGit(args).catch(() => "");
  
  if (!diffOutput) return [];

  const diffs: GitDiff[] = [];
  const diffBlocks = diffOutput.split("diff --git ");
  
  for (const block of diffBlocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const firstLine = lines[0] || "";
    const match = firstLine.match(/a\/(.*?) b\/(.*)/);
    if (match) {
      const file = match[2] || "";
      let status = "modified";
      if (block.includes("new file mode")) status = "added";
      if (block.includes("deleted file mode")) status = "deleted";
      if (block.includes("rename from")) status = "renamed";
      diffs.push({ file, status, diff: "diff --git " + block });
    }
  }

  return diffs;
}

export async function gitCommit(message: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    // Stage all changes before committing
    await runGit(["add", "-A"]);
    const output = await runGit(["commit", "-m", message]);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: "", error: err.message || String(err) };
  }
}

export async function gitPush(): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    const output = await runGit(["push"]);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: "", error: err.message || String(err) };
  }
}

export async function getGitLog(limit = 10): Promise<GitCommit[]> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    const output = await runGit(["log", "-n", String(limit), "--pretty=format:%H|%h|%s|%an|%ad"]);
    
    if (!output) return [];
    
    return output.split("\n").map((line) => {
      const parts = line.split("|");
      return {
        hash: parts[0] || "",
        shortHash: parts[1] || "",
        message: parts[2] || "",
        author: parts[3] || "",
        date: parts[4] || "",
      };
    });
  } catch {
    return [];
  }
}

export async function hasGitRepo(): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

export async function stageFiles(files: string[]): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const output = await runGit(["add", ...files]);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: "", error: err.message || String(err) };
  }
}

export async function unstageFiles(files: string[]): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const output = await runGit(["reset", "HEAD", ...files]);
    return { success: true, output };
  } catch (err: any) {
    return { success: false, output: "", error: err.message || String(err) };
  }
}
