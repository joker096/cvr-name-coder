import React from "react";
import { cn } from "../../utils/cn";
import type { IconType } from "../../types/ai";
import type { ChatProviderId } from "../../types/settings";

// Provider interface with proper types
export interface Provider {
  id: ChatProviderId;
  icon: IconType;
  label: string;
  type: 'cloud' | 'local';
}

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProvider: ChatProviderId;
  onSelectProvider: (providerId: ChatProviderId) => void;
  className?: string;
}

// Type guard for provider selection
export const isValidProviderId = (id: string): id is ChatProviderId => {
  return typeof id === 'string' && id.length > 0;
};

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProvider,
  onSelectProvider,
  className,
}) => {
  const handleProviderSelect = (providerId: string) => {
    if (isValidProviderId(providerId)) {
      onSelectProvider(providerId);
    }
  };

  return (
    <div className={cn("grid grid-cols-4 md:grid-cols-6 gap-2", className)}>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => handleProviderSelect(provider.id)}
          className={cn(
            "p-2 rounded border text-[11px] font-mono transition-all flex items-center justify-center",
            selectedProvider === provider.id
              ? "bg-dash-accent/10 border-dash-accent text-dash-accent"
              : "border-dash-border text-dash-text-muted hover:bg-neutral-800/50"
          )}
          aria-pressed={selectedProvider === provider.id}
          aria-label={`Select ${provider.label} provider`}
        >
          <span className="truncate w-full text-center">{provider.label}</span>
        </button>
      ))}
    </div>
  );
};
