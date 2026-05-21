import React from "react";
import type { ChatConfig, Preset, AgentId } from "../../types/settings";
import type { Provider } from "./ProviderSelector";
import type { ModelConfig as ModelConfigType } from "./ModelConfig";
import { ProviderSelector } from "./ProviderSelector";
import { ModelConfig } from "./ModelConfig";
import { PresetManager } from "./PresetManager";
import { MultiModelSection } from "./MultiModelSection";
import { AgentSection } from "./AgentSection";
import { GenerationSection } from "./GenerationSection";
import { VisionSection } from "./VisionSection";
import { SystemPromptSection } from "./SystemPromptSection";

interface AIEngineTabProps {
  engineType: "chat" | "kernel";
  providers: Provider[];
  currentConfig: ChatConfig;
  presets: Preset[];
  remoteModels: { id: string; name: string }[];
  isRefreshingModels: boolean;
  getModelsForProvider: (providerId: ChatProviderId) => { id: string; name: string }[];
  onProviderChange: (providerId: string) => void;
  onModelConfigChange: (modelConfig: Partial<ModelConfigType>) => void;
  onAgentChange: (agent: AgentId) => void;
  onTemperatureChange: (temp: number) => void;
  onMaxTokensChange: (tokens: number) => void;
  onSystemPromptChange: (prompt: string) => void;
  onVisionToggle: () => void;
  onMaxImageSizeChange: (size: number) => void;
  onToggleMultiModel: () => void;
  onThinkingProviderChange: (providerId: ChatProviderId) => void;
  onThinkingModelChange: (model: string) => void;
  onFetchRemoteModels: () => void;
  onPresetSave?: ((preset: Omit<Preset, "id" | "createdAt">) => void) | undefined;
  onPresetApply?: ((preset: Preset) => void) | undefined;
  onPresetDelete?: ((id: string) => void) | undefined;
  t: Record<string, string>;
}

import type { ChatProviderId } from "../../types/settings";

export const AIEngineTab: React.FC<AIEngineTabProps> = ({
  providers,
  currentConfig,
  presets,
  remoteModels,
  isRefreshingModels,
  getModelsForProvider,
  onProviderChange,
  onModelConfigChange,
  onAgentChange,
  onTemperatureChange,
  onMaxTokensChange,
  onSystemPromptChange,
  onVisionToggle,
  onMaxImageSizeChange,
  onToggleMultiModel,
  onThinkingProviderChange,
  onThinkingModelChange,
  onFetchRemoteModels,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  t,
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest mb-2">
        {t.selectProvider || "Select Provider"}
      </h3>
      <ProviderSelector
        providers={providers}
        selectedProvider={currentConfig.aiProvider}
        onSelectProvider={onProviderChange}
      />
    </div>

    <ModelConfig
      provider={currentConfig.aiProvider}
      config={{
        aiModel: currentConfig.aiModel ?? "",
        apiKey: currentConfig.apiKey ?? "",
        localUrl: currentConfig.localUrl ?? "",
        localModelName: currentConfig.localModelName ?? "",
        customUrl: currentConfig.customUrl ?? "",
      }}
      models={getModelsForProvider(currentConfig.aiProvider)}
      remoteModels={remoteModels}
      isRefreshingModels={isRefreshingModels}
      onRefreshModels={onFetchRemoteModels}
      onChange={onModelConfigChange}
      t={t}
    />

    {onPresetSave && onPresetApply && onPresetDelete && (
      <PresetManager
        presets={presets}
        currentConfig={currentConfig}
        onSavePreset={onPresetSave}
        onApplyPreset={onPresetApply}
        onDeletePreset={onPresetDelete}
        t={t}
      />
    )}

    <MultiModelSection
      currentConfig={currentConfig}
      providers={providers.map((p) => ({ id: p.id as ChatProviderId, label: p.label }))}
      getModelsForProvider={getModelsForProvider}
      onToggleMultiModel={onToggleMultiModel}
      onThinkingProviderChange={onThinkingProviderChange}
      onThinkingModelChange={onThinkingModelChange}
      t={t}
    />

    <AgentSection
      currentConfig={currentConfig}
      onAgentChange={onAgentChange}
      t={t}
    />

    <GenerationSection
      currentConfig={currentConfig}
      onTemperatureChange={onTemperatureChange}
      onMaxTokensChange={onMaxTokensChange}
      t={t}
    />

    <VisionSection
      currentConfig={currentConfig}
      onVisionToggle={onVisionToggle}
      onMaxImageSizeChange={onMaxImageSizeChange}
      t={t}
    />

    <SystemPromptSection
      currentConfig={currentConfig}
      onSystemPromptChange={onSystemPromptChange}
      t={t}
    />
  </div>
);
