import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { SettingsTabs } from "./SettingsTabs";
import { AIEngineTab } from "./AIEngineTab";
import { GlobalSettingsSection } from "./GlobalSettingsSection";
import { VoiceSettingsSection } from "./VoiceSettingsSection";
import type { Provider } from "./ProviderSelector";
import type { KeyValidationResult } from "./ModelConfig";
import type { ChatConfig, Preset, AgentId, ChatProviderId } from "../../types/settings";
import type { AIModel } from "../../types/ai";

interface SettingsBodyProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: Record<string, string>;
  presets: Preset[];
  isAutonomous: boolean;
  autoCommit: boolean;
  autoLoopDelay: number;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
  isValidating: boolean;
  keyValidations: KeyValidationResult[];
  config: ChatConfig;
  kernelConfig: ChatConfig;
  providers: Provider[];
  remoteModels: AIModel[];
  isRefreshingModels: boolean;
  getModelsForProvider: (providerId: string) => AIModel[];
  onProviderChange: (providerId: string) => void;
  onModelConfigChange: (modelConfig: Partial<any>) => void;
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
  onVerifyKey: () => void;
  onPresetSave?: ((preset: Omit<Preset, "id" | "createdAt">) => void) | undefined;
  onPresetApply?: ((preset: Preset) => void) | undefined;
  onPresetDelete?: ((id: string) => void) | undefined;
  onToggleAutonomous?: (() => void) | undefined;
  onToggleAutoCommit?: (() => void) | undefined;
  onChangeAutoLoopDelay?: ((delay: number) => void) | undefined;
  onToggleVoiceEnabled?: (() => void) | undefined;
  onChangeVoiceLanguage?: ((lang: string) => void) | undefined;
  onToggleVoiceAutoSend?: (() => void) | undefined;
}

export const SettingsBody: React.FC<SettingsBodyProps> = ({
  activeTab,
  setActiveTab,
  t,
  presets,
  isAutonomous,
  autoCommit,
  autoLoopDelay,
  voiceEnabled,
  voiceLanguage,
  voiceAutoSend,
  isValidating,
  keyValidations,
  config,
  kernelConfig,
  providers,
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
  onVerifyKey,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  onToggleAutonomous,
  onToggleAutoCommit,
  onChangeAutoLoopDelay,
  onToggleVoiceEnabled,
  onChangeVoiceLanguage,
  onToggleVoiceAutoSend,
}) => {
  const currentConfig = activeTab === "chat" ? config : kernelConfig;

  const tabs = [
    { id: "chat" as const, label: t.chatEngine || "Chat AI" },
    { id: "kernel" as const, label: t.kernelEngine || "Agent AI" },
    { id: "mcp" as const, label: "MCP" },
  ];

  return (
    <div className="p-3 overflow-y-auto max-h-[calc(90vh-120px)]">
      <SettingsTabs tabs={tabs} activeTab={activeTab as any} onTabChange={setActiveTab as any} className="mb-4" />
      <AnimatePresence mode="wait">
        {(activeTab === "chat" || activeTab === "kernel") && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <AIEngineTab
              engineType={activeTab === "chat" ? "chat" : "kernel"}
              providers={providers}
              currentConfig={currentConfig}
              presets={presets}
              remoteModels={remoteModels}
              isRefreshingModels={isRefreshingModels}
              getModelsForProvider={getModelsForProvider}
              onProviderChange={onProviderChange}
              onModelConfigChange={onModelConfigChange}
              onAgentChange={onAgentChange}
              onTemperatureChange={onTemperatureChange}
              onMaxTokensChange={onMaxTokensChange}
              onSystemPromptChange={onSystemPromptChange}
              onVisionToggle={onVisionToggle}
              onMaxImageSizeChange={onMaxImageSizeChange}
              onToggleMultiModel={onToggleMultiModel}
              onThinkingProviderChange={onThinkingProviderChange}
              onThinkingModelChange={onThinkingModelChange}
              onFetchRemoteModels={onFetchRemoteModels}
              onVerifyKey={onVerifyKey}
              keyValidation={keyValidations.find(kv => kv.provider === currentConfig.aiProvider) || null}
              isValidating={isValidating}
              onPresetSave={onPresetSave}
              onPresetApply={onPresetApply}
              onPresetDelete={onPresetDelete}
              t={t}
            />
          </motion.div>
        )}
        {activeTab === "mcp" && (
          <motion.div
            key="mcp"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div>
              <h3 className="text-[10px] font-bold text-dash-text-muted uppercase tracking-widest mb-2">
                {t.mcpTools || "MCP Tools"}
              </h3>
              <p className="text-xs text-dash-text-muted">
                MCP (Model Context Protocol) tools allow the AI to interact with external services and APIs.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalSettingsSection
        isAutonomous={isAutonomous}
        autoCommit={autoCommit}
        autoLoopDelay={autoLoopDelay}
        onToggleAutonomous={onToggleAutonomous}
        onToggleAutoCommit={onToggleAutoCommit}
        onChangeAutoLoopDelay={onChangeAutoLoopDelay}
        t={t}
      />
      <VoiceSettingsSection
        voiceEnabled={voiceEnabled}
        voiceLanguage={voiceLanguage}
        voiceAutoSend={voiceAutoSend}
        onToggleVoiceEnabled={onToggleVoiceEnabled}
        onChangeVoiceLanguage={onChangeVoiceLanguage}
        onToggleVoiceAutoSend={onToggleVoiceAutoSend}
        t={t}
      />
    </div>
  );
};
