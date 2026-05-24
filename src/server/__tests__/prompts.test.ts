import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
  };
});

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    stat: vi.fn().mockResolvedValue({ mtimeMs: 1234567890000 }),
  };
});

vi.mock("../agentLoader.js", () => ({
  getAgentById: vi.fn().mockReturnValue(undefined),
}));

vi.mock("../memoryStore.js", () => ({
  getMemoryContext: vi.fn().mockResolvedValue("memory context data"),
}));

vi.mock("../instructionLoader.js", () => ({
  getInstructionsContext: vi.fn().mockResolvedValue("instruction rules"),
}));

vi.mock("../customToolLoader.js", () => ({
  loadCustomTools: vi.fn().mockResolvedValue([]),
}));

vi.mock("./tools/design.js", () => ({
  getActiveDesignSystem: vi.fn().mockResolvedValue(null),
}));

import { buildSystemPrompt } from "../prompts";

describe("buildSystemPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build a prompt for build mode", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "build",
    });

    expect(prompt).toContain("cvr.name");
    expect(prompt).toContain("BUILD MODE ACTIVE");
    expect(prompt).toContain("AVAILABLE TOOLS:");
    expect(prompt).toContain("read (read-only)");
    expect(prompt).toContain("write");
    expect(prompt).toContain("bash");
  });

  it("should build a prompt for plan mode", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "plan",
    });

    expect(prompt).toContain("PLANNING MODE ACTIVE");
    expect(prompt).toContain("Do NOT write files");
  });

  it("should build a prompt for review mode", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "review",
    });

    expect(prompt).toContain("REVIEW MODE ACTIVE");
    expect(prompt).toContain("code reviewer");
  });

  it("should include agent identity for known agent", async () => {
    const prompt = await buildSystemPrompt({
      agent: "explore",
      mode: "build",
    });

    expect(prompt).toContain("EXPLORE");
    expect(prompt).toContain("Read-only specialist");
  });

  it("should include context parts when provided", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "build",
      contextParts: "custom context string",
    });

    expect(prompt).toContain("custom context string");
  });

  it("should use custom system prompt when provided", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "build",
      customSystemPrompt: "You are a specialist in Python.",
    });

    expect(prompt.startsWith("You are a specialist in Python.")).toBe(true);
    expect(prompt).toContain("BUILD MODE ACTIVE");
    expect(prompt).toContain("AVAILABLE TOOLS:");
  });

  it("should include persistent context cluster section", async () => {
    const prompt = await buildSystemPrompt({
      agent: "build",
      mode: "build",
    });

    expect(prompt).toContain("PERSISTENT CONTEXT");
  });
});
