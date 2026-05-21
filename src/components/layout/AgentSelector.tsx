import React from "react";
import type { AgentId } from "../../types/settings";
import { Cpu, Compass, Search, Brain, Zap, Shield } from "lucide-react";
import { cn } from "../../utils/cn";

const AGENT_CONFIG: Record<AgentId, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  build: { label: "BUILD", icon: Cpu, color: "text-dash-accent" },
  general: { label: "GENERAL", icon: Brain, color: "text-blue-400" },
  explore: { label: "EXPLORE", icon: Search, color: "text-green-400" },
  scout: { label: "SCOUT", icon: Compass, color: "text-yellow-400" },
  prometheus: { label: "PROMETHEUS", icon: Zap, color: "text-purple-400" },
  hephaestus: { label: "HEPHAESTUS", icon: Shield, color: "text-red-400" },
};

interface AgentSelectorProps {
  activeAgent: AgentId;
  onChange: (agent: AgentId) => void;
  title: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ activeAgent, onChange, title }) => {
  const config = AGENT_CONFIG[activeAgent];
  return (
    <div className="hidden md:flex items-center gap-1">
      <select
        value={activeAgent}
        onChange={(e) => onChange(e.target.value as AgentId)}
        className="bg-transparent text-[11px] font-mono uppercase tracking-wider border-none focus:ring-0 cursor-pointer hover:text-dash-accent transition-colors text-dash-text-muted"
        title={title}
      >
        {(Object.keys(AGENT_CONFIG) as AgentId[]).map((id) => (
          <option key={id} value={id} className="bg-dash-bg text-dash-text-primary">
            {AGENT_CONFIG[id].label}
          </option>
        ))}
      </select>
      {config && <config.icon className={cn("w-3 h-3", config.color)} />}
    </div>
  );
};
