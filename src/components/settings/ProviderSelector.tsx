import React from "react";
import { cn } from "../../utils/cn";
import { ExternalLink } from "lucide-react";
import type { IconType } from "../../types/ai";
import type { ChatProviderId } from "../../types/settings";
import { BrandIcon } from "./BrandIcons";

export interface Provider {
  id: ChatProviderId;
  icon: IconType;
  label: string;
  type: 'cloud' | 'local';
}

const API_KEY_URLS: Partial<Record<ChatProviderId, string>> = {
  gemini: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/",
  deepseek: "https://platform.deepseek.com/api_keys",
  grok: "https://console.x.ai/",
  groq: "https://console.groq.com/keys",
  baseten: "https://www.baseten.co/settings/api-keys",
  openrouter: "https://openrouter.ai/keys",
  together: "https://api.together.xyz/settings/api-keys",
  mistral: "https://console.mistral.ai/api-keys",
};

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProvider: ChatProviderId;
  onSelectProvider: (providerId: ChatProviderId) => void;
  className?: string;
}

export const isValidProviderId = (id: string): id is ChatProviderId => {
  return typeof id === 'string' && id.length > 0;
};

function ProviderIcon({ providerId, size = "md" }: { providerId: ChatProviderId; size?: "sm" | "md" }) {
  const px = size === "sm" ? 14 : 18;

  return (
    <div
      className="rounded-md p-1 flex items-center justify-center"
      style={{ color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.08)" }}
    >
      <BrandIcon provider={providerId} size={px} />
    </div>
  );
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
            "card-interactive p-2.5 flex flex-col items-center gap-1.5 text-[10px] font-mono transition-all relative group",
            selectedProvider === provider.id
              ? "border-dash-accent bg-dash-accent/10 text-dash-accent ring-1 ring-dash-accent"
              : "text-dash-text-muted"
          )}
          aria-pressed={selectedProvider === provider.id}
          aria-label={`Select ${provider.label} provider`}
        >
          <ProviderIcon providerId={provider.id} />
          <span className="truncate w-full text-center leading-tight">{provider.label}</span>
          {API_KEY_URLS[provider.id] && (
            <a
              href={API_KEY_URLS[provider.id]}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[8px] text-dash-text-muted hover:text-dash-accent flex items-center gap-0.5"
              title="Get API key"
            >
              <ExternalLink className="w-2 h-2" />
              key
            </a>
          )}
        </button>
      ))}
    </div>
  );
};
