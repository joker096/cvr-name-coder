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

const ICON_COLORS: Record<string, string> = {
  sparkles: "text-blue-400 bg-blue-400/10",
  bot: "text-emerald-400 bg-emerald-400/10",
  brain: "text-amber-400 bg-amber-400/10",
  search: "text-cyan-400 bg-cyan-400/10",
  zap: "text-yellow-400 bg-yellow-400/10",
  cpu: "text-orange-400 bg-orange-400/10",
  box: "text-purple-400 bg-purple-400/10",
  router: "text-pink-400 bg-pink-400/10",
  users: "text-indigo-400 bg-indigo-400/10",
  wind: "text-teal-400 bg-teal-400/10",
  server: "text-slate-400 bg-slate-400/10",
  settings: "text-stone-400 bg-stone-400/10",
};

function ProviderIcon({ icon, size = "md" }: { icon: IconType; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (icon.type === "lucide") {
    const Comp = ICON_MAP[icon.name];
    if (Comp) {
      const colorClass = ICON_COLORS[icon.name] || "text-dash-text-muted bg-dash-text-muted/10";
      return (
        <div className={cn("rounded-md p-1", colorClass)}>
          <Comp className={sizeClass} />
        </div>
      );
    }
  }
  if (icon.type === "custom") {
    const Comp = icon.component;
    return (
      <div className="rounded-md p-1 bg-dash-text-muted/10">
        <Comp className={sizeClass} />
      </div>
    );
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
            "card-interactive p-2.5 flex flex-col items-center gap-2 text-[11px] font-mono transition-all",
            selectedProvider === provider.id
              ? "border-dash-accent bg-dash-accent/10 text-dash-accent ring-1 ring-dash-accent"
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
