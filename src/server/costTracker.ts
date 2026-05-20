import * as path from "path";
import { readFile, writeFile, access } from "fs/promises";

export interface CostEntry {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<
    string,
    {
      cost: number;
      inputTokens: number;
      outputTokens: number;
      calls: number;
    }
  >;
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

export async function resetCosts(): Promise<void> {
  await saveCosts([]);
}

// Helper: estimate tokens from text (roughly 4 chars per token)
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
