import type { AIGenerateOptions, Content } from "./providers.js";
import { generateAIContent } from "./providers.js";
import { estimateTokens } from "./costTracker.js";

/** A named prompt variant to test. */
export interface PromptVariant {
  /** Display name for this variant. */
  name: string;
  /** The system prompt text. */
  systemPrompt: string;
  /** Optional human-readable description. */
  description?: string;
}

/** Request parameters for running a prompt comparison test. */
export interface PromptTestRequest {
  /** The user task to send to each variant. */
  task: string;
  /** The list of prompt variants to evaluate. */
  variants: PromptVariant[];
  /** AI provider identifier (e.g. "openai", "gemini"). */
  provider: string;
  /** Optional model override for the provider. */
  model?: string;
  /** Optional local LLM URL for self-hosted providers. */
  localUrl?: string;
  /** API key for the provider. */
  apiKey?: string;
  /** Sampling temperature (0-2). */
  temperature?: number;
  /** Maximum output tokens allowed. */
  maxTokens?: number;
  /** Optional separate provider for the judge/evaluator. */
  judgeProvider?: string;
  /** Optional model for the judge provider. */
  judgeModel?: string;
}

/** Result for a single prompt variant execution. */
export interface VariantResult {
  /** Name of the variant that was tested. */
  variantName: string;
  /** Raw AI output text. */
  output: string;
  /** Estimated input tokens consumed. */
  inputTokens: number;
  /** Estimated output tokens produced. */
  outputTokens: number;
  /** Wall-clock execution time in milliseconds. */
  timeMs: number;
  /** Error message if the variant failed. */
  error?: string;
}

/** Comparison scores and winner determined by the judge AI. */
export interface ComparisonResult {
  /** Name of the winning variant. */
  winner: string;
  /** Natural-language explanation of why the winner was chosen. */
  reasoning: string;
  /** Per-variant scores for quality, efficiency, and creativity (0-10). */
  scores: Record<string, { quality: number; efficiency: number; creativity: number }>;
}

/** Complete result of a prompt comparison test. */
export interface PromptTestResult {
  /** The original task used for testing. */
  task: string;
  /** ISO-8601 timestamp of when the test was run. */
  timestamp: string;
  /** Results for each individual variant. */
  variants: VariantResult[];
  /** Optional judge comparison across all variants. */
  comparison?: ComparisonResult;
}

/**
 * Runs a prompt comparison test across multiple variants.
 * Each variant is sent the same task and its output is collected.
 * If at least two variants succeeded, a judge AI compares them.
 *
 * @param req - The test request containing variants and provider settings.
 * @returns A {@link PromptTestResult} with per-variant metrics and optional comparison.
 */
export async function runPromptTest(req: PromptTestRequest): Promise<PromptTestResult> {
  const variantResults: VariantResult[] = [];

  for (const variant of req.variants) {
    const start = Date.now();
    try {
      const contents: Content[] = [
        { role: "user", parts: [{ text: req.task }] },
      ];
      const options: AIGenerateOptions = {
        prompt: variant.systemPrompt,
        contents,
        modelName: req.model,
        apiKey: req.apiKey,
        temperature: req.temperature ?? 0.7,
        maxTokens: req.maxTokens ?? 4096,
      };
      const response = await generateAIContent(
        options.prompt,
        contents,
        req.provider,
        req.localUrl ?? "",
        req.model ?? "",
        req.apiKey ?? "",
        options.temperature,
        options.maxTokens
      );
      const outputTok = estimateTokens(response);
      variantResults.push({
        variantName: variant.name,
        output: response,
        inputTokens: estimateTokens(variant.systemPrompt + req.task),
        outputTokens: outputTok,
        timeMs: Date.now() - start,
      });
    } catch (e) {
      variantResults.push({
        variantName: variant.name,
        output: "",
        inputTokens: 0,
        outputTokens: 0,
        timeMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const result: PromptTestResult = {
    task: req.task,
    timestamp: new Date().toISOString(),
    variants: variantResults,
  };

  const judgeProvider = req.judgeProvider || req.provider;
  const judgeModel = req.judgeModel || req.model;

  if (variantResults.length >= 2 && variantResults.every((v) => !v.error) && judgeProvider) {
    const comparison = await compareWithJudge(
      req.task,
      variantResults,
      judgeProvider,
      req.localUrl ?? "",
      judgeModel ?? "",
      req.apiKey ?? ""
    );
    result.comparison = comparison;
  }

  return result;
}

/**
 * Uses an AI judge to compare variant outputs and select a winner.
 * Falls back to selecting the variant with the lowest token count if the judge is unavailable.
 *
 * @param task - The original user task.
 * @param results - Results from each variant.
 * @param provider - AI provider for the judge.
 * @param localUrl - Local LLM URL (if self-hosted).
 * @param model - Model name for the judge.
 * @param apiKey - API key for the judge provider.
 * @returns A {@link ComparisonResult} with winner and scores.
 */
async function compareWithJudge(
  task: string,
  results: VariantResult[],
  provider: string,
  localUrl: string,
  model: string,
  apiKey: string
): Promise<ComparisonResult> {
  const comparisonPrompt = `You are an impartial judge evaluating prompt variants for an AI coding assistant.

USER TASK:
${task}

Evaluate these outputs from different prompt variants and determine which is best overall. Consider:
1. Quality: correctness, completeness, code quality
2. Efficiency: conciseness, token usage  
3. Creativity: elegant solutions, novel approaches

Output ONLY a JSON object (no markdown, no code fences):

{
  "winner": "VariantName",
  "reasoning": "Brief explanation of why this variant won.",
  "scores": {
    "VariantA": { "quality": 8, "efficiency": 7, "creativity": 6 },
    "VariantB": { "quality": 7, "efficiency": 9, "creativity": 8 }
  }
}`;

  const variantsText = results
    .map(
      (r) =>
        `### VARIANT: ${r.variantName} (${r.inputTokens + r.outputTokens} tokens, ${r.timeMs}ms)\n${r.output.slice(0, 2000)}`
    )
    .join("\n\n---\n\n");

  try {
    const response = await generateAIContent(
      comparisonPrompt + "\n\n" + variantsText,
      [],
      provider,
      localUrl,
      model,
      apiKey,
      0.3,
      2048
    );
    const cleaned = response
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned) as ComparisonResult;
  } catch {
    const bestTokens = results.reduce((best, r) =>
      r.inputTokens + r.outputTokens < best.inputTokens + best.outputTokens ? r : best
    );
    return {
      winner: bestTokens.variantName,
      reasoning: "Fallback: selected by lowest token count (judge unavailable).",
      scores: Object.fromEntries(
        results.map((r) => [
          r.variantName,
          {
            quality: Math.round((1 - (r.output.length ? 0 : 1)) * 10),
            efficiency: Math.round(
              Math.min(10, 10000 / Math.max(1, r.inputTokens + r.outputTokens))
            ),
            creativity: 5,
          },
        ])
      ),
    };
  }
}
