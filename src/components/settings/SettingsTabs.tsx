import React from "react";
import { cn } from "../../utils/cn";

export type SettingsTab = "chat" | "kernel" | "mcp";

export interface SettingsTabConfig {
  id: SettingsTab;
  label: string;
}

interface SettingsTabsProps {
  tabs: SettingsTabConfig[];
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  className?: string;
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn("flex gap-2", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 py-1.5 text-[11px] uppercase font-bold tracking-widest rounded transition-all",
            activeTab === tab.id
              ? "bg-dash-accent text-white shadow-lg"
              : "text-dash-text-muted hover:text-white hover:bg-neutral-800/50"
          )}
          aria-pressed={activeTab === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
