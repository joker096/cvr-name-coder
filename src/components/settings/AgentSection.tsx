import React from "react";
import type { ChatConfig, AgentId } from "../../types/settings";
import { Cpu, Compass, Search, Brain, Zap, Shield } from "lucide-react";
import { cn } from "../../utils/cn";

interface AgentSectionProps {
  currentConfig: ChatConfig;
  onAgentChange: (agent: AgentId) => void;
  t: Record<string, string>;
}

const AGENT_OPTIONS: { id: AgentId; label: string; icon: React.ComponentType<{ className?: string }>; desc: string; dotColor: string }[] = [
  { id: "build", label: "BUILD", icon: Cpu, desc: "Default developer — writes/edits files, runs commands, iterates on code", dotColor: "bg-dash-accent" },
  { id: "general", label: "GENERAL", icon: Brain, desc: "Universal assistant — complex multi-stage tasks, parallel workflows", dotColor: "bg-blue-400" },
  { id: "explore", label: "EXPLORE", icon: Search, desc: "Read-only codebase explorer — find patterns, explain structure", dotColor: "bg-green-400" },
  { id: "scout", label: "SCOUT", icon: Compass, desc: "Read-only analyst — research docs, audit deps, architecture review", dotColor: "bg-yellow-400" },
  { id: "prometheus", label: "PROMETHEUS", icon: Zap, desc: "Strategic planner — clarify requirements, define architecture FIRST", dotColor: "bg-purple-400" },
  { id: "hephaestus", label: "HEPHAESTUS", icon: Shield, desc: "Deep executor — autonomous: researches, codes, finishes without guidance", dotColor: "bg-red-400" },
];

export const AgentSection: React.FC<AgentSectionProps> = ({
  currentConfig,
  onAgentChange,
  t,
}) => {
  const currentAgent = AGENT_OPTIONS.find((a) => a.id === (currentConfig.agent || "build")) || AGENT_OPTIONS[0]!;

  return (
    <div className="space-y-2 pt-2.5 border-t border-dash-border">
      <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest">
        {t.agentSettings || "Agent Settings"}
      </h3>
      <div>
        <label className="block text-xs font-medium text-dash-text-primary mb-2">
          {t.activeAgent || "Active Agent"}
        </label>
        <select
          value={currentConfig.agent || "build"}
          onChange={(e) => onAgentChange(e.target.value as AgentId)}
          className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
        >
          {AGENT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc.split(" — ")[0]}</option>
          ))}
        </select>
        <div className="flex items-start gap-1.5 mt-1.5 px-0.5 text-[11px] text-dash-text-muted">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1", currentAgent.dotColor)} />
          <span>{currentAgent.desc}</span>
        </div>
      </div>
    </div>
  );
};
