import React, { useState, useEffect } from "react";
import { Scale, Eye } from "lucide-react";
import { cn } from "../../utils/cn";

export interface Rule {
  name: string;
  priority: number;
  content?: string;
}

interface RulesPanelProps {
  t: any;
  className?: string;
}

export const RulesPanel: React.FC<RulesPanelProps> = ({ t, className }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      console.error("Failed to fetch rules:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleViewRule = async (name: string) => {
    try {
      const res = await fetch(`/api/rules/${name}`);
      const data = await res.json();
      if (data.name) setSelectedRule(data as Rule);
    } catch (e) {
      console.error("Failed to load rule:", e);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center justify-between">
        {t.rules || "Rules"}
        <Scale className="w-4 h-4" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-[10px] text-dash-text-muted italic">{t.loading || "Loading..."}</div>
        ) : rules.length === 0 ? (
          <div className="p-2 text-[10px] text-dash-text-muted italic border border-dashed border-dash-border rounded text-center">
            {t.noRules || "No rules configured"}
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.name}
              className="p-2 bg-neutral-900 border border-dash-border rounded flex items-center justify-between group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-dash-text-primary">{rule.name}</div>
                <div className="text-[9px] text-dash-text-muted">
                  {t.priority || "Priority"}: {rule.priority}
                </div>
              </div>
              <button
                onClick={() => handleViewRule(rule.name)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 text-dash-accent rounded transition-all"
                title={t.view || "View"}
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Rule Detail */}
      {selectedRule && selectedRule.content && (
        <div className="p-2 bg-neutral-900 border border-dash-border rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-dash-accent">{selectedRule.name}</div>
            <button
              onClick={() => setSelectedRule(null)}
              className="text-[9px] text-dash-text-muted hover:text-dash-text-primary"
            >
              {t.close || "Close"}
            </button>
          </div>
          <pre className="text-[10px] font-mono text-dash-text-primary whitespace-pre-wrap max-h-48 overflow-y-auto">
            {selectedRule.content}
          </pre>
        </div>
      )}
    </div>
  );
};
