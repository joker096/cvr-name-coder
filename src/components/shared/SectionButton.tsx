import React from "react";
import { cn } from "../../utils/cn";

interface SectionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
}

export const SectionButton = React.forwardRef<HTMLButtonElement, SectionButtonProps>(
  ({ isActive, children, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex-1 py-1 text-[10px] uppercase font-bold tracking-wider transition-all rounded",
        isActive
          ? "bg-dash-accent/10 text-dash-accent"
          : "text-dash-text-muted hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

SectionButton.displayName = "SectionButton";
