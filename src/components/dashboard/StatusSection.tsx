import React from "react";
import { Activity } from "lucide-react";
import { StatCard } from "./StatCard";

interface StatusSectionProps {
  serverRunning: boolean;
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  serverRunning, skillsCount, toolsCount, memoryCount,
}) => (
  <div className="p-3">
    <div className="flex items-center gap-2 mb-3">
      <Activity className="w-4 h-4 text-dash-accent" />
      <span className="text-[11px] font-mono uppercase tracking-wider text-dash-text-label">
        System Status
      </span>
      <span className={serverRunning
        ? "text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase"
        : "text-[9px] font-mono text-dash-error bg-dash-error/10 px-1.5 py-0.5 rounded uppercase"
      }>
        {serverRunning ? "Online" : "Offline"}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <StatCard label="Skills" value={skillsCount} />
      <StatCard label="Tools" value={toolsCount} />
      <StatCard label="Memory" value={`${memoryCount} items`} />
    </div>
  </div>
);
