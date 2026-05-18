import React from "react";
import { cn } from "../../utils/cn";
import type { ChatProviderId } from "../../types/settings";

export interface ModelConfig {
  aiModel?: string;
  apiKey?: string;
  baseUrl?: string;
  localUrl?: string;
  localModelName?: string;
  customKey?: string;
  customUrl?: string;
}

interface ModelConfigProps {
  provider: ChatProviderId;
  config: ModelConfig;
  onChange: (config: Partial<ModelConfig>) => void;
  t: any;
  className?: string;
}

export const ModelConfig: React.FC<ModelConfigProps> = ({
  provider,
  config,
  onChange,
  t,
  className,
}) => {
  const requiresApiKey =
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "deepseek" ||
    provider === "grok" ||
    provider === "groq" ||
    provider === "gemini";

  const requiresLocalUrl = provider === "local";

  const requiresCustomConfig = provider === "custom";

  return (
    <div className={cn("space-y-4", className)}>
      {requiresApiKey && (
        <div>
          <label className="block text-sm font-medium text-dash-text-primary mb-2">
            {t.apiKey || "API Key"}
          </label>
          <input
            type="password"
            value={config.apiKey || ""}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
            placeholder={t.enterApiKey || "Enter your API key"}
          />
        </div>
      )}

      {requiresLocalUrl && (
        <>
          <div>
            <label className="block text-sm font-medium text-dash-text-primary mb-2">
              {t.localUrl || "Local URL"}
            </label>
            <input
              type="text"
              value={config.localUrl || ""}
              onChange={(e) => onChange({ localUrl: e.target.value })}
              className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dash-text-primary mb-2">
              {t.modelName || "Model Name"}
            </label>
            <input
              type="text"
              value={config.localModelName || ""}
              onChange={(e) => onChange({ localModelName: e.target.value })}
              className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
              placeholder="llama3"
            />
          </div>
        </>
      )}

      {requiresCustomConfig && (
        <>
          <div>
            <label className="block text-sm font-medium text-dash-text-primary mb-2">
              {t.customUrl || "Custom URL"}
            </label>
            <input
              type="text"
              value={config.customUrl || ""}
              onChange={(e) => onChange({ customUrl: e.target.value })}
              className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
              placeholder="https://api.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dash-text-primary mb-2">
              {t.customKey || "Custom Key"}
            </label>
            <input
              type="password"
              value={config.customKey || ""}
              onChange={(e) => onChange({ customKey: e.target.value })}
              className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
              placeholder={t.enterCustomKey || "Enter your custom key"}
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-dash-text-primary mb-2">
          {t.modelName || "Model Name"}
        </label>
        <input
          type="text"
          value={config.aiModel || ""}
          onChange={(e) => onChange({ aiModel: e.target.value })}
          className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent"
          placeholder={t.enterModelName || "Enter model name"}
        />
      </div>
    </div>
  );
};
