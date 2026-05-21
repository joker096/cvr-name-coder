import React from "react";
import { cn } from "../../utils/cn";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  className,
}) => (
  <div className={cn("flex items-center justify-between", className)}>
    <div>
      <div className="text-xs font-medium text-dash-text-primary">{label}</div>
      {description && (
        <div className="text-[9px] text-dash-text-muted">{description}</div>
      )}
    </div>
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-dash-accent" : "bg-neutral-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  </div>
);
