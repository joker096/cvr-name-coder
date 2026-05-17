import React from "react";
import { cn } from "../../utils/cn";

export interface Provider {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  className?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProvider,
  onSelectProvider,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onSelectProvider(provider.id)}
          className={cn(
            "p-3 rounded border text-[14px] font-mono transition-all flex flex-col items-center gap-2",
            selectedProvider === provider.id
              ? "bg-dash-accent/10 border-dash-accent text-dash-accent"
              : "border-dash-border text-dash-text-muted hover:bg-neutral-800/50"
          )}
          aria-pressed={selectedProvider === provider.id}
        >
          <provider.icon className="w-6 h-6" aria-hidden="true" />
          <span className="truncate w-full text-center">{provider.label}</span>
        </button>
      ))}
    </div>
  );
};
