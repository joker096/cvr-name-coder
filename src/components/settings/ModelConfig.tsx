import React from "react";
import { cn } from "../../utils/cn";

export interface ModelConfig {
  apiKey?: string;
  baseUrl?: string;
  localUrl?: string;
  localModelName?: string;
}

interface ModelConfigProps {
  provider: string;
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
    provider === "custom";

  const requiresBaseUrl =
    provider === "custom" ||
    provider === "deepseek" ||
    provider === "grok" ||
    provider === "groq";

  const requiresLocalConfig = provider === "local";

  const handleSetOfficialUrl = (url: string) => {
    onChange({ baseUrl: url });
  };

  return (
    <div className={cn("space-y-3 pt-2", className)}>
      {requiresApiKey && (
        <div className="space-y-2">
          <label className="text-[13px] uppercase font-bold text-dash-text-muted tracking-widest">
            {t.customApiKey || "API Key"}
          </label>
          <input
            type="password"
            value={config.apiKey || ""}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-base font-mono text-dash-text-primary focus:border-dash-accent outline-none"
            placeholder="sk-..."
          />
        </div>
      )}

      {requiresBaseUrl && (
        <div className="space-y-2">
          <label className="text-[14px] uppercase font-bold text-dash-text-muted tracking-widest">
            {provider === "custom" ? (t.customBaseUrl || "Base URL") : (t.localUrl || "Local URL")}
          </label>
          <div className="flex gap-1 mb-1">
            {provider === "deepseek" && (
              <button
                onClick={() => handleSetOfficialUrl("https://api.deepseek.com")}
                className="text-[12px] text-dash-accent underline font-mono"
              >
                OFFICIAL
              </button>
            )}
            {provider === "grok" && (
              <button
                onClick={() => handleSetOfficialUrl("https://api.x.ai/v1")}
                className="text-[12px] text-dash-accent underline font-mono"
              >
                OFFICIAL
              </button>
            )}
            {provider === "groq" && (
              <button
                onClick={() => handleSetOfficialUrl("https://api.groq.com/openai/v1")}
                className="text-[12px] text-dash-accent underline font-mono"
              >
                OFFICIAL
              </button>
            )}
          </div>
          <input
            type="text"
            value={config.baseUrl || ""}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-base font-mono text-dash-text-primary focus:border-dash-accent outline-none"
            placeholder={
              provider === "groq"
                ? "https://api.groq.com/openai/v1"
                : provider === "deepseek"
                ? "https://api.deepseek.com"
                : provider === "grok"
                ? "https://api.x.ai/v1"
                : "https://api.example.com"
            }
          />
        </div>
      )}

      {requiresLocalConfig && (
        <>
          <div className="space-y-2">
            <label className="text-[14px] uppercase font-bold text-dash-text-muted tracking-widest">
              {t.localUrl || "Local URL"}
            </label>
            <input
              type="text"
              value={config.localUrl || ""}
              onChange={(e) => onChange({ localUrl: e.target.value })}
              className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-base font-mono text-dash-text-primary focus:border-dash-accent outline-none"
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] uppercase font-bold text-dash-text-muted tracking-widest">
              {t.localModelName || "Model Name"}
            </label>
            <input
              type="text"
              value={config.localModelName || ""}
              onChange={(e) => onChange({ localModelName: e.target.value })}
              className="w-full bg-dash-bg border border-dash-border rounded px-3 py-2 text-base font-mono text-dash-text-primary focus:border-dash-accent outline-none"
              placeholder="llama2-7b"
            />
          </div>
        </>
      )}
    </div>
  );
};
