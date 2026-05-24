import { execFile } from "child_process";
import { promisify } from "util";
import { getErrorMessage } from "../types/errors";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();

/**
 * @interface GitStatus
 * @description Represents the current state of a git working directory.
 */
export interface GitStatus {
  /** Current branch name */
  branch: string;
  /** Number of commits ahead of remote */
  ahead: number;
  /** Number of commits behind remote */
  behind: number;
  /** Modified (unstaged) file paths */
  modified: string[];
  /** Staged file paths */
  staged: string[];
  /** Untracked file paths */
  untracked: string[];
  /** Deleted file paths (unstaged) */
  deleted: string[];
  /** Renamed file paths */
  renamed: string[];
  /** Whether the working tree is clean (no changes) */
  clean: boolean;
}

/**
 * @interface GitCommit
 * @description Represents a single git commit.
 */
export interface GitCommit {
  /** Full commit hash (SHA) */
  hash: string;
  /** Abbreviated (short) commit hash */
  shortHash: string;
  /** Commit message */
  message: string;
  /** Author name */
  author: string;
  /** Commit date string */
  date: string;
}

/**
 * @interface GitDiff
 * @description Represents a file-level diff from git.
 */
export interface GitDiff {
  /** File path */
  file: string;
  /** Change status (modified, added, deleted, renamed) */
  status: string;
  /** Full diff content for the file */
  diff: string;
}

/**
 * @interface GitResult
 * @description Result of a git operation.
 */
export interface GitResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Command output text */
  output: string;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Runs a git command with the given arguments.
 * @param {string[]} args - Git command arguments.
 * @returns {Promise<string>} The stdout output trimmed.
 * @throws {Error} If git returns a non-warning error on stderr.
 * @internal
 */
async function runGit(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd: PROJECT_ROOT, timeout: 30000 });
  if (stderr && !stderr.includes("warning")) {
    throw new Error(stderr);
  }
  return stdout.trim();
}

/**
 * Gets the current git working directory status.
 * @returns {Promise<GitStatus>} The current git status including branch, staged, modified, and untracked files.
 */
export async function getGitStatus(): Promise<GitStatus> {
  try {
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

    if (status[0] === "M" || status[0] === "A") staged.push(file);
    if (status[0] === "D") staged.push(file);
    if (status[0] === "R") renamed.push(file);

    if (status[1] === "M") modified.push(file);
    if (status[1] === "D") deleted.push(file);

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
    clean:
      modified.length === 0 &&
      staged.length === 0 &&
      untracked.length === 0 &&
      deleted.length === 0 &&
      renamed.length === 0,
  };
}

/**
 * Gets the current git diff, optionally for staged changes only.
 * @param {boolean} [stagedOnly=false] - If `true`, shows only staged (--cached) diffs.
 * @returns {Promise<GitDiff[]>} An array of file-level diffs.
 */
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

/**
 * Stages all files and creates a git commit.
 * @param {string} message - The commit message.
 * @returns {Promise<GitResult>} The result of the commit operation.
 */
export async function gitCommit(message: string): Promise<GitResult> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    await runGit(["add", "-A"]);
    const output = await runGit(["commit", "-m", message]);
    return { success: true, output };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Pushes the current branch to the remote.
 * @returns {Promise<GitResult>} The result of the push operation.
 */
export async function gitPush(): Promise<GitResult> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    const output = await runGit(["push"]);
    return { success: true, output };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Retrieves recent git commit history.
 * @param {number} [limit=10] - Maximum number of commits to retrieve.
 * @returns {Promise<GitCommit[]>} An array of recent commits.
 */
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

/**
 * Checks whether the current directory is within a git repository.
 * @returns {Promise<boolean>} `true` if inside a git repo, `false` otherwise.
 */
export async function hasGitRepo(): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stages the specified files for commit.
 * @param {string[]} files - File paths to stage.
 * @returns {Promise<GitResult>} The result of the staging operation.
 */
export async function stageFiles(files: string[]): Promise<GitResult> {
  try {
    const output = await runGit(["add", ...files]);
    return { success: true, output };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Unstages the specified files from the index.
 * @param {string[]} files - File paths to unstage.
 * @returns {Promise<GitResult>} The result of the unstage operation.
 */
export async function unstageFiles(files: string[]): Promise<GitResult> {
  try {
    const output = await runGit(["reset", "HEAD", ...files]);
    return { success: true, output };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
