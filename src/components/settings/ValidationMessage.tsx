import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "../../utils/cn";

export type ValidationMessageType = "error" | "warning" | "success" | "info";

// Discriminated union for validation message styles
type ValidationStyleError = {
  type: "error";
  container: string;
  icon: typeof AlertCircle;
};

type ValidationStyleWarning = {
  type: "warning";
  container: string;
  icon: typeof AlertTriangle;
};

type ValidationStyleSuccess = {
  type: "success";
  container: string;
  icon: typeof CheckCircle;
};

type ValidationStyleInfo = {
  type: "info";
  container: string;
  icon: typeof AlertCircle;
};

type ValidationStyle = ValidationStyleError | ValidationStyleWarning | ValidationStyleSuccess | ValidationStyleInfo;

interface ValidationMessageProps {
  type: ValidationMessageType;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const validationStyles: Record<ValidationMessageType, ValidationStyle> = {
  error: {
    type: "error",
    container: "bg-dash-error/10 border-dash-error/30 text-dash-error",
    icon: AlertCircle,
  },
  warning: {
    type: "warning",
    container: "bg-dash-warning/10 border-dash-warning/30 text-dash-warning",
    icon: AlertTriangle,
  },
  success: {
    type: "success",
    container: "bg-dash-success/10 border-dash-success/30 text-dash-success",
    icon: CheckCircle,
  },
  info: {
    type: "info",
    container: "bg-dash-accent/10 border-dash-accent/30 text-dash-accent",
    icon: AlertCircle,
  },
};

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  onDismiss,
  className,
}) => {
  const style = validationStyles[type];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 border rounded-lg",
        style.container,
        className
      )}
      role="alert"
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm">
        {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 hover:bg-black/10 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
