import React from "react";
import { SidebarStatCard } from "./SidebarStatCard";

interface StatsGridProps {
  skillsCount: number;
  toolsCount: number;
  memoryCount: number;
  agentsCount: number;
  t: any;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  skillsCount,
  toolsCount,
  memoryCount,
  agentsCount,
  t,
}) => {
  return (
    <div className="grid grid-cols-2 gap-1.5 px-3 pt-2 pb-1.5">
      <SidebarStatCard label={t.skillsLabel || "Skills"} value={skillsCount} />
      <SidebarStatCard label={t.toolsLabel || "Tools"} value={toolsCount} />
      <SidebarStatCard label={t.memoryLabel || "Memory"} value={memoryCount} />
      <SidebarStatCard label={t.agentsLabel || "Agents"} value={agentsCount} />
    </div>
  );
};