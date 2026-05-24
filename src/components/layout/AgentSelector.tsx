import React, { useState, useRef, useEffect } from "react";
import type { AgentId } from "../../types/settings";
import { Cpu, Compass, Search, Brain, Zap, Shield, ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

const AGENT_CONFIG: Record<AgentId, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; dotColor: string; desc: string }> = {
  build: { label: "BUILD", icon: Cpu, color: "text-dash-accent", dotColor: "bg-dash-accent", desc: "Default developer — writes/edits files, runs commands, iterates on code" },
  general: { label: "GENERAL", icon: Brain, color: "text-blue-400", dotColor: "bg-blue-400", desc: "Universal assistant — complex multi-stage tasks, parallel workflows" },
  explore: { label: "EXPLORE", icon: Search, color: "text-green-400", dotColor: "bg-green-400", desc: "Read-only codebase explorer — find patterns, explain structure" },
  scout: { label: "SCOUT", icon: Compass, color: "text-yellow-400", dotColor: "bg-yellow-400", desc: "Read-only analyst — research docs, audit deps, architecture review" },
  prometheus: { label: "PROMETHEUS", icon: Zap, color: "text-purple-400", dotColor: "bg-purple-400", desc: "Strategic planner — clarify requirements, define architecture FIRST" },
  hephaestus: { label: "HEPHAESTUS", icon: Shield, color: "text-red-400", dotColor: "bg-red-400", desc: "Deep executor — autonomous: researches, codes, finishes without guidance" },
};

interface AgentSelectorProps {
  activeAgent: AgentId;
  onChange: (agent: AgentId) => void;
  title: string;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ activeAgent, onChange, title }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = AGENT_CONFIG[activeAgent];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-1 relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 bg-transparent text-[11px] font-mono uppercase tracking-wider cursor-pointer hover:text-dash-accent transition-colors text-dash-text-muted py-0.5"
        title={title}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)} />
        <span>{config.label}</span>
        <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-dash-elevated border border-dash-border rounded-md shadow-xl z-50 min-w-[170px] py-1">
          {(Object.keys(AGENT_CONFIG) as AgentId[]).map((id) => {
            const cfg = AGENT_CONFIG[id];
            return (
              <button
                key={id}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  id === activeAgent
                    ? "bg-dash-accent/10 text-dash-accent"
                    : "text-dash-text-muted hover:bg-neutral-800/50 hover:text-dash-text-primary"
                )}
                title={cfg.desc}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotColor)} />
                <span>{cfg.label}</span>
                <span className="ml-auto text-[9px] normal-case tracking-normal text-dash-text-label max-w-[100px] truncate hidden lg:inline">
                  {cfg.desc.split(" — ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
