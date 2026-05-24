import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware factory that validates request body against a Zod schema.
 * Returns 400 with formatted error details on failure.
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.format(),
      });
      return;
    }
    next();
  };
}

/** Validation schema for POST /api/chat requests. */
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(100_000),
  images: z.array(z.string()).optional(),
  config: z.object({
    aiProvider: z.string(),
    aiModel: z.string().optional(),
    localUrl: z.string().optional(),
    localModelName: z.string().optional(),
    customUrl: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
    agent: z.string().optional(),
    mode: z.union([z.literal("plan"), z.literal("build"), z.literal("review")]).optional(),
    visionEnabled: z.boolean().optional(),
    maxImageSize: z.number().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  kernelConfig: z.record(z.string(), z.any()).optional(),
  agent: z.string().optional(),
});

/** Validation schema for POST /api/tools requests. */
export const ToolExecuteSchema = z.object({
  toolCall: z.object({
    name: z.string(),
    params: z.record(z.string(), z.any()),
  }),
  mode: z.union([z.literal("plan"), z.literal("build"), z.literal("review")]).optional(),
  sessionId: z.string().optional(),
});

/** Validation schema for POST /api/review requests. */
export const ReviewRequestSchema = z.object({
  diff: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

/** Validation schema for POST /api/agent-loop requests. */
export const AgentLoopSchema = z.object({
  goal: z.string().min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
  thinkingProvider: z.string().optional(),
  thinkingModel: z.string().optional(),
  thinkingLocalUrl: z.string().optional(),
});

/** Validation schema for POST /api/agent-plan requests (alias of AgentLoopSchema). */
export const AgentPlanSchema = AgentLoopSchema;

/** Validation schema for POST /api/subagents/spawn requests. */
export const SubagentSpawnSchema = z.object({
  parentId: z.string().max(200).optional(),
  goal: z.string().min(1).max(20_000),
  agentConfig: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    systemPrompt: z.string(),
    tools: z.array(z.string()),
    maxSteps: z.number().int().min(1).max(100),
    model: z.string(),
    provider: z.string(),
  }),
  provider: z.string().optional(),
  model: z.string().optional(),
  thinkingProvider: z.string().optional(),
  thinkingModel: z.string().optional(),
  thinkingLocalUrl: z.string().optional(),
});

/** Validation schema for permission check requests. */
export const PermissionRequestSchema = z.object({
  tool: z.string().min(1).max(200),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  filePath: z.string().max(2000).optional(),
  command: z.string().max(20_000).optional(),
});

/** Validation schema for permission resolve responses. */
export const PermissionResolveSchema = z.object({
  approved: z.boolean(),
});

/** Validation schema for scheduled cron task definitions. */
export const CronTaskSchema = z.object({
  name: z.string().min(1),
  schedule: z.string().min(1),
  command: z.string().min(1),
  enabled: z.boolean().optional(),
});

/** Validation schema for POST /api/git/commit requests. */
export const GitCommitSchema = z.object({
  message: z.string().min(1),
});

/** Validation schema for writing a memory section. */
export const SectionWriteSchema = z.object({
  content: z.string().max(100_000),
  section: z.string().min(1).max(200).optional(),
});

/** Validation schema for replacing a memory section. */
export const SectionReplaceSchema = z.object({
  content: z.string().max(100_000),
  section: z.string().min(1).max(200),
});

/** Validation schema for deleting a memory section. */
export const SectionDeleteSchema = z.object({
  section: z.string().min(1).max(200),
});

/** Validation schema for creating a new chat session. */
export const SessionCreateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

/** Validation schema for chat session messages. */
export const SessionMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]).default("user"),
  content: z.string().min(1).max(100_000),
});

/** Validation schema for session search query parameters. */
export const SessionSearchQuerySchema = z.object({
  q: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Validation schema for code review decision actions. */
export const ReviewDecisionSchema = z.object({
  commentId: z.string().min(1).max(200),
});

/** Validation schema for autonomous agent goal configuration. */
export const GoalConfigSchema = z.object({
  goal: z.string().min(1).max(20_000),
  successCriteria: z.string().max(20_000).optional(),
  maxIterations: z.number().int().min(1).max(100).optional(),
  maxTokens: z.number().int().min(1).max(1_000_000).optional(),
  maxDurationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  apiKey: z.string().max(1000).optional(),
  agent: z.string().max(100).optional(),
});

/** Validation schema for git branch creation requests. */
export const GitBranchSchema = z.object({
  name: z.string().min(1).max(200).regex(/^[A-Za-z0-9._/-]+$/, "Invalid branch name"),
});

/** Validation schema for git log query parameters. */
export const GitLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Validation schema for git diff query parameters. */
export const GitDiffQuerySchema = z.object({
  staged: z.enum(["true", "false"]).optional(),
});

/** Validation schema for git pull request creation. */
export const GitPullRequestSchema = z.object({
  draft: z.boolean().optional(),
  config: z.object({
    aiProvider: z.string().optional(),
    localUrl: z.string().optional(),
    aiModel: z.string().optional(),
    apiKey: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    multiModelEnabled: z.boolean().optional(),
    thinkingProvider: z.string().optional(),
    thinkingModel: z.string().optional(),
    thinkingLocalUrl: z.string().optional(),
  }).optional(),
});

/** Validation schema for browser navigate requests. */
export const BrowserNavigateSchema = z.object({
  url: z.string().url(),
  headless: z.boolean().optional(),
  sessionId: z.string().optional(),
});

/** Validation schema for browser action requests (click, type, etc.). */
export const BrowserActionSchema = z.object({
  selector: z.string().min(1),
  text: z.string().optional(),
  headless: z.boolean().optional(),
  sessionId: z.string().optional(),
});

/** Validation schema for browser JavaScript evaluation. */
export const BrowserEvaluateSchema = z.object({
  script: z.string().min(1).max(100_000),
  headless: z.boolean().optional(),
  sessionId: z.string().optional(),
});

/** Validation schema for browser close/session end requests. */
export const BrowserCloseSchema = z.object({
  sessionId: z.string().optional(),
});

/** Validation schema for application settings (PUT /api/settings). */
export const SettingsSchema = z.object({
  chat: z.object({
    aiProvider: z.string().optional(),
    aiModel: z.string().optional(),
    apiKey: z.string().optional(),
    providerKeys: z.record(z.string(), z.string()).optional(),
    localUrl: z.string().optional(),
    localModelName: z.string().optional(),
    customUrl: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    systemPrompt: z.string().optional(),
    agent: z.string().optional(),
    mode: z.union([z.literal("plan"), z.literal("build"), z.literal("review")]).optional(),
    visionEnabled: z.boolean().optional(),
    maxImageSize: z.number().optional(),
    multiModelEnabled: z.boolean().optional(),
    thinkingProvider: z.string().optional(),
    thinkingModel: z.string().optional(),
    thinkingLocalUrl: z.string().optional(),
  }).passthrough(),
  presets: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    config: z.object({
      aiProvider: z.string().optional(),
      aiModel: z.string().optional(),
      apiKey: z.string().optional(),
      providerKeys: z.record(z.string(), z.string()).optional(),
      localUrl: z.string().optional(),
      localModelName: z.string().optional(),
      customUrl: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      systemPrompt: z.string().optional(),
      agent: z.string().optional(),
      mode: z.union([z.literal("plan"), z.literal("build"), z.literal("review")]).optional(),
      visionEnabled: z.boolean().optional(),
      maxImageSize: z.number().optional(),
      multiModelEnabled: z.boolean().optional(),
      thinkingProvider: z.string().optional(),
      thinkingModel: z.string().optional(),
      thinkingLocalUrl: z.string().optional(),
    }).passthrough(),
    createdAt: z.number(),
  })).optional(),
  autoLoopDelay: z.number().optional(),
  isAutonomous: z.boolean().optional(),
  autoCommit: z.boolean().optional(),
  lang: z.string().optional(),
  voiceEnabled: z.boolean().optional(),
  voiceLanguage: z.string().optional(),
  voiceAutoSend: z.boolean().optional(),
}).passthrough();
