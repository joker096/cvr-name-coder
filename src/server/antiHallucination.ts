import { stat } from "fs/promises";
import { resolve, isAbsolute } from "path";
import { getProjectRoot } from "./tools/file.js";

const FILE_READ_TOOLS = new Set(["read_file", "read"]);
const FILE_WRITE_TOOLS = new Set(["write_file", "write", "edit_file", "edit"]);
const DIR_LIST_TOOLS = new Set(["list_directory", "list_files", "glob"]);
const SEARCH_TOOLS = new Set(["search_files", "search", "grep"]);

const ALL_FILE_TOOLS = new Set([...FILE_READ_TOOLS, ...FILE_WRITE_TOOLS, ...DIR_LIST_TOOLS, ...SEARCH_TOOLS]);

export interface HallucinationWarning {
  type: "missing_file" | "missing_dir" | "invented_code" | "fake_library";
  message: string;
  path?: string;
}

export interface ValidateResult {
  valid: boolean;
  warning?: string;
  correctedPath?: string;
}

function normalizePath(rawPath: string, workspace: string = getProjectRoot()): string {
  const trimmed = rawPath.trim();
  if (isAbsolute(trimmed)) return trimmed;
  return resolve(workspace, trimmed);
}

async function pathExists(absPath: string): Promise<boolean> {
  try {
    await stat(absPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a file/directory path in a tool call actually exists.
 * For read_file/edit_file/list_directory — the path must exist.
 * For write_file — the parent directory must exist (or we allow creation).
 * Returns a warning if the path is suspicious or non-existent.
 */
export async function validateFileAccess(
  toolName: string,
  filePath: string,
  workspaceRoot: string = getProjectRoot()
): Promise<ValidateResult> {
  if (!ALL_FILE_TOOLS.has(toolName)) return { valid: true };

  const absPath = normalizePath(filePath);

  if (FILE_READ_TOOLS.has(toolName) || FILE_WRITE_TOOLS.has(toolName)) {
    if (FILE_READ_TOOLS.has(toolName)) {
      const exists = await pathExists(absPath);
      if (!exists) {
        const relPath = absPath.replace(workspaceRoot, "").replace(/^[\\/]/, "");
        return {
          valid: false,
          warning: `File "${relPath}" does not exist in the workspace. Do not invent file paths — only reference files you have actually found via list_directory/search_files. Please re-explore the codebase to find the real files.`,
        };
      }
    }
    if (FILE_WRITE_TOOLS.has(toolName)) {
      if (toolName === "edit_file" || toolName === "edit") {
        const exists = await pathExists(absPath);
        if (!exists) {
          const relPath = absPath.replace(workspaceRoot, "").replace(/^[\\/]/, "");
          return {
            valid: false,
            warning: `Cannot edit "${relPath}" — it does not exist. Use write_file to create new files, or list_directory to find the correct path.`,
          };
        }
      }
    }
  }

  if (DIR_LIST_TOOLS.has(toolName)) {
    const exists = await pathExists(absPath);
    if (!exists) {
      return {
        valid: false,
        warning: `Directory "${absPath.replace(workspaceRoot, "").replace(/^[\\/]/, "")}" does not exist. Use an existing directory path.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Scans AI response text for references to files that look hallucinated.
 * Detects patterns like:
 * - "In file X: ..." where X doesn't exist
 * - Backtick-quoted paths like `src/components/Foo.tsx`
 * - "Reading X..." followed by fabricated analysis
 */
export async function scanResponse(
  text: string,
  workspaceRoot: string = getProjectRoot()
): Promise<HallucinationWarning[]> {
  const warnings: HallucinationWarning[] = [];

  const pathPatterns = [
    /(?:["'\x60]|^|\s)([\w\-\/\\]+\.[a-zA-Z0-9]{1,8}(?:x?))(?:["'\x60]|\b)/gm,
  ];

  const checked = new Set<string>();

  const root = workspaceRoot || getProjectRoot();

  for (const pattern of pathPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawPath = match[1];
      if (!rawPath || checked.has(rawPath.toLowerCase())) continue;
      checked.add(rawPath.toLowerCase());

      const absPath = normalizePath(rawPath, root);
      const exists = await pathExists(absPath);
      if (!exists) {
        warnings.push({
          type: "missing_file",
          message: `Referenced file "${rawPath}" does not exist in the workspace. This may be a hallucination.`,
          path: rawPath,
        });
      }
    }
  }

  const fakeLibPatterns = [
    { pattern: /import\s+.*\s+from\s+['"](dompurify)['"]/gi, lib: "dompurify" },
    { pattern: /import\s+.*\s+from\s+['"](helmet)['"]/gi, lib: "helmet" },
    { pattern: /require\s*\(\s*['"](dompurify)['"]\s*\)/gi, lib: "dompurify" },
  ];

  for (const { pattern, lib } of fakeLibPatterns) {
    if (pattern.test(text)) {
      warnings.push({
        type: "fake_library",
        message: `Referenced library "${lib}" which may not be installed. Verify it exists in package.json before suggesting its use.`,
      });
    }
  }

  return warnings;
}

/**
 * Generates a correction message to inject back into the AI conversation
 * when hallucinations are detected, forcing the model to re-verify.
 */
export function generateCorrection(warnings: HallucinationWarning[]): string {
  if (warnings.length === 0) return "";

  const missingFiles = warnings.filter((w) => w.type === "missing_file");
  const missingDirs = warnings.filter((w) => w.type === "missing_dir");
  const fakeLibs = warnings.filter((w) => w.type === "fake_library");

  const parts: string[] = [];

  if (missingFiles.length > 0) {
    parts.push(
      `⚠️ ANTI-HALLUCINATION WARNING: The following files you referenced DO NOT EXIST in this project:\n${missingFiles
        .map((w) => `  - ${w.path}`)
        .join("\n")}\n\nDO NOT fabricate error reports or code fixes for files you have not read. Use list_directory and read_file to explore the ACTUAL project structure first, then only reference REAL files.`
    );
  }

  if (missingDirs.length > 0) {
    parts.push(
      `⚠️ The following directories do not exist: ${missingDirs.map((w) => w.path).join(", ")}. Verify directory paths before listing.`
    );
  }

  if (fakeLibs.length > 0) {
    parts.push(
      `⚠️ You referenced libraries that may not be installed: ${fakeLibs.map((w) => w.message).join("; ")}. Check package.json before suggesting these.`
    );
  }

  return parts.join("\n\n");
}
