import React from "react";
import type { ChatConfig, AgentId } from "../../types/settings";
import { Cpu, Compass, Search, Brain, Zap, Shield } from "lucide-react";

interface AgentSectionProps {
  currentConfig: ChatConfig;
  onAgentChange: (agent: AgentId) => void;
  t: Record<string, string>;
}

const AGENT_OPTIONS: { id: AgentId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "build", label: "BUILD", icon: Cpu },
  { id: "general", label: "GENERAL", icon: Brain },
  { id: "explore", label: "EXPLORE", icon: Search },
  { id: "scout", label: "SCOUT", icon: Compass },
  { id: "prometheus", label: "PROMETHEUS", icon: Zap },
  { id: "hephaestus", label: "HEPHAESTUS", icon: Shield },
];

export const AgentSection: React.FC<AgentSectionProps> = ({
  currentConfig,
  onAgentChange,
  t,
}) => (
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
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </div>
  </div>
);
