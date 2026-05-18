import React, { useState } from "react";
import { DollarSign, Trash2, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { useCosts } from "../../hooks/useCosts";
import { cn } from "../../utils/cn";

interface CostPanelProps {
  t: any;
  className?: string;
}

export const CostPanel: React.FC<CostPanelProps> = ({ t, className }) => {
  const { summary, loading, error, resetCosts, getTodaysCost, getThisMonthCost } = useCosts();
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem("cvr_cost_budget");
    return saved ? parseFloat(saved) : 10;
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleBudgetChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setBudget(num);
      localStorage.setItem("cvr_cost_budget", String(num));
    }
  };

  const handleReset = async () => {
    await resetCosts();
    setShowResetConfirm(false);
  };

  const totalCost = summary?.totalCost || 0;
  const todaysCost = getTodaysCost();
  const monthCost = getThisMonthCost();
  const isOverBudget = budget > 0 && totalCost >= budget;
  const isNearBudget = budget > 0 && totalCost >= budget * 0.8 && !isOverBudget;

  const providers = summary ? Object.entries(summary.byProvider) : [];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.costTracking || "Cost Tracking"}
        <DollarSign className="w-4 h-4" aria-hidden="true" />
      </div>

      {/* Budget Setting */}
      <div className="p-2 bg-neutral-900 border border-dash-border rounded space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-dash-text-muted tracking-wider">
            {t.budget || "Budget"}
          </span>
          {(isNearBudget || isOverBudget) && (
            <AlertTriangle
              className={cn(
                "w-3.5 h-3.5",
                isOverBudget ? "text-red-400" : "text-amber-400"
              )}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-dash-text-muted">$</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={budget}
            onChange={(e) => handleBudgetChange(e.target.value)}
            className="flex-1 bg-neutral-800 border border-dash-border rounded px-2 py-1 text-[11px] text-dash-text-primary focus:outline-none focus:border-dash-accent"
          />
        </div>
        {isOverBudget && (
          <div className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
            {t.budgetExceeded || "Budget exceeded!"}
          </div>
        )}
        {isNearBudget && (
          <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
            {t.nearBudget || "Near budget limit"}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-neutral-900 border border-dash-border rounded">
          <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-dash-text-muted tracking-wider">
            <Calendar className="w-3 h-3" />
            {t.today || "Today"}
          </div>
          <div className="text-[14px] font-mono font-bold text-dash-accent mt-1">
            ${todaysCost.toFixed(4)}
          </div>
        </div>
        <div className="p-2 bg-neutral-900 border border-dash-border rounded">
          <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-dash-text-muted tracking-wider">
            <TrendingUp className="w-3 h-3" />
            {t.thisMonth || "This Month"}
          </div>
          <div className="text-[14px] font-mono font-bold text-dash-accent mt-1">
            ${monthCost.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="p-3 bg-dash-accent/10 border border-dash-accent/20 rounded">
        <div className="text-[9px] uppercase font-bold text-dash-accent/70 tracking-wider">
          {t.totalCost || "Total Cost"}
        </div>
        <div className="text-[18px] font-mono font-bold text-dash-accent mt-1">
          ${totalCost.toFixed(4)}
        </div>
        <div className="text-[9px] text-dash-text-muted mt-1">
          {summary?.totalInputTokens.toLocaleString() || 0} {t.inputTokens || "input"} /{" "}
          {summary?.totalOutputTokens.toLocaleString() || 0} {t.outputTokens || "output"}
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase font-bold text-dash-text-muted tracking-wider">
          {t.byProvider || "By Provider"}
        </div>
        {loading ? (
          <div className="text-[10px] text-dash-text-muted italic text-center py-2">
            {t.loading || "Loading..."}
          </div>
        ) : error ? (
          <div className="text-[10px] text-red-400 italic text-center py-2">
            {t.error || "Error"}: {error}
          </div>
        ) : providers.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noCosts || "No costs tracked yet"}
          </div>
        ) : (
          providers.map(([provider, data]) => (
            <div
              key={provider}
              className="p-2 bg-neutral-900 border border-dash-border rounded"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-dash-text-primary uppercase">
                  {provider}
                </span>
                <span className="text-[11px] font-mono text-dash-accent">
                  ${data.cost.toFixed(4)}
                </span>
              </div>
              <div className="text-[9px] text-dash-text-muted mt-0.5">
                {data.calls} {t.calls || "calls"} · {data.inputTokens.toLocaleString()} {t.inputTokens || "in"} / {data.outputTokens.toLocaleString()} {t.outputTokens || "out"}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!showResetConfirm ? (
          <>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {t.reset || "Reset"}
            </button>
          </>
        ) : (
          <div className="flex gap-2 flex-1">
            <button
              onClick={handleReset}
              className="flex-1 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded hover:bg-red-500/30 transition-colors"
            >
              {t.confirm || "Confirm"}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 py-1 bg-neutral-800 text-dash-text-muted text-[10px] font-bold uppercase rounded hover:bg-neutral-700 transition-colors"
            >
              {t.cancel || "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
