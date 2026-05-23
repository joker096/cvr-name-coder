import React from "react";
import { cn } from "../../utils/cn";

interface PanelHeaderProps {
  icon?: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ icon, title, actions, className }) => (
  <div className={cn("flex items-center justify-between", className)}>
    <div className="text-[13px] uppercase tracking-widest text-dash-text-label font-extrabold flex items-center gap-2">
      {icon}
      {title}
    </div>
    {actions && <div className="flex items-center gap-1">{actions}</div>}
  </div>
);
