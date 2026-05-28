import { memo } from "react";
import { cn } from "../../utils/cn";

interface SidebarStatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export const SidebarStatCard = memo<SidebarStatCardProps>(({ label, value, className }) => (
  <div className={cn("bg-[#161618] border border-[#222] rounded-lg p-2", className)}>
    <div className="text-[9px] font-mono text-[#666] tracking-[1px] mb-0.5 uppercase">{label}</div>
    <div className="text-sm font-bold font-mono text-[#e0e0e0]">{value}</div>
  </div>
));
