import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs/promises";
import {
  trackCost,
  getCosts,
  getCostsByProvider,
  resetCosts,
  estimateTokens,
} from "../costTracker.js";

const TEST_DIR = path.join(process.cwd(), ".opencode-infinite");
const COSTS_FILE = path.join(TEST_DIR, "costs.json");

describe("costTracker", () => {
  beforeEach(async () => {
    try {
      await fs.mkdir(TEST_DIR, { recursive: true });
    } catch {}
  });

  afterEach(async () => {
    try {
      await fs.unlink(COSTS_FILE);
    } catch {}
  });

  describe("estimateTokens", () => {
    it("should return 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("should estimate roughly 4 chars per token", () => {
      expect(estimateTokens("abcd")).toBe(1);
      expect(estimateTokens("12345678")).toBe(2);
    });

    it("should round up for partial tokens", () => {
      expect(estimateTokens("abcde")).toBe(2); // 5 chars, ceil(1.25) = 2
    });
  });

  describe("trackCost", () => {
    it("should store a cost entry and return it", async () => {
      const entry = await trackCost("openai", "gpt-4o", 100, 200);

      expect(entry.provider).toBe("openai");
      expect(entry.model).toBe("gpt-4o");
      expect(entry.inputTokens).toBe(100);
      expect(entry.outputTokens).toBe(200);
      expect(entry.cost).toBeGreaterThan(0);
      expect(entry.timestamp).toBeDefined();
    });

    it("should calculate costs using OpenAI rates", async () => {
      const entry = await trackCost("openai", "gpt-4o", 1_000_000, 2_000_000);
      // input: 2.5 * 1 = 2.5, output: 10 * 2 = 20, total = 22.5
      expect(entry.cost).toBe(22.5);
    });

    it("should calculate costs using Gemini rates", async () => {
      const entry = await trackCost("gemini", "gemini-2.5-flash", 1_000_000, 1_000_000);
      // input: 0.075, output: 0.3, total = 0.375
      expect(entry.cost).toBe(0.375);
    });

    it("should calculate costs using Anthropic rates", async () => {
      const entry = await trackCost("anthropic", "claude-sonnet-4", 1_000_000, 1_000_000);
      // input: 3, output: 15, total = 18
      expect(entry.cost).toBe(18);
    });

    it("should calculate costs using DeepSeek rates", async () => {
      const entry = await trackCost("deepseek", "deepseek-chat", 1_000_000, 1_000_000);
      // input: 0.14, output: 0.28, total = 0.42
      expect(entry.cost).toBe(0.42);
    });

    it("should use generic rate for unknown providers", async () => {
      const entry = await trackCost("unknown", "unknown-model", 500_000, 500_000);
      // input: 1 * 0.5 = 0.5, output: 1 * 0.5 = 0.5, total = 1.0
      expect(entry.cost).toBe(1.0);
    });

    it("should use empty model for undefined model", async () => {
      const entry = await trackCost("openai", undefined as unknown as string, 100, 200);
      expect(entry.model).toBe("unknown");
    });

    it("should normalize provider to lowercase", async () => {
      const entry = await trackCost("OpenAI", "gpt-4o", 100, 200);
      expect(entry.provider).toBe("openai");
    });

    it("should accumulate multiple entries", async () => {
      await trackCost("openai", "gpt-4o", 100, 200);
      await trackCost("openai", "gpt-4o", 300, 400);

      const summary = await getCosts();
      expect(summary.entries).toHaveLength(2);
      expect(summary.byProvider["openai"].calls).toBe(2);
    });

    it("should calculate cost to 6 decimal places", async () => {
      const entry = await trackCost("deepseek", "deepseek-chat", 1234, 5678);
      const costStr = entry.cost.toString();
      const decimals = costStr.includes(".") ? costStr.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(6);
    });
  });

  describe("getCosts", () => {
    it("should return empty summary when no entries", async () => {
      const summary = await getCosts();
      expect(summary.totalCost).toBe(0);
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.entries).toEqual([]);
      expect(Object.keys(summary.byProvider)).toHaveLength(0);
    });

    it("should aggregate costs correctly", async () => {
      await trackCost("openai", "gpt-4o", 1000, 2000);
      await trackCost("gemini", "gemini-2.5-flash", 500, 1000);
      await trackCost("openai", "gpt-4o", 3000, 4000);

      const summary = await getCosts();

      expect(summary.entries).toHaveLength(3);
      expect(summary.totalInputTokens).toBe(4500);
      expect(summary.totalOutputTokens).toBe(7000);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.byProvider["openai"].calls).toBe(2);
      expect(summary.byProvider["openai"].inputTokens).toBe(4000);
      expect(summary.byProvider["gemini"].calls).toBe(1);
    });

    it("should round totalCost to 6 decimals", async () => {
      await trackCost("deepseek", "deepseek-chat", 123, 456);
      const summary = await getCosts();
      const costStr = summary.totalCost.toString();
      const decimals = costStr.includes(".") ? costStr.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(6);
    });
  });

  describe("getCostsByProvider", () => {
    it("should filter entries by provider", async () => {
      await trackCost("openai", "gpt-4o", 100, 200);
      await trackCost("gemini", "gemini-2.5-flash", 300, 400);
      await trackCost("openai", "gpt-4o-mini", 500, 600);

      const openaiSummary = await getCostsByProvider("openai");
      expect(openaiSummary.entries).toHaveLength(2);
      expect(openaiSummary.totalInputTokens).toBe(600);

      const geminiSummary = await getCostsByProvider("gemini");
      expect(geminiSummary.entries).toHaveLength(1);
      expect(geminiSummary.totalOutputTokens).toBe(400);
    });

    it("should return empty summary for unknown provider", async () => {
      await trackCost("openai", "gpt-4o", 100, 200);
      const summary = await getCostsByProvider("unknown");
      expect(summary.entries).toHaveLength(0);
      expect(summary.totalCost).toBe(0);
    });

    it("should be case-insensitive for provider filter", async () => {
      await trackCost("openai", "gpt-4o", 100, 200);
      const summary = await getCostsByProvider("OpenAI");
      expect(summary.entries).toHaveLength(1);
    });
  });

  describe("resetCosts", () => {
    it("should clear all entries", async () => {
      await trackCost("openai", "gpt-4o", 100, 200);
      await trackCost("gemini", "gemini-2.5-flash", 300, 400);

      let summary = await getCosts();
      expect(summary.entries).toHaveLength(2);

      await resetCosts();

      summary = await getCosts();
      expect(summary.entries).toHaveLength(0);
      expect(summary.totalCost).toBe(0);
    });
  });

  describe("rate cards", () => {
    it("should have all expected providers", async () => {
      for (const provider of ["openai", "gemini", "anthropic", "deepseek"]) {
        const entry = await trackCost(provider, "test", 1_000_000, 1_000_000);
        expect(entry.cost).toBeGreaterThan(0);
        expect(entry.provider).toBe(provider);
      }
    });

    it("Gemini should be cheapest in the known set", async () => {
      const gemini = await trackCost("gemini", "test", 1_000_000, 1_000_000);
      const anthropic = await trackCost("anthropic", "test", 1_000_000, 1_000_000);
      expect(gemini.cost).toBeLessThan(anthropic.cost);
    });
  });

  describe("zero tokens", () => {
    it("should handle zero input and output tokens", async () => {
      const entry = await trackCost("openai", "gpt-4o", 0, 0);
      expect(entry.cost).toBe(0);
      expect(entry.inputTokens).toBe(0);
      expect(entry.outputTokens).toBe(0);
    });
  });
});
