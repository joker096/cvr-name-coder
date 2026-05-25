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
    <div className="grid grid-cols-2 gap-3 px-4 pt-4 pb-3">
      <SidebarStatCard label={t.skillsLabel || "Skills"} value={skillsCount} />
      <SidebarStatCard label={t.toolsLabel || "Tools"} value={toolsCount} />
      <SidebarStatCard label={t.memoryLabel || "Memory"} value={`${memoryCount} ${t.items || "items"}`} />
      <SidebarStatCard label={t.agentsLabel || "Agents"} value={agentsCount} />
    </div>
  );
};