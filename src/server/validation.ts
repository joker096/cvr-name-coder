import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

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
  }).optional(),
  kernelConfig: z.record(z.string(), z.any()).optional(),
  agent: z.string().optional(),
});

export const ToolExecuteSchema = z.object({
  toolCall: z.object({
    name: z.string(),
    params: z.record(z.string(), z.any()),
  }),
  mode: z.union([z.literal("plan"), z.literal("build"), z.literal("review")]).optional(),
  sessionId: z.string().optional(),
});

export const ReviewRequestSchema = z.object({
  diff: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const AgentLoopSchema = z.object({
  goal: z.string().min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
});

export const CronTaskSchema = z.object({
  name: z.string().min(1),
  schedule: z.string().min(1),
  command: z.string().min(1),
  enabled: z.boolean().optional(),
});

export const GitCommitSchema = z.object({
  message: z.string().min(1),
});

export const BrowserNavigateSchema = z.object({
  url: z.string().url(),
  headless: z.boolean().optional(),
  sessionId: z.string().optional(),
});

export const BrowserActionSchema = z.object({
  selector: z.string().min(1),
  text: z.string().optional(),
  headless: z.boolean().optional(),
  sessionId: z.string().optional(),
});
