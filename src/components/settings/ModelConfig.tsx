import React, { useState, useCallback } from "react";
import { cn } from "../../utils/cn";
import { KeyRound } from "lucide-react";
import type { ChatProviderId } from "../../types/settings";
import type { AIModel } from "../../types/ai";

export interface ModelConfig {
  aiModel?: string;
  apiKey?: string;
  providerKeys?: Record<string, string>;
  baseUrl?: string;
  localUrl?: string;
  localModelName?: string;
  customUrl?: string;
}

export interface KeyValidationResult {
  provider: string;
  valid: boolean;
  error?: string;
}

interface ModelConfigProps {
  provider: ChatProviderId;
  config: ModelConfig;
  models: AIModel[];
  engineType?: "chat" | "kernel";
  onChange: (config: Partial<ModelConfig>) => void;
  onRefreshModels?: () => void;
  isRefreshingModels?: boolean;
  remoteModels?: AIModel[];
  keyValidation?: KeyValidationResult | null;
  isValidating?: boolean;
  onVerifyKey?: () => void;
  t: any;
  className?: string;
}

export const ModelConfig: React.FC<ModelConfigProps> = ({
  provider,
  config,
  models,
  engineType = "chat",
  onChange,
  onRefreshModels,
  isRefreshingModels = false,
  remoteModels = [],
  keyValidation,
  isValidating,
  onVerifyKey,
  t,
  className,
}) => {
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const mergedModels = [...models, ...remoteModels.filter(
    (rm) => !models.some((m) => m.id === rm.id)
  )];

  const handleModelChange = (value: string) => {
    if (value === "__custom__") {
      setIsCustomModel(true);
      onChange({ aiModel: "" });
    } else {
      setIsCustomModel(false);
      onChange({ aiModel: value });
    }
  };

  const handleApiKeyChange = useCallback((value: string) => {
    onChange({
      apiKey: value,
      providerKeys: { ...config.providerKeys, [provider]: value },
    });
  }, [onChange, config.providerKeys, provider]);
  
  const currentApiKey = config.providerKeys?.[provider] ?? config.apiKey ?? "";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="p-3 bg-dash-accent/5 border border-dash-accent/20 rounded-md">
        <p className="text-[10px] text-dash-text-muted leading-relaxed">
          {engineType === "chat"
            ? t.chatEngineDesc || "AI model used for the chat interface — this is what you interact with directly in the conversation."
            : t.kernelEngineDesc || "AI model for background agent tasks — handles analysis, memory compression, and autonomous loop operations."}
        </p>
      </div>

      {requiresApiKey && (
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-dash-text-primary mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            {t.apiKeyLabel || "API Key"}
            {keyValidation && (
              <span className={`text-[11px] font-bold ${keyValidation.valid ? 'text-green-400' : 'text-red-400'}`}>
                {keyValidation.valid ? '✓' : '✗'}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={currentApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className={cn(
                "w-full px-2.5 py-1.5 bg-dash-bg border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs",
                keyValidation && !keyValidation.valid && "border-red-500/50 focus:ring-red-500/30",
                keyValidation && keyValidation.valid && "border-green-500/50 focus:ring-green-500/30",
                !keyValidation && "border-dash-border",
              )}
              placeholder={t.apiKeyPlaceholder || "Enter API key or leave empty to use env var"}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isValidating && (
                <span className="w-3 h-3 border border-dash-accent/50 border-t-dash-accent rounded-full animate-spin" />
              )}
              {keyValidation && !isValidating && (
                <span className={cn("text-xs font-bold", keyValidation.valid ? "text-green-400" : "text-red-400")}>
                  {keyValidation.valid ? "✓" : "✗"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-dash-text-muted hover:text-dash-text-primary text-xs"
                tabIndex={-1}
              >
                {showApiKey ? (t.apiKeyHide || "HIDE") : (t.apiKeyShow || "SHOW")}
              </button>
            </div>
          </div>
          {onVerifyKey && currentApiKey && !isValidating && !keyValidation && (
            <button
              type="button"
              onClick={onVerifyKey}
              className="mt-1.5 text-[10px] text-dash-accent hover:text-dash-accent/80 transition-colors"
            >
              Verify key →
            </button>
          )}
          {keyValidation && !keyValidation.valid && (
            <p className="text-[10px] text-red-400 mt-1">{keyValidation.error || "Invalid key"}</p>
          )}
          {!keyValidation && (
            <p className="text-[10px] text-dash-text-muted mt-1 leading-relaxed">
              {t.apiKeyStored?.replace("{provider}", provider.toUpperCase()) || `Stored in browser localStorage. Overrides ${provider.toUpperCase()}_API_KEY env var if set.`}
            </p>
          )}
        </div>
      )}

      {requiresLocalUrl && (
        <>
          <div>
            <label className="block text-xs font-medium text-dash-text-primary mb-2">
              {t.localUrl || "Local URL"}
            </label>
            <input
              type="text"
              value={config.localUrl || ""}
              onChange={(e) => onChange({ localUrl: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
              placeholder="http://localhost:11434"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dash-text-primary mb-2">
              {t.modelName || "Model Name"}
            </label>
            <input
              type="text"
              value={config.localModelName || ""}
              onChange={(e) => onChange({ localModelName: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
              placeholder="llama3"
            />
          </div>
        </>
      )}

      {requiresCustomConfig && (
        <>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-dash-text-primary mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              {t.apiKeyLabel || "API Key"}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
              value={currentApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                className="w-full px-2.5 py-1.5 pr-10 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
                placeholder="CUSTOM_API_KEY or enter here"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-dash-text-muted hover:text-dash-text-primary text-xs"
                tabIndex={-1}
              >
                {showApiKey ? (t.apiKeyHide || "HIDE") : (t.apiKeyShow || "SHOW")}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dash-text-primary mb-2">
              {t.customUrl || "Custom URL"}
            </label>
            <input
              type="text"
              value={config.customUrl || ""}
              onChange={(e) => onChange({ customUrl: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
              placeholder="https://api.example.com"
            />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-dash-text-primary">
            {t.modelName || "Model"}
          </label>
          {requiresApiKey && onRefreshModels && (
            <button
              type="button"
              onClick={onRefreshModels}
              disabled={isRefreshingModels}
              className="text-[10px] text-dash-accent hover:text-dash-accent/80 disabled:text-dash-text-muted disabled:cursor-not-allowed transition-colors"
            >
              {isRefreshingModels ? "Loading..." : "Fetch models"}
            </button>
          )}
        </div>

        {mergedModels.length > 0 && provider !== "local" && provider !== "custom" ? (
          <div className="space-y-2">
            <select
              value={isCustomModel ? "__custom__" : config.aiModel || ""}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
            >
              <option value="" disabled>{t.selectModel || "Select a model..."}</option>
              {mergedModels.map((model) => (
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
                className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
                placeholder={t.enterModelName || "Enter model name"}
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            value={config.aiModel || ""}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
            placeholder={t.enterModelName || "Enter model name"}
          />
        )}
        {remoteModels.length > 0 && (
          <p className="text-[10px] text-dash-text-muted mt-1">
            {remoteModels.length} models fetched from API. Predefined models are also included.
          </p>
        )}
      </div>
    </div>
  );
};
