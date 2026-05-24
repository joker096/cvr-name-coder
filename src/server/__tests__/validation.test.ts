import { describe, it, expect } from "vitest";
import {
  ChatRequestSchema,
  ToolExecuteSchema,
  ReviewRequestSchema,
  AgentLoopSchema,
  AgentPlanSchema,
  SubagentSpawnSchema,
  PermissionRequestSchema,
  PermissionResolveSchema,
  CronTaskSchema,
  GitCommitSchema,
  SectionWriteSchema,
  SectionReplaceSchema,
  SectionDeleteSchema,
  SessionCreateSchema,
  SessionMessageSchema,
  SessionSearchQuerySchema,
  ReviewDecisionSchema,
  GoalConfigSchema,
  GitBranchSchema,
  GitLogQuerySchema,
  GitDiffQuerySchema,
  GitPullRequestSchema,
  BrowserNavigateSchema,
  BrowserActionSchema,
  BrowserEvaluateSchema,
  BrowserCloseSchema,
  SettingsSchema,
  validateBody,
} from "../validation";
import type { Request, Response } from "express";

describe("ChatRequestSchema", () => {
  it("should validate a minimal chat request", () => {
    const result = ChatRequestSchema.safeParse({ message: "hello" });
    expect(result.success).toBe(true);
  });

  it("should reject empty message", () => {
    const result = ChatRequestSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("should validate request with config", () => {
    const result = ChatRequestSchema.safeParse({
      message: "test",
      config: {
        aiProvider: "gemini",
        aiModel: "gemini-2.5-flash",
        temperature: 0.7,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should validate request with images", () => {
    const result = ChatRequestSchema.safeParse({
      message: "analyze this",
      images: ["data:image/png;base64,abc"],
    });
    expect(result.success).toBe(true);
  });

  it("should validate request with valid mode", () => {
    const result = ChatRequestSchema.safeParse({
      message: "test",
      config: { aiProvider: "openai", mode: "plan" },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid mode", () => {
    const result = ChatRequestSchema.safeParse({
      message: "test",
      config: { aiProvider: "openai", mode: "invalid" },
    });
    expect(result.success).toBe(false);
  });

  it("should reject message exceeding 100000 chars", () => {
    const result = ChatRequestSchema.safeParse({ message: "x".repeat(100001) });
    expect(result.success).toBe(false);
  });
});

describe("ToolExecuteSchema", () => {
  it("should validate a tool execution request", () => {
    const result = ToolExecuteSchema.safeParse({
      toolCall: { name: "read", params: { filePath: "/test.ts" } },
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing toolCall", () => {
    const result = ToolExecuteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should validate with optional fields", () => {
    const result = ToolExecuteSchema.safeParse({
      toolCall: { name: "write", params: { filePath: "/test.ts", content: "test" } },
      mode: "build",
      sessionId: "abc123",
    });
    expect(result.success).toBe(true);
  });
});

describe("AgentLoopSchema", () => {
  it("should validate a minimal agent loop request", () => {
    const result = AgentLoopSchema.safeParse({ goal: "fix bugs" });
    expect(result.success).toBe(true);
  });

  it("should reject empty goal", () => {
    const result = AgentLoopSchema.safeParse({ goal: "" });
    expect(result.success).toBe(false);
  });

  it("should validate with optional fields", () => {
    const result = AgentLoopSchema.safeParse({
      goal: "fix bugs",
      provider: "gemini",
      model: "gemini-2.5-flash",
      thinkingProvider: "anthropic",
      thinkingModel: "claude-sonnet-4-20250514",
      thinkingLocalUrl: "http://localhost:11434/v1",
    });
    expect(result.success).toBe(true);
  });
});

describe("AgentPlanSchema", () => {
  it("should be same as AgentLoopSchema", () => {
    expect(AgentPlanSchema).toBe(AgentLoopSchema);
  });
});

describe("SubagentSpawnSchema", () => {
  it("should validate a subagent spawn request", () => {
    const result = SubagentSpawnSchema.safeParse({
      goal: "search for files",
      agentConfig: {
        id: "explorer-1",
        name: "Explorer",
        description: "Finds files",
        systemPrompt: "You find files",
        tools: ["read", "glob"],
        maxSteps: 10,
        model: "gemini-2.5-flash",
        provider: "gemini",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject goal exceeding 20000 chars", () => {
    const result = SubagentSpawnSchema.safeParse({
      goal: "x".repeat(20001),
      agentConfig: {
        id: "explorer-1",
        name: "Explorer",
        description: "Finds files",
        systemPrompt: "You find files",
        tools: ["read"],
        maxSteps: 10,
        model: "gemini",
        provider: "gemini",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxSteps outside 1-100 range", () => {
    const result = SubagentSpawnSchema.safeParse({
      goal: "search",
      agentConfig: {
        id: "explorer-1",
        name: "Explorer",
        description: "Finds files",
        systemPrompt: "You find files",
        tools: ["read"],
        maxSteps: 0,
        model: "gemini",
        provider: "gemini",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("PermissionRequestSchema", () => {
  it("should validate a permission request", () => {
    const result = PermissionRequestSchema.safeParse({
      tool: "bash",
      params: { command: "git status" },
      filePath: "/project/src",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty tool name", () => {
    const result = PermissionRequestSchema.safeParse({ tool: "" });
    expect(result.success).toBe(false);
  });

  it("should reject tool name exceeding 200 chars", () => {
    const result = PermissionRequestSchema.safeParse({ tool: "x".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("should accept null param values", () => {
    const result = PermissionRequestSchema.safeParse({
      tool: "read",
      params: { filePath: null as any },
    });
    expect(result.success).toBe(true);
  });
});

describe("PermissionResolveSchema", () => {
  it("should validate approved", () => {
    const result = PermissionResolveSchema.safeParse({ approved: true });
    expect(result.success).toBe(true);
  });

  it("should validate denied", () => {
    const result = PermissionResolveSchema.safeParse({ approved: false });
    expect(result.success).toBe(true);
  });

  it("should reject non-boolean", () => {
    const result = PermissionResolveSchema.safeParse({ approved: "yes" });
    expect(result.success).toBe(false);
  });
});

describe("CronTaskSchema", () => {
  it("should validate a cron task", () => {
    const result = CronTaskSchema.safeParse({
      name: "backup",
      schedule: "0 0 * * *",
      command: "tar -czf backup.tar.gz .",
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = CronTaskSchema.safeParse({
      name: "",
      schedule: "0 0 * * *",
      command: "echo hi",
    });
    expect(result.success).toBe(false);
  });

  it("should default enabled to undefined", () => {
    const result = CronTaskSchema.safeParse({
      name: "test",
      schedule: "* * * * *",
      command: "echo hi",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBeUndefined();
    }
  });
});

describe("GitCommitSchema", () => {
  it("should validate a commit message", () => {
    const result = GitCommitSchema.safeParse({ message: "fix: resolve bug" });
    expect(result.success).toBe(true);
  });

  it("should reject empty message", () => {
    const result = GitCommitSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });
});

describe("SectionWriteSchema", () => {
  it("should validate content write", () => {
    const result = SectionWriteSchema.safeParse({ content: "some content" });
    expect(result.success).toBe(true);
  });

  it("should validate content with section", () => {
    const result = SectionWriteSchema.safeParse({
      content: "hello",
      section: "intro",
    });
    expect(result.success).toBe(true);
  });

  it("should reject content exceeding 100000 chars", () => {
    const result = SectionWriteSchema.safeParse({ content: "x".repeat(100001) });
    expect(result.success).toBe(false);
  });
});

describe("SectionReplaceSchema", () => {
  it("should validate section replace", () => {
    const result = SectionReplaceSchema.safeParse({
      content: "new content",
      section: "intro",
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing section", () => {
    const result = SectionReplaceSchema.safeParse({
      content: "new content",
    });
    expect(result.success).toBe(false);
  });
});

describe("SectionDeleteSchema", () => {
  it("should validate section delete", () => {
    const result = SectionDeleteSchema.safeParse({ section: "old-section" });
    expect(result.success).toBe(true);
  });

  it("should reject empty section", () => {
    const result = SectionDeleteSchema.safeParse({ section: "" });
    expect(result.success).toBe(false);
  });
});

describe("SessionCreateSchema", () => {
  it("should validate with title", () => {
    const result = SessionCreateSchema.safeParse({ title: "New Session" });
    expect(result.success).toBe(true);
  });

  it("should validate without title", () => {
    const result = SessionCreateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should reject title exceeding 200 chars", () => {
    const result = SessionCreateSchema.safeParse({ title: "x".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("SessionMessageSchema", () => {
  it("should validate a user message", () => {
    const result = SessionMessageSchema.safeParse({ content: "hello" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("user");
    }
  });

  it("should validate an assistant message", () => {
    const result = SessionMessageSchema.safeParse({
      role: "assistant",
      content: "response",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const result = SessionMessageSchema.safeParse({
      role: "bot",
      content: "hello",
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionSearchQuerySchema", () => {
  it("should validate with query", () => {
    const result = SessionSearchQuerySchema.safeParse({ q: "search term" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe("search term");
    }
  });

  it("should validate with limit", () => {
    const result = SessionSearchQuerySchema.safeParse({ limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("should reject limit exceeding 100", () => {
    const result = SessionSearchQuerySchema.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  it("should reject query exceeding 500 chars", () => {
    const result = SessionSearchQuerySchema.safeParse({ q: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe("ReviewDecisionSchema", () => {
  it("should validate a comment ID", () => {
    const result = ReviewDecisionSchema.safeParse({ commentId: "c-123" });
    expect(result.success).toBe(true);
  });

  it("should reject empty commentId", () => {
    const result = ReviewDecisionSchema.safeParse({ commentId: "" });
    expect(result.success).toBe(false);
  });
});

describe("GoalConfigSchema", () => {
  it("should validate a minimal goal config", () => {
    const result = GoalConfigSchema.safeParse({
      goal: "build todo app",
      provider: "gemini",
      model: "gemini-2.5-flash",
    });
    expect(result.success).toBe(true);
  });

  it("should validate full goal config", () => {
    const result = GoalConfigSchema.safeParse({
      goal: "build todo app",
      successCriteria: "working CRUD",
      maxIterations: 10,
      maxTokens: 50000,
      maxDurationMinutes: 30,
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-test",
      agent: "build",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty goal", () => {
    const result = GoalConfigSchema.safeParse({
      goal: "",
      provider: "gemini",
      model: "gemini",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty provider", () => {
    const result = GoalConfigSchema.safeParse({
      goal: "test",
      provider: "",
      model: "gemini",
    });
    expect(result.success).toBe(false);
  });

  it("should reject maxIterations exceeding 100", () => {
    const result = GoalConfigSchema.safeParse({
      goal: "test",
      provider: "gemini",
      model: "gemini",
      maxIterations: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe("GitBranchSchema", () => {
  it("should validate a valid branch name", () => {
    expect(GitBranchSchema.safeParse({ name: "feature/test-branch_v1" }).success).toBe(true);
  });

  it("should validate branch with dots and slashes", () => {
    expect(GitBranchSchema.safeParse({ name: "release/v2.0" }).success).toBe(true);
  });

  it("should reject branch name with spaces", () => {
    const result = GitBranchSchema.safeParse({ name: "feature my branch" });
    expect(result.success).toBe(false);
  });

  it("should reject branch name with special chars", () => {
    const result = GitBranchSchema.safeParse({ name: "branch!@#" });
    expect(result.success).toBe(false);
  });
});

describe("GitLogQuerySchema", () => {
  it("should validate with limit", () => {
    const result = GitLogQuerySchema.safeParse({ limit: "20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("should validate without limit", () => {
    expect(GitLogQuerySchema.safeParse({}).success).toBe(true);
  });

  it("should reject limit exceeding 100", () => {
    expect(GitLogQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("GitDiffQuerySchema", () => {
  it("should validate staged: true", () => {
    expect(GitDiffQuerySchema.safeParse({ staged: "true" }).success).toBe(true);
  });

  it("should validate staged: false", () => {
    expect(GitDiffQuerySchema.safeParse({ staged: "false" }).success).toBe(true);
  });

  it("should reject invalid staged value", () => {
    expect(GitDiffQuerySchema.safeParse({ staged: "yes" }).success).toBe(false);
  });
});

describe("GitPullRequestSchema", () => {
  it("should validate minimal PR config", () => {
    expect(GitPullRequestSchema.safeParse({}).success).toBe(true);
  });

  it("should validate PR with config", () => {
    const result = GitPullRequestSchema.safeParse({
      draft: true,
      config: {
        aiProvider: "openai",
        aiModel: "gpt-4.1",
        temperature: 0.5,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("BrowserNavigateSchema", () => {
  it("should validate a URL", () => {
    expect(BrowserNavigateSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
  });

  it("should reject invalid URL", () => {
    expect(BrowserNavigateSchema.safeParse({ url: "not-a-url" }).success).toBe(false);
  });

  it("should validate with optional fields", () => {
    expect(
      BrowserNavigateSchema.safeParse({
        url: "https://example.com",
        headless: true,
        sessionId: "s1",
      }).success
    ).toBe(true);
  });
});

describe("BrowserActionSchema", () => {
  it("should validate a selector", () => {
    expect(
      BrowserActionSchema.safeParse({ selector: "#main", text: "click me" }).success
    ).toBe(true);
  });

  it("should reject empty selector", () => {
    expect(BrowserActionSchema.safeParse({ selector: "" }).success).toBe(false);
  });
});

describe("BrowserEvaluateSchema", () => {
  it("should validate a script", () => {
    expect(
      BrowserEvaluateSchema.safeParse({ script: "document.title" }).success
    ).toBe(true);
  });

  it("should reject empty script", () => {
    expect(BrowserEvaluateSchema.safeParse({ script: "" }).success).toBe(false);
  });

  it("should reject script exceeding 100000 chars", () => {
    expect(
      BrowserEvaluateSchema.safeParse({ script: "x".repeat(100001) }).success
    ).toBe(false);
  });
});

describe("BrowserCloseSchema", () => {
  it("should validate with sessionId", () => {
    expect(BrowserCloseSchema.safeParse({ sessionId: "s1" }).success).toBe(true);
  });

  it("should validate without sessionId", () => {
    expect(BrowserCloseSchema.safeParse({}).success).toBe(true);
  });
});

describe("SettingsSchema", () => {
  it("should reject completely empty settings", () => {
    expect(SettingsSchema.safeParse({}).success).toBe(false);
  });

  it("should validate full settings object", () => {
    const result = SettingsSchema.safeParse({
      chat: {
        aiProvider: "gemini",
        aiModel: "gemini-2.5-flash",
        apiKey: "test-key",
        providerKeys: { gemini: "key1", openai: "key2" },
        temperature: 0.7,
        maxTokens: 4096,
        agent: "build",
        mode: "build",
        visionEnabled: true,
        multiModelEnabled: false,
        thinkingProvider: "anthropic",
        thinkingModel: "claude-sonnet-4-20250514",
      },
      presets: [
        {
          id: "preset-1",
          name: "My Preset",
          description: "Test",
          config: { aiProvider: "openai", aiModel: "gpt-4.1" },
          createdAt: 1234567890,
        },
      ],
      autoLoopDelay: 1500,
      isAutonomous: true,
      autoCommit: false,
      lang: "en",
      voiceEnabled: true,
      voiceLanguage: "ru",
      voiceAutoSend: false,
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-numeric autoLoopDelay", () => {
    const result = SettingsSchema.safeParse({ autoLoopDelay: "2000" });
    expect(result.success).toBe(false);
  });

  it("should reject non-boolean isAutonomous", () => {
    const result = SettingsSchema.safeParse({ isAutonomous: "yes" });
    expect(result.success).toBe(false);
  });
});

describe("ReviewRequestSchema", () => {
  it("should validate empty review request", () => {
    expect(ReviewRequestSchema.safeParse({}).success).toBe(true);
  });

  it("should validate with diff", () => {
    expect(
      ReviewRequestSchema.safeParse({ diff: "some diff content" }).success
    ).toBe(true);
  });
});

describe("validateBody middleware factory", () => {
  it("should return a middleware function", () => {
    const middleware = validateBody(ChatRequestSchema);
    expect(typeof middleware).toBe("function");
    expect(middleware.length).toBe(3);
  });

  it("should call next on valid body", () => {
    const middleware = validateBody(ChatRequestSchema);
    const req = { body: { message: "hello" } } as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 400 on invalid body", () => {
    const middleware = validateBody(ChatRequestSchema);
    const jsonFn = vi.fn();
    const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    const req = { body: { message: "" } } as Request;
    const res = { status: statusFn } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
