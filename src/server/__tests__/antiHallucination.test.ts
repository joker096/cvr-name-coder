import { describe, expect, it, vi } from "vitest";
import { validateFileAccess, scanResponse, generateCorrection } from "../antiHallucination";
import type { HallucinationWarning } from "../antiHallucination";

const cwd = process.cwd();

describe("validateFileAccess", () => {
  it("returns valid for non-file tools", async () => {
    const result = await validateFileAccess("execute_command", "ls");
    expect(result.valid).toBe(true);
  });

  it("returns valid for non-file tools like git_status", async () => {
    const result = await validateFileAccess("git_status", "any");
    expect(result.valid).toBe(true);
  });

  it("returns valid when read_file path exists", async () => {
    const result = await validateFileAccess("read_file", "package.json");
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it("returns warning when read_file path does not exist", async () => {
    const result = await validateFileAccess("read_file", "nonexistent-file-xyz-123.xyz");
    expect(result.valid).toBe(false);
    expect(result.warning).toContain("does not exist");
  });

  it("returns valid when list_directory path exists", async () => {
    const result = await validateFileAccess("list_directory", "src");
    expect(result.valid).toBe(true);
  });

  it("returns warning when list_directory path does not exist", async () => {
    const result = await validateFileAccess("list_directory", "nonexistent-dir-xyz");
    expect(result.valid).toBe(false);
    expect(result.warning).toContain("does not exist");
  });

  it("returns valid for write_file on new path", async () => {
    const result = await validateFileAccess("write_file", "new-file.ts");
    expect(result.valid).toBe(true);
  });

  it("returns warning when edit_file path does not exist", async () => {
    const result = await validateFileAccess("edit_file", "nonexistent-file-xyz.ts");
    expect(result.valid).toBe(false);
    expect(result.warning).toContain("Cannot edit");
    expect(result.warning).toContain("does not exist");
  });

  it("returns valid when edit_file path exists", async () => {
    const result = await validateFileAccess("edit_file", "package.json");
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it("handles absolute paths correctly", async () => {
    const absPath = cwd + "/package.json";
    const result = await validateFileAccess("read_file", absPath);
    expect(result.valid).toBe(true);
  });

  it("handles search_files (pattern-based, no path validation needed)", async () => {
    const result = await validateFileAccess("search_files", "*.ts");
    expect(result.valid).toBe(true);
  });

  it("accepts 'read' alias for read_file", async () => {
    const result = await validateFileAccess("read", "package.json");
    expect(result.valid).toBe(true);
  });

  it("accepts 'write' alias for write_file", async () => {
    const result = await validateFileAccess("write", "new-stuff.txt");
    expect(result.valid).toBe(true);
  });

  it("accepts 'edit' alias for edit_file", async () => {
    const result = await validateFileAccess("edit", "package.json");
    expect(result.valid).toBe(true);
  });
});

describe("scanResponse", () => {
  it("returns empty for text with no file references", async () => {
    const warnings = await scanResponse("Hello, how can I help you today?");
    expect(warnings).toEqual([]);
  });

  it("detects non-existent file in response text", async () => {
    const text = "In file src/components/FakeComponent.tsx there is a bug. It should be fixed.";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].path).toContain("FakeComponent.tsx");
  });

  it("detects non-existent file with 'в файле' Russian pattern", async () => {
    const text = "В файле src/hooks/useWebSocket.ts ошибка утечки памяти.";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing.length).toBeGreaterThan(0);
  });

  it("detects backtick-quoted non-existent file", async () => {
    const text = "Let me read `src/components/Header.tsx`";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing.length).toBeGreaterThan(0);
  });

  it("detects non-existent file in read_file(...) pattern", async () => {
    const text = "read_file('dev/mcp-server-bridge.ts')";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].path).toContain("mcp-server-bridge.ts");
  });

  it("does not flag existing files", async () => {
    const text = "Let me check package.json and README.md for the configuration.";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing).toHaveLength(0);
  });

  it("deduplicates repeated file references", async () => {
    const text = "In file add-languages.js and also in add-languages.js there are issues.";
    const warnings = await scanResponse(text, cwd);
    const missing = warnings.filter((w) => w.type === "missing_file");
    expect(missing.length).toBeLessThanOrEqual(1);
  });

  it("detects fake library references like dompurify", async () => {
    const text = "import DOMPurify from 'dompurify' and use it for sanitization.";
    const warnings = await scanResponse(text, cwd);
    const fakeLibs = warnings.filter((w) => w.type === "fake_library");
    expect(fakeLibs.length).toBeGreaterThan(0);
    expect(fakeLibs[0].message).toContain("dompurify");
  });
});

describe("generateCorrection", () => {
  it("returns empty string for empty warnings", () => {
    expect(generateCorrection([])).toBe("");
  });

  it("generates correction for missing files", () => {
    const warnings: HallucinationWarning[] = [
      { type: "missing_file", message: "File x.ts not found", path: "x.ts" },
      { type: "missing_file", message: "File y.ts not found", path: "y.ts" },
    ];
    const correction = generateCorrection(warnings);
    expect(correction).toContain("ANTI-HALLUCINATION WARNING");
    expect(correction).toContain("x.ts");
    expect(correction).toContain("y.ts");
    expect(correction).toContain("DO NOT fabricate");
  });

  it("generates correction for missing directories", () => {
    const warnings: HallucinationWarning[] = [
      { type: "missing_dir", message: "Dir foo not found", path: "foo" },
    ];
    const correction = generateCorrection(warnings);
    expect(correction).toContain("do not exist");
  });

  it("generates correction for fake libraries", () => {
    const warnings: HallucinationWarning[] = [
      { type: "fake_library", message: "dompurify may not be installed" },
    ];
    const correction = generateCorrection(warnings);
    expect(correction).toContain("not be installed");
  });

  it("combines all warning types", () => {
    const warnings: HallucinationWarning[] = [
      { type: "missing_file", message: "a", path: "a.ts" },
      { type: "missing_dir", message: "b", path: "b" },
      { type: "fake_library", message: "c" },
    ];
    const correction = generateCorrection(warnings);
    expect(correction).toContain("ANTI-HALLUCINATION");
    expect(correction).toContain("do not exist");
    expect(correction).toContain("not be installed");
  });
});
