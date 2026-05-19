import React from "react";
import { cn } from "../../utils/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, variant = "default", className }) => (
  <div className={cn("card p-3 flex flex-col gap-0.5", className)}>
    <span className="text-[10px] font-mono uppercase tracking-wider text-dash-text-label">
      {label}
    </span>
    <span className={cn(
      "text-[13px] font-bold font-mono",
      variant === "success" && "text-dash-success",
      variant === "warning" && "text-dash-warning",
      variant === "default" && "text-dash-text-primary",
    )}>
      {value}
    </span>
  </div>
);
