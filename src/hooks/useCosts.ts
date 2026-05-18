import { useState, useCallback, useEffect } from "react";

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

export function useCosts() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/costs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CostSummary = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, 30000);
    return () => clearInterval(interval);
  }, [fetchCosts]);

  const resetCosts = useCallback(async () => {
    try {
      const res = await fetch("/api/costs/reset", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchCosts();
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [fetchCosts]);

  const getTodaysCost = useCallback(() => {
    if (!summary) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return summary.entries
      .filter((e) => e.timestamp.startsWith(today))
      .reduce((sum, e) => sum + e.cost, 0);
  }, [summary]);

  const getThisMonthCost = useCallback(() => {
    if (!summary) return 0;
    const thisMonth = new Date().toISOString().slice(0, 7);
    return summary.entries
      .filter((e) => e.timestamp.startsWith(thisMonth))
      .reduce((sum, e) => sum + e.cost, 0);
  }, [summary]);

  return {
    summary,
    loading,
    error,
    fetchCosts,
    resetCosts,
    getTodaysCost,
    getThisMonthCost,
  };
}
