import { useState, useCallback } from "react";
import type { ChatConfig, AgentId, ChatProviderId } from "../types/settings";
import type { ModelConfig } from "../components/settings/ModelConfig";

export const useSettingsConfig = (initialConfig: ChatConfig) => {
  const [localConfig, setLocalConfig] = useState<ChatConfig>(initialConfig);

  const handleProviderChange = useCallback((providerId: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      aiProvider: providerId as ChatConfig["aiProvider"],
    }));
  }, []);

  const handleModelConfigChange = useCallback((modelConfig: Partial<ModelConfig>) => {
    setLocalConfig((prev) => {
      const next = { ...prev, ...modelConfig };
      if (modelConfig.providerKeys) {
        next.providerKeys = { ...prev.providerKeys, ...modelConfig.providerKeys };
      }
      return next;
    });
  }, []);

  const handleAgentChange = useCallback((agent: AgentId) => {
    setLocalConfig((prev) => ({ ...prev, agent }));
  }, []);

  const handleTemperatureChange = useCallback((temp: number) => {
    setLocalConfig((prev) => ({ ...prev, temperature: temp }));
  }, []);

  const handleMaxTokensChange = useCallback((tokens: number) => {
    setLocalConfig((prev) => ({ ...prev, maxTokens: tokens }));
  }, []);

  const handleSystemPromptChange = useCallback((prompt: string) => {
    setLocalConfig((prev) => ({ ...prev, systemPrompt: prompt }));
  }, []);

  const handleVisionToggle = useCallback(() => {
    setLocalConfig((prev) => ({ ...prev, visionEnabled: !prev.visionEnabled }));
  }, []);

  const handleMaxImageSizeChange = useCallback((size: number) => {
    setLocalConfig((prev) => ({ ...prev, maxImageSize: size }));
  }, []);

  const handleToggleMultiModel = useCallback(() => {
    setLocalConfig((prev) => ({ ...prev, multiModelEnabled: !prev.multiModelEnabled }));
  }, []);

  const handleThinkingProviderChange = useCallback((pid: ChatProviderId) => {
    setLocalConfig((prev) => ({ ...prev, thinkingProvider: pid }));
  }, []);

  const handleThinkingModelChange = useCallback((model: string) => {
    setLocalConfig((prev) => ({ ...prev, thinkingModel: model }));
  }, []);

  return {
    localConfig,
    setLocalConfig,
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
  };
};