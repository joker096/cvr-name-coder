import React from "react";
import { ToggleSwitch } from "../shared/ToggleSwitch";
import type { ChatConfig, ChatProviderId } from "../../types/settings";

interface MultiModelSectionProps {
  currentConfig: ChatConfig;
  providers: { id: ChatProviderId; label: string }[];
  getModelsForProvider: (providerId: ChatProviderId) => { id: string; name: string }[];
  onToggleMultiModel: () => void;
  onThinkingProviderChange: (providerId: ChatProviderId) => void;
  onThinkingModelChange: (model: string) => void;
  t: Record<string, string>;
}

export const MultiModelSection: React.FC<MultiModelSectionProps> = ({
  currentConfig,
  providers,
  getModelsForProvider,
  onToggleMultiModel,
  onThinkingProviderChange,
  onThinkingModelChange,
  t,
}) => (
  <div className="space-y-2 pt-2.5 border-t border-dash-border">
    <ToggleSwitch
      checked={currentConfig.multiModelEnabled ?? false}
      onChange={onToggleMultiModel}
      label={t.multiModelSwapping || "Multi-Model Swapping"}
      description={t.multiModelDesc || "Use a cheaper model for thinking/planning, and a powerful model for code generation"}
    />
    {currentConfig.multiModelEnabled && (
      <div className="space-y-3 pl-2 border-l-2 border-dash-accent/30">
        <div>
          <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest mb-2">
            {t.thinkingModel || "Thinking Model"}
          </h3>
          <div className="mb-3">
            <label className="block text-[9px] font-medium text-dash-text-muted mb-1">Provider</label>
            <select
              value={currentConfig.thinkingProvider || ""}
              onChange={(e) => onThinkingProviderChange(e.target.value as ChatProviderId)}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <ThinkingModelSelector
            currentConfig={currentConfig}
            getModelsForProvider={getModelsForProvider}
            onChange={onThinkingModelChange}
          />
          <p className="text-[9px] text-dash-text-muted mt-2 leading-relaxed">
            {t.thinkingModelDesc || "Used for planning, analysis, summarization and agent decision-making. Choose a fast, cost-effective model (e.g., Gemini Flash, GPT-4o-mini)."}
          </p>
        </div>
      </div>
    )}
  </div>
);

const ThinkingModelSelector: React.FC<{
  currentConfig: ChatConfig;
  getModelsForProvider: (providerId: ChatProviderId) => { id: string; name: string }[];
  onChange: (model: string) => void;
}> = ({ currentConfig, getModelsForProvider, onChange }) => {
  const tpId = (currentConfig.thinkingProvider || "") as ChatProviderId;
  const thinkingModels = getModelsForProvider(tpId);
  const allModelIds = thinkingModels.map((m) => m.id);
  const currentModel = currentConfig.thinkingModel || "";
  const isCustomModel = currentModel !== "" && !allModelIds.includes(currentModel);
  const hasModels = thinkingModels.length > 0 && tpId !== "local" && tpId !== "custom";

  return (
    <div>
      <label className="block text-[9px] font-medium text-dash-text-muted mb-1">Model</label>
      {hasModels ? (
        <div className="space-y-1.5">
          <select
            value={isCustomModel ? "__custom__" : currentModel}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "__custom__" ? "" : val);
            }}
            className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
          >
            <option value="" disabled>Select model...</option>
            {thinkingModels.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            <option value="__custom__">Custom / Other...</option>
          </select>
          {isCustomModel && (
            <input
              type="text"
              value={currentModel}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
              placeholder="Enter model name"
            />
          )}
        </div>
      ) : (
        <input
          type="text"
          value={currentModel}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-xs"
          placeholder="gemini-2.0-flash"
        />
      )}
    </div>
  );
};
