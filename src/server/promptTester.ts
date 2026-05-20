import type { AIGenerateOptions, Content } from "./providers.js";
import { generateAIContent } from "./providers.js";
import { estimateTokens } from "./costTracker.js";

export interface PromptVariant {
  name: string;
  systemPrompt: string;
  description?: string;
}

export interface PromptTestRequest {
  task: string;
  variants: PromptVariant[];
  provider: string;
  model?: string;
  localUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  judgeProvider?: string;
  judgeModel?: string;
}

export interface VariantResult {
  variantName: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  timeMs: number;
  error?: string;
}

export interface ComparisonResult {
  winner: string;
  reasoning: string;
  scores: Record<string, { quality: number; efficiency: number; creativity: number }>;
}

export interface PromptTestResult {
  task: string;
  timestamp: string;
  variants: VariantResult[];
  comparison?: ComparisonResult;
}

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
