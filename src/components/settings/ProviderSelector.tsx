import React from "react";
import { Sparkles, Bot, Brain, Search, Zap, Cpu, Box, Router, Users, Wind, Server, Settings } from "lucide-react";
import { cn } from "../../utils/cn";
import type { IconType } from "../../types/ai";
import type { ChatProviderId } from "../../types/settings";

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

export const isValidProviderId = (id: string): id is ChatProviderId => {
  return typeof id === 'string' && id.length > 0;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  bot: Bot,
  brain: Brain,
  search: Search,
  zap: Zap,
  cpu: Cpu,
  box: Box,
  router: Router,
  users: Users,
  wind: Wind,
  server: Server,
  settings: Settings,
};

function ProviderIcon({ icon }: { icon: IconType }) {
  if (icon.type === "lucide") {
    const Comp = ICON_MAP[icon.name];
    if (Comp) return <Comp className="w-4 h-4 shrink-0" />;
  }
  if (icon.type === "custom") {
    const Comp = icon.component;
    return <Comp className="w-4 h-4 shrink-0" />;
  }
  return null;
}

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
            "card-interactive p-2 flex flex-col items-center gap-1 text-[11px] font-mono transition-all",
            selectedProvider === provider.id
              ? "border-dash-accent bg-dash-accent-soft/20 text-dash-accent ring-1 ring-dash-accent"
              : "text-dash-text-muted"
          )}
          aria-pressed={selectedProvider === provider.id}
          aria-label={`Select ${provider.label} provider`}
        >
          <ProviderIcon icon={provider.icon} />
          <span className="truncate w-full text-center leading-tight">{provider.label}</span>
        </button>
      ))}
    </div>
  );
};
