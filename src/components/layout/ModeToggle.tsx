import React from "react";
import { Lightbulb, Hammer, Eye } from "lucide-react";
import { cn } from "../../utils/cn";

type AppMode = "build" | "plan" | "review";

interface ModeToggleProps {
  mode: AppMode;
  onToggle: () => void;
  t: Record<string, string>;
}

const MODE_CONFIG: Record<AppMode, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  build: { icon: Hammer, label: "BUILD", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  plan: { icon: Lightbulb, label: "PLAN", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  review: { icon: Eye, label: "REVIEW", color: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
};

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle, t }) => {
  const config = MODE_CONFIG[mode];
  return (
    <button
      onClick={onToggle}
      className={cn(
        "hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border",
        config.color
      )}
      title={t[`${mode}Mode`] || mode}
    >
      <config.icon className="w-3 h-3" /> {config.label}
    </button>
  );
};
