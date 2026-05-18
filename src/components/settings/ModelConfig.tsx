import React, { useState } from "react";
import { cn } from "../../utils/cn";
import type { ChatProviderId } from "../../types/settings";
import type { AIModel } from "../../types/ai";

export interface ModelConfig {
  aiModel?: string;
  baseUrl?: string;
  localUrl?: string;
  localModelName?: string;
  customUrl?: string;
}

interface ModelConfigProps {
  provider: ChatProviderId;
  config: ModelConfig;
  models: AIModel[];
  engineType?: "chat" | "kernel";
  onChange: (config: Partial<ModelConfig>) => void;
  t: any;
  className?: string;
}

export const ModelConfig: React.FC<ModelConfigProps> = ({
  provider,
  config,
  models,
  engineType = "chat",
  onChange,
  t,
  className,
}) => {
  const [isCustomModel, setIsCustomModel] = useState(() => {
    // If current model is not in the predefined list, it's custom
    if (!config.aiModel || models.length === 0) return true;
    return !models.some((m) => m.id === config.aiModel);
  });

  const requiresApiKey =
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "deepseek" ||
    provider === "grok" ||
    provider === "groq" ||
    provider === "gemini" ||
    provider === "baseten" ||
    provider === "openrouter" ||
    provider === "together" ||
    provider === "mistral";

  const requiresLocalUrl = provider === "local";

  const requiresCustomConfig = provider === "custom";

  const handleModelChange = (value: string) => {
    if (value === "__custom__") {
      setIsCustomModel(true);
      onChange({ aiModel: "" });
    } else {
      setIsCustomModel(false);
      onChange({ aiModel: value });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Engine description */}
      <div className="p-3 bg-dash-accent/5 border border-dash-accent/20 rounded-md">
        <p className="text-[11px] text-dash-text-muted leading-relaxed">
          {engineType === "chat"
            ? t.chatEngineDesc || "AI model used for the chat interface — this is what you interact with directly in the conversation."
            : t.kernelEngineDesc || "AI model for background agent tasks — handles analysis, memory compression, and autonomous loop operations."}
        </p>
      </div>

      {requiresApiKey && (
        <div className="p-3 bg-dash-warning/5 border border-dash-warning/20 rounded-md">
          <p className="text-[11px] text-dash-warning leading-relaxed">
            {t.apiKeyServerSide || "API keys are stored server-side in environment variables for security. Configure GEMINI_API_KEY, OPENAI_API_KEY, etc. in your environment or VS Code settings."}
          </p>
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
          <div className="p-3 bg-dash-warning/5 border border-dash-warning/20 rounded-md">
            <p className="text-[11px] text-dash-warning leading-relaxed">
              {t.customProviderSecurity || "Custom provider API keys should be configured via environment variables (CUSTOM_API_KEY) or VS Code secret storage."}
            </p>
          </div>

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
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-dash-text-primary mb-2">
          {t.modelName || "Model"}
        </label>
        {models.length > 0 && provider !== "local" && provider !== "custom" ? (
          <div className="space-y-2">
            <select
              value={isCustomModel ? "__custom__" : config.aiModel || ""}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
            >
              <option value="" disabled>{t.selectModel || "Select a model..."}</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
              <option value="__custom__">{t.customModel || "Custom / Other..."}</option>
            </select>
            {isCustomModel && (
              <input
                type="text"
                value={config.aiModel || ""}
                onChange={(e) => onChange({ aiModel: e.target.value })}
                className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
                placeholder={t.enterModelName || "Enter model name"}
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            value={config.aiModel || ""}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
            placeholder={t.enterModelName || "Enter model name"}
          />
        )}
      </div>
    </div>
  );
};
