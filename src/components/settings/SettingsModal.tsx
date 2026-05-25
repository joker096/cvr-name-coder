import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsFooter } from "./SettingsFooter";
import type { ChatConfig, Preset } from "../../types/settings";
import { useAIProviders } from "../../hooks/useAIProviders";
import { useSettingsValidation } from "../../hooks/useSettingsValidation";
import { useSettingsConfig } from "../../hooks/useSettingsConfig";
import { AI_PROVIDERS } from "../../constants/providers";
import { SettingsBody } from "./SettingsBody";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChatConfig;
  presets: Preset[];
  isAutonomous: boolean;
  autoLoopDelay: number;
  autoCommit: boolean;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
  onSave: (config: ChatConfig) => void;
  onPresetSave?: ((preset: Omit<Preset, "id" | "createdAt">) => void) | undefined;
  onPresetApply?: (preset: Preset) => void;
  onPresetDelete?: (id: string) => void;
  onToggleAutonomous?: () => void;
  onToggleAutoCommit?: () => void;
  onChangeAutoLoopDelay?: (delay: number) => void;
  onLanguageChange?: (lang: string) => void;
  onToggleVoiceEnabled?: () => void;
  onChangeVoiceLanguage?: (lang: string) => void;
  onToggleVoiceAutoSend?: () => void;
  t: Record<string, string>;
  lang?: string;
  className?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = memo(({
  isOpen,
  onClose,
  config,
  presets,
  isAutonomous,
  autoLoopDelay,
  autoCommit,
  voiceEnabled,
  voiceLanguage,
  voiceAutoSend,
  onSave,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  onToggleAutonomous,
  onToggleAutoCommit,
  onChangeAutoLoopDelay,
  onLanguageChange,
  onToggleVoiceEnabled,
  onChangeVoiceLanguage,
  onToggleVoiceAutoSend,
  t,
  lang = "en",
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "mcp" | "design">("chat");
  const { getModelsForProvider, fetchRemoteModels, remoteModels, isRefreshingModels } = useAIProviders();

  const {
    localConfig,
    handleProviderChange,
    handleModelConfigChange,
    handleAgentChange,
    handleTemperatureChange,
    handleMaxTokensChange,
    handleSystemPromptChange,
    handleVisionToggle,
    handleMaxImageSizeChange,
    handleToggleMultiModel,
    handleThinkingProviderChange,
    handleThinkingModelChange,
  } = useSettingsConfig(config);

  const {
    keyValidations,
    isValidating,
    handleSave,
    handleVerifyKey,
    setKeyValidations,
  } = useSettingsValidation({ config: localConfig, onSave, onClose });

  const handleFetchRemoteModels = () => {
    const provider = localConfig.aiProvider;
    const key = localConfig.providerKeys?.[provider] || localConfig.apiKey;
    if (key) fetchRemoteModels(provider, key).catch(() => {});
  };

  const handleModelConfigChangeWithValidation = (modelConfig: any) => {
    handleModelConfigChange(modelConfig);
    if (modelConfig.apiKey !== undefined) setKeyValidations([]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn("bg-dash-bg border border-dash-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <SettingsHeader title={t.settings || "Settings"} onClose={onClose} />
          <SettingsBody
            activeTab={activeTab}
            setActiveTab={setActiveTab as (tab: string) => void}
            t={t}
            presets={presets}
            isAutonomous={isAutonomous}
            autoCommit={autoCommit}
            autoLoopDelay={autoLoopDelay}
            voiceEnabled={voiceEnabled}
            voiceLanguage={voiceLanguage}
            voiceAutoSend={voiceAutoSend}
            isValidating={isValidating}
            keyValidations={keyValidations}
            config={localConfig}
            providers={AI_PROVIDERS}
            remoteModels={remoteModels}
            isRefreshingModels={isRefreshingModels}
            getModelsForProvider={getModelsForProvider}
            onProviderChange={handleProviderChange}
            onModelConfigChange={handleModelConfigChangeWithValidation}
            onAgentChange={handleAgentChange}
            onTemperatureChange={handleTemperatureChange}
            onMaxTokensChange={handleMaxTokensChange}
            onSystemPromptChange={handleSystemPromptChange}
            onVisionToggle={handleVisionToggle}
            onMaxImageSizeChange={handleMaxImageSizeChange}
            onToggleMultiModel={handleToggleMultiModel}
            onThinkingProviderChange={handleThinkingProviderChange}
            onThinkingModelChange={handleThinkingModelChange}
            onFetchRemoteModels={handleFetchRemoteModels}
            onVerifyKey={handleVerifyKey}
            onPresetSave={onPresetSave}
            onPresetApply={onPresetApply}
            onPresetDelete={onPresetDelete}
            onToggleAutonomous={onToggleAutonomous}
            onToggleAutoCommit={onToggleAutoCommit}
            onChangeAutoLoopDelay={onChangeAutoLoopDelay}
            onToggleVoiceEnabled={onToggleVoiceEnabled}
            onChangeVoiceLanguage={onChangeVoiceLanguage}
            onToggleVoiceAutoSend={onToggleVoiceAutoSend}
          />
          <SettingsFooter
            onClose={onClose}
            onSave={handleSave}
            isSaving={isValidating}
            lang={lang}
            onLanguageChange={onLanguageChange ?? (() => {})}
            t={t}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
