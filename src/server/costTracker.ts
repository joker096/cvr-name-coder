import * as path from "path";
import { readFile, writeFile, access } from "fs/promises";

/**
 * A single cost tracking entry representing one AI API call.
 */
export interface CostEntry {
  /** The AI provider identifier (e.g. "openai", "gemini"). */
  provider: string;
  /** The specific model name used. */
  model: string;
  /** Number of input (prompt) tokens consumed. */
  inputTokens: number;
  /** Number of output (completion) tokens generated. */
  outputTokens: number;
  /** Calculated cost in USD. */
  cost: number;
  /** ISO 8601 timestamp of when the cost was recorded. */
  timestamp: string;
}

/**
 * Aggregated cost summary across all tracked API calls.
 */
export interface CostSummary {
  /** Total cost in USD across all entries. */
  totalCost: number;
  /** Total input tokens across all entries. */
  totalInputTokens: number;
  /** Total output tokens across all entries. */
  totalOutputTokens: number;
  /** Cost and usage breakdown grouped by provider. */
  byProvider: Record<
    string,
    {
      /** Total cost for this provider in USD. */
      cost: number;
      /** Total input tokens for this provider. */
      inputTokens: number;
      /** Total output tokens for this provider. */
      outputTokens: number;
      /** Number of API calls made to this provider. */
      calls: number;
    }
  >;
  /** All individual cost entries. */
  entries: CostEntry[];
}

interface RateCard {
  input: number; // cost per 1M tokens
  output: number; // cost per 1M tokens
}

// Rate cards in USD per 1M tokens
const RATE_CARDS: Record<string, RateCard> = {
  gemini: { input: 0.075, output: 0.3 },
  openai: { input: 2.5, output: 10 },
  anthropic: { input: 3, output: 15 },
  deepseek: { input: 0.14, output: 0.28 },
};

const GENERIC_RATE: RateCard = { input: 1, output: 1 };

const STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const COSTS_FILE = path.join(STORAGE_DIR, "costs.json");

function getRateCard(provider: string): RateCard {
  const key = provider.toLowerCase();
  return RATE_CARDS[key] || GENERIC_RATE;
}

function calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
  const rates = getRateCard(provider);
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  return Number((inputCost + outputCost).toFixed(6));
}

async function loadCosts(): Promise<CostEntry[]> {
  try {
    await access(COSTS_FILE);
    const data = await readFile(COSTS_FILE, "utf-8");
    const parsed: unknown = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed as CostEntry[];
    return [];
  } catch {
    return [];
  }
}

async function saveCosts(entries: CostEntry[]): Promise<void> {
  await writeFile(COSTS_FILE, JSON.stringify(entries, null, 2));
}

/**
 * Records a cost entry for an AI API call and persists it to disk.
 * Calculates the cost using provider-specific rate cards (USD per 1M tokens).
 * @param {string} provider - The AI provider identifier.
 * @param {string} model - The model name used.
 * @param {number} inputTokens - Number of input (prompt) tokens.
 * @param {number} outputTokens - Number of output (completion) tokens.
 * @returns {Promise<CostEntry>} The newly created cost entry.
 */
export async function trackCost(provider: string, model: string, inputTokens: number, outputTokens: number): Promise<CostEntry> {
  const entry: CostEntry = {
    provider: provider.toLowerCase(),
    model: model || "unknown",
    inputTokens,
    outputTokens,
    cost: calculateCost(provider, inputTokens, outputTokens),
    timestamp: new Date().toISOString(),
  };

  const entries = await loadCosts();
  entries.push(entry);
  await saveCosts(entries);

  return entry;
}

/**
 * Retrieves a complete cost summary including per-provider breakdowns and all entries.
 * @returns {Promise<CostSummary>} Aggregated cost summary.
 */
export async function getCosts(): Promise<CostSummary> {
  const entries = await loadCosts();

  const summary: CostSummary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byProvider: {},
    entries,
  };

  for (const entry of entries) {
    summary.totalCost += entry.cost;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;

    const existing = summary.byProvider[entry.provider];
    if (existing) {
      existing.cost += entry.cost;
      existing.inputTokens += entry.inputTokens;
      existing.outputTokens += entry.outputTokens;
      existing.calls += 1;
    } else {
      summary.byProvider[entry.provider] = {
        cost: entry.cost,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        calls: 1,
      };
    }
  }

  summary.totalCost = Number(summary.totalCost.toFixed(6));
  return summary;
}

/**
 * Retrieves a cost summary filtered to a specific provider.
 * @param {string} provider - The provider identifier to filter by.
 * @returns {Promise<CostSummary>} Cost summary containing only entries for the given provider.
 */
export async function getCostsByProvider(provider: string): Promise<CostSummary> {
  const all = await getCosts();
  const filtered = all.entries.filter((e) => e.provider === provider.toLowerCase());

  const summary: CostSummary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byProvider: {},
    entries: filtered,
  };

  for (const entry of filtered) {
    summary.totalCost += entry.cost;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;
  }

  summary.totalCost = Number(summary.totalCost.toFixed(6));
  return summary;
}

/**
 * Resets all tracked costs by clearing the cost entries file.
 * @returns {Promise<void>}
 */
export async function resetCosts(): Promise<void> {
  await saveCosts([]);
}

/**
 * Estimates the number of tokens in a text string using a rough heuristic of 4 characters per token.
 * @param {string} text - The text to estimate tokens for.
 * @returns {number} The estimated token count (0 for empty input).
 */
// Helper: estimate tokens from text (roughly 4 chars per token)
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
