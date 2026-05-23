import React from "react";
import { cn } from "../../utils/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  size?: "sm" | "md";
  variant?: "default" | "ghost" | "accent";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = "sm", variant = "ghost", className, disabled, ...props }, ref) => {
    const sizeStyles = {
      sm: "p-1",
      md: "p-1.5",
    };

    const variantStyles = {
      default: "bg-neutral-800 text-dash-text-muted hover:bg-neutral-700",
      ghost: "hover:bg-neutral-800 text-dash-text-muted",
      accent: "bg-dash-accent/20 text-dash-accent hover:bg-dash-accent/30",
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        title={label}
        className={cn(
          "rounded transition-colors disabled:opacity-50",
          sizeStyles[size],
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
