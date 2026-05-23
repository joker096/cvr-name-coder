import React from "react";
import { cn } from "../../utils/cn";

interface SidebarStatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export const SidebarStatCard: React.FC<SidebarStatCardProps> = ({ label, value, className }) => (
  <div className={cn("bg-[#161618] border border-[#222] rounded-lg p-3.5", className)}>
    <div className="text-[10px] font-mono text-[#666] tracking-[1.5px] mb-2 uppercase">{label}</div>
    <div className="text-2xl font-bold font-mono text-[#e0e0e0]">{value}</div>
  </div>
);
