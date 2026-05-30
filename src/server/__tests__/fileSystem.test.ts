import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const BASE = join(tmpdir(), "cvr-test-fs-" + Date.now());
const SUB_DIR = join(BASE, "nested", "dir");
const TEST_FILE = join(BASE, "hello.txt");
const NESTED_FILE = join(SUB_DIR, "deep.ts");
const EDIT_FILE = join(BASE, "editable.txt");

beforeEach(() => {
  mkdirSync(SUB_DIR, { recursive: true });
  writeFileSync(TEST_FILE, "Hello, World!");
  writeFileSync(NESTED_FILE, 'export const x = 42;');
  writeFileSync(EDIT_FILE, "line1\nline2\nline3");
});

afterEach(async () => {
  await resetFileToolState();
  rmSync(BASE, { recursive: true, force: true });
});

async function resetFileToolState() {
  const { setProjectRoot, setWorkspaceFileSystem } = await import("../tools/file");
  setProjectRoot(process.cwd());
  setWorkspaceFileSystem(null);
}


describe("file.ts – setProjectRoot / getProjectRoot", () => {
  it("falls back to process.cwd() when no root is set", async () => {
    const { getProjectRoot } = await import("../tools/file");
    const root = getProjectRoot();
    expect(root).toBe(process.cwd());
  });

  it("returns the value set by setProjectRoot", async () => {
    const { getProjectRoot, setProjectRoot } = await import("../tools/file");
    setProjectRoot(BASE);
    const root = getProjectRoot();
    expect(root).toBe(BASE);
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – resolveProjectPath", () => {
  it("resolves a relative path within the project root", async () => {
    const { setProjectRoot, resolveProjectPath } = await import("../tools/file");
    setProjectRoot(BASE);
    const resolved = resolveProjectPath("hello.txt");
    expect(resolved).toBe(TEST_FILE);
    setProjectRoot(process.cwd());
  });

  it("resolves nested relative paths", async () => {
    const { setProjectRoot, resolveProjectPath } = await import("../tools/file");
    setProjectRoot(BASE);
    const resolved = resolveProjectPath("nested/dir/deep.ts");
    expect(resolved).toBe(NESTED_FILE);
    setProjectRoot(process.cwd());
  });

  it("throws for path traversal with ../", async () => {
    const { setProjectRoot, resolveProjectPath } = await import("../tools/file");
    setProjectRoot(BASE);
    expect(() => resolveProjectPath("../outside.txt")).toThrow("Path escapes project root");
    setProjectRoot(process.cwd());
  });

  it("throws for deeply nested path traversal", async () => {
    const { setProjectRoot, resolveProjectPath } = await import("../tools/file");
    setProjectRoot(BASE);
    expect(() => resolveProjectPath("nested/dir/../../../../outside.txt")).toThrow("Path escapes project root");
    setProjectRoot(process.cwd());
  });

  it("rejects absolute paths outside project root", async () => {
    const { setProjectRoot, resolveProjectPath } = await import("../tools/file");
    setProjectRoot(BASE);
    expect(() => resolveProjectPath("C:\\Windows\\system32")).toThrow("Path escapes project root");
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – executeReadFile", () => {
  it("reads an existing file successfully", async () => {
    const { setProjectRoot, executeReadFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeReadFile({ path: "hello.txt" });
    expect(result.success).toBe(true);
    expect(result.output).toBe("Hello, World!");
    setProjectRoot(process.cwd());
  });

  it("errors on non-existent file", async () => {
    const { setProjectRoot, executeReadFile } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeReadFile({ path: "nope.txt" })).rejects.toThrow();
    setProjectRoot(process.cwd());
  });

  it("reads a file in subdirectory", async () => {
    const { setProjectRoot, executeReadFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeReadFile({ path: "nested/dir/deep.ts" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("export const x = 42");
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – executeListDirectory", () => {
  it("lists root directory contents", async () => {
    const { setProjectRoot, executeListDirectory } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeListDirectory({ path: "." });
    expect(result.success).toBe(true);
    expect(result.output).toContain("hello.txt");
    expect(result.output).toContain("nested");
    setProjectRoot(process.cwd());
  });

  it("lists subdirectory contents", async () => {
    const { setProjectRoot, executeListDirectory } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeListDirectory({ path: "nested/dir" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("deep.ts");
    setProjectRoot(process.cwd());
  });

  it("errors on non-existent directory", async () => {
    const { setProjectRoot, executeListDirectory } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeListDirectory({ path: "nowhere" })).rejects.toThrow();
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – executeWriteFile", () => {
  it("writes a new file", async () => {
    const { setProjectRoot, executeWriteFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeWriteFile({ path: "newfile.ts", content: "const a = 1;" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("File written");
    expect(readFileSync(join(BASE, "newfile.ts"), "utf-8")).toBe("const a = 1;");
    setProjectRoot(process.cwd());
  });

  it("creates parent directories automatically", async () => {
    const { setProjectRoot, executeWriteFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeWriteFile({ path: "a/b/c/test.txt", content: "deep" });
    expect(result.success).toBe(true);
    expect(existsSync(join(BASE, "a", "b", "c", "test.txt"))).toBe(true);
    setProjectRoot(process.cwd());
  });

  it("overwrites existing file", async () => {
    const { setProjectRoot, executeWriteFile } = await import("../tools/file");
    setProjectRoot(BASE);
    await executeWriteFile({ path: "hello.txt", content: "overwritten" });
    expect(readFileSync(TEST_FILE, "utf-8")).toBe("overwritten");
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – executeEditFile", () => {
  it("replaces text in existing file", async () => {
    const { setProjectRoot, executeEditFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeEditFile({ path: "editable.txt", oldString: "line2", newString: "modified2" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("File edited");
    expect(readFileSync(EDIT_FILE, "utf-8")).toBe("line1\nmodified2\nline3");
    setProjectRoot(process.cwd());
  });

  it("errors when oldString not found", async () => {
    const { setProjectRoot, executeEditFile } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeEditFile({ path: "editable.txt", oldString: "NONEXISTENT", newString: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("oldString not found");
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – executeSearchFiles", () => {
  it("finds files by filename", async () => {
    const { setProjectRoot, executeSearchFiles } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeSearchFiles({ path: ".", query: "deep.ts" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("[MATCH]");
    expect(result.output).toContain("deep.ts");
    expect(result.output).toContain("filename");
    setProjectRoot(process.cwd());
  });

  it("finds files by content", async () => {
    const { setProjectRoot, executeSearchFiles } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeSearchFiles({ path: ".", query: "Hello, World!" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("[MATCH]");
    expect(result.output).toContain("hello.txt");
    setProjectRoot(process.cwd());
  });

  it("returns no matches for non-existent query", async () => {
    const { setProjectRoot, executeSearchFiles } = await import("../tools/file");
    setProjectRoot(BASE);
    const result = await executeSearchFiles({ path: ".", query: "ZZZ_UNMATCHABLE_QUERY_ZZZ" });
    expect(result.success).toBe(true);
    expect(result.output).toBe("No matches found.");
    setProjectRoot(process.cwd());
  });
});

describe("file.ts – WorkspaceFileSystem backend", () => {
  it("reads, lists, searches, writes, and edits through the configured backend", async () => {
    const {
      setProjectRoot,
      setWorkspaceFileSystem,
      executeReadFile,
      executeListDirectory,
      executeSearchFiles,
      executeWriteFile,
      executeEditFile,
    } = await import("../tools/file");

    const calls: string[] = [];
    setProjectRoot(BASE);
    setWorkspaceFileSystem({
      async readText(filePath) {
        calls.push(`read:${filePath}`);
        return readFileSync(filePath, "utf-8");
      },
      async writeText(filePath, content) {
        calls.push(`write:${filePath}`);
        writeFileSync(filePath, content);
      },
      async createDirectory(dirPath) {
        calls.push(`mkdir:${dirPath}`);
        mkdirSync(dirPath, { recursive: true });
      },
      async readDirectory(dirPath) {
        calls.push(`readdir:${dirPath}`);
        const { readdirSync } = await import("fs");
        return readdirSync(dirPath, { withFileTypes: true }).map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other",
        }));
      },
    });

    const readResult = await executeReadFile({ path: "hello.txt" });
    expect(readResult.output).toBe("Hello, World!");

    const listResult = await executeListDirectory({ path: "." });
    expect(listResult.output).toContain("hello.txt");
    expect(listResult.output).toContain("nested");

    const searchResult = await executeSearchFiles({ path: ".", query: "export const x" });
    expect(searchResult.output).toContain("nested");
    expect(searchResult.output).toContain("content");

    const writeResult = await executeWriteFile({ path: "created/by/backend.txt", content: "created" });
    expect(writeResult.success).toBe(true);
    expect(readFileSync(join(BASE, "created", "by", "backend.txt"), "utf-8")).toBe("created");

    const editResult = await executeEditFile({ path: "editable.txt", oldString: "line2", newString: "backend2" });
    expect(editResult.success).toBe(true);
    expect(readFileSync(EDIT_FILE, "utf-8")).toBe("line1\nbackend2\nline3");

    expect(calls.some((call) => call.startsWith("read:"))).toBe(true);
    expect(calls.some((call) => call.startsWith("readdir:"))).toBe(true);
    expect(calls.some((call) => call.startsWith("mkdir:"))).toBe(true);
    expect(calls.some((call) => call.startsWith("write:"))).toBe(true);

    await resetFileToolState();
  });

  it("blocks paths outside the project before invoking the backend", async () => {
    const { setProjectRoot, setWorkspaceFileSystem, executeReadFile, executeWriteFile } = await import("../tools/file");
    const readText = vi.fn(async () => "should not run");
    const writeText = vi.fn(async () => undefined);

    setProjectRoot(BASE);
    setWorkspaceFileSystem({
      readText,
      writeText,
      createDirectory: vi.fn(async () => undefined),
      readDirectory: vi.fn(async () => []),
    });

    await expect(executeReadFile({ path: "../outside.txt" })).rejects.toThrow("Path escapes project root");
    await expect(executeWriteFile({ path: "../outside.txt", content: "nope" })).rejects.toThrow("Path escapes project root");
    expect(readText).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();

    await resetFileToolState();
  });
});

describe("file.ts – path traversal protection on all operations", () => {
  it("executeReadFile blocks path traversal", async () => {
    const { setProjectRoot, executeReadFile } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeReadFile({ path: "../outside.txt" })).rejects.toThrow("Path escapes");
    setProjectRoot(process.cwd());
  });

  it("executeWriteFile blocks path traversal", async () => {
    const { setProjectRoot, executeWriteFile } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeWriteFile({ path: "../pwned.txt", content: "hack" })).rejects.toThrow("Path escapes");
    setProjectRoot(process.cwd());
  });

  it("executeEditFile blocks path traversal", async () => {
    const { setProjectRoot, executeEditFile } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeEditFile({ path: "../target.txt", oldString: "x", newString: "y" })).rejects.toThrow("Path escapes");
    setProjectRoot(process.cwd());
  });

  it("executeSearchFiles blocks path traversal", async () => {
    const { setProjectRoot, executeSearchFiles } = await import("../tools/file");
    setProjectRoot(BASE);
    await expect(executeSearchFiles({ path: "../", query: "x" })).rejects.toThrow("Path escapes");
    setProjectRoot(process.cwd());
  });
});

describe("system.ts – executeCommand default cwd", () => {
  it("uses getProjectRoot() as default working directory", async () => {
    const { setProjectRoot } = await import("../tools/file");
    const { executeCommand } = await import("../tools/system");
    setProjectRoot(BASE);
    const result = await executeCommand({ command: process.platform === "win32" ? "cmd /c echo %CD%" : "pwd" });
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(BASE);
    setProjectRoot(process.cwd());
  });

  it("respects explicit cwd parameter relative to project root", async () => {
    const { setProjectRoot } = await import("../tools/file");
    const { executeCommand } = await import("../tools/system");
    setProjectRoot(BASE);
    const result = await executeCommand({
      command: process.platform === "win32" ? "cmd /c echo %CD%" : "pwd",
      cwd: "nested/dir",
    });
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe(SUB_DIR);
    setProjectRoot(process.cwd());
  });

  it("blocks cwd path traversal", async () => {
    const { setProjectRoot } = await import("../tools/file");
    const { executeCommand } = await import("../tools/system");
    setProjectRoot(BASE);
    await expect(executeCommand({
      command: process.platform === "win32" ? "cmd /c echo %CD%" : "pwd",
      cwd: "../escaped",
    })).rejects.toThrow("Path escapes project root");
    setProjectRoot(process.cwd());
  });
});

describe("antiHallucination.ts – default workspaceRoot uses getProjectRoot", () => {
  it("validateFileAccess with no workspaceRoot uses getProjectRoot", async () => {
    const { getProjectRoot, setProjectRoot } = await import("../tools/file");
    const { validateFileAccess } = await import("../antiHallucination");

    setProjectRoot(BASE);
    const result = await validateFileAccess("read_file", "hello.txt");
    expect(result.valid).toBe(true);

    const resultMissing = await validateFileAccess("read_file", "does-not-exist.txt");
    expect(resultMissing.valid).toBe(false);
    expect(resultMissing.warning).toContain("does not exist");

    setProjectRoot(process.cwd());
  });

  it("scanResponse with no workspaceRoot uses getProjectRoot and validates files exist", async () => {
    const { setProjectRoot } = await import("../tools/file");
    const { scanResponse } = await import("../antiHallucination");

    setProjectRoot(BASE);

    const textWithExisting = "Check hello.txt for content";
    const warnings = await scanResponse(textWithExisting);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing).toHaveLength(0);

    const textWithMissing = "See missing.ts for the fix";
    const warnings2 = await scanResponse(textWithMissing);
    const missing2 = warnings2.filter((w) => w.type === "missing_file");
    expect(missing2.length).toBeGreaterThan(0);
    expect(missing2[0].path).toContain("missing.ts");

    setProjectRoot(process.cwd());
  });
});
