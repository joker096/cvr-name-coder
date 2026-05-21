import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsFooter } from "./SettingsFooter";
import { AIEngineTab } from "./AIEngineTab";
import { GlobalSettingsSection } from "./GlobalSettingsSection";
import { VoiceSettingsSection } from "./VoiceSettingsSection";
import type { Provider } from "./ProviderSelector";
import type { ModelConfig as ModelConfigType, KeyValidationResult } from "./ModelConfig";
import type { ChatConfig, Preset, AgentId } from "../../types/settings";
import { toChatProviderId } from "../../types/ai";
import { useAIProviders } from "../../hooks/useAIProviders";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChatConfig;
  kernelConfig: ChatConfig;
  presets: Preset[];
  isAutonomous: boolean;
  autoLoopDelay: number;
  autoCommit: boolean;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceAutoSend: boolean;
  onSave: (config: ChatConfig, kernelConfig: ChatConfig) => void;
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

const PROVIDERS: Provider[] = [
  { id: toChatProviderId("gemini"), icon: { type: "lucide", name: "sparkles" }, label: "Google Gemini", type: "cloud" },
  { id: toChatProviderId("openai"), icon: { type: "lucide", name: "bot" }, label: "OpenAI", type: "cloud" },
  { id: toChatProviderId("anthropic"), icon: { type: "lucide", name: "brain" }, label: "Anthropic", type: "cloud" },
  { id: toChatProviderId("deepseek"), icon: { type: "lucide", name: "search" }, label: "DeepSeek", type: "cloud" },
  { id: toChatProviderId("grok"), icon: { type: "lucide", name: "zap" }, label: "Grok", type: "cloud" },
  { id: toChatProviderId("groq"), icon: { type: "lucide", name: "cpu" }, label: "Groq", type: "cloud" },
  { id: toChatProviderId("baseten"), icon: { type: "lucide", name: "box" }, label: "Baseten", type: "cloud" },
  { id: toChatProviderId("openrouter"), icon: { type: "lucide", name: "router" }, label: "OpenRouter", type: "cloud" },
  { id: toChatProviderId("together"), icon: { type: "lucide", name: "users" }, label: "Together AI", type: "cloud" },
  { id: toChatProviderId("mistral"), icon: { type: "lucide", name: "wind" }, label: "Mistral AI", type: "cloud" },
  { id: toChatProviderId("local"), icon: { type: "lucide", name: "server" }, label: "Local", type: "local" },
  { id: toChatProviderId("custom"), icon: { type: "lucide", name: "settings" }, label: "Custom", type: "cloud" },
];

const TABS = [
  { id: "chat" as const, label: "Chat AI" },
  { id: "kernel" as const, label: "Agent AI" },
  { id: "mcp" as const, label: "MCP" },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  kernelConfig,
  isAutonomous,
  autoLoopDelay,
  autoCommit,
  voiceEnabled,
  voiceLanguage,
  voiceAutoSend,
  onSave,
  onToggleAutonomous,
  onToggleAutoCommit,
  onChangeAutoLoopDelay,
  onLanguageChange,
  onToggleVoiceEnabled,
  onChangeVoiceLanguage,
  onToggleVoiceAutoSend,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  presets,
  t,
  lang = "en",
  className,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("chat");
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);
  const [localKernelConfig, setLocalKernelConfig] = useState<ChatConfig>(kernelConfig);
  const { getModelsForProvider, fetchRemoteModels, remoteModels, isRefreshingModels } = useAIProviders();
  const [keyValidations, setKeyValidations] = useState<KeyValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const currentConfig = activeTab === "chat" ? localConfig : localKernelConfig;
  const setCurrentConfig = activeTab === "chat" ? setLocalConfig : setLocalKernelConfig;

  const handleSave = async () => {
    const configs = [
      { cfg: localConfig, label: "chat" },
      { cfg: localKernelConfig, label: "kernel" }
    ];

    const results: KeyValidationResult[] = [];
    setIsValidating(true);

    for (const { cfg } of configs) {
      const provider = cfg.aiProvider;
      if (!provider || provider === "local" || provider === "custom") continue;
      const key = (cfg.providerKeys?.[provider] || cfg.apiKey || "").trim();
      if (!key) continue;
      try {
        const r = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey: key }),
        });
        const data = await r.json();
        results.push({ provider, valid: data.valid, error: data.error || data.warning });
      } catch {
        results.push({ provider, valid: false, error: "Validation failed" });
      }
    }

    setIsValidating(false);
    setKeyValidations(results);

    const hasInvalid = results.some(r => !r.valid);
    if (hasInvalid) return;

    onSave(localConfig, localKernelConfig);
    onClose();
  };

  const handleProviderChange = (providerId: string) => {
    setCurrentConfig((prev) => ({ ...prev, aiProvider: providerId as ChatConfig["aiProvider"] }));
  };

  const handleModelConfigChange = (modelConfig: Partial<ModelConfigType>) => {
    setCurrentConfig((prev) => {
      const next = { ...prev, ...modelConfig };
      if (modelConfig.providerKeys) {
        next.providerKeys = { ...prev.providerKeys, ...modelConfig.providerKeys };
      }
      return next;
    });
    if (modelConfig.apiKey !== undefined) setKeyValidations([]);
  };

  const handleFetchRemoteModels = () => {
    const provider = currentConfig.aiProvider;
    const key = currentConfig.providerKeys?.[provider] || currentConfig.apiKey;
    if (key) fetchRemoteModels(provider, key).catch(() => {});
  };

  const handleVerifyKey = async () => {
    const provider = currentConfig.aiProvider;
    const key = (currentConfig.providerKeys?.[provider] || currentConfig.apiKey || "").trim();
    if (!key || !provider || provider === "local" || provider === "custom") return;
    setIsValidating(true);
    try {
      const r = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await r.json();
      setKeyValidations([{ provider, valid: data.valid, error: data.error || data.warning }]);
    } catch {
      setKeyValidations([{ provider, valid: false, error: "Validation failed" }]);
    }
    setIsValidating(false);
  };

  const tabs = TABS.map((tab) => ({
    ...tab,
    label: tab.id === "chat" ? t.chatEngine || tab.label : tab.id === "kernel" ? t.kernelEngine || tab.label : tab.label,
  }));

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

          <div className="p-3 overflow-y-auto max-h-[calc(90vh-120px)]">
            <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-4" />

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
                    providers={PROVIDERS}
                    currentConfig={currentConfig}
                    presets={presets}
                    remoteModels={remoteModels}
                    isRefreshingModels={isRefreshingModels}
                    getModelsForProvider={getModelsForProvider}
                    onProviderChange={handleProviderChange}
                    onModelConfigChange={handleModelConfigChange}
                    onAgentChange={(agent: AgentId) => setCurrentConfig((prev) => ({ ...prev, agent }))}
                    onTemperatureChange={(temp) => setCurrentConfig((prev) => ({ ...prev, temperature: temp }))}
                    onMaxTokensChange={(tokens) => setCurrentConfig((prev) => ({ ...prev, maxTokens: tokens }))}
                    onSystemPromptChange={(prompt) => setCurrentConfig((prev) => ({ ...prev, systemPrompt: prompt }))}
                    onVisionToggle={() => setCurrentConfig((prev) => ({ ...prev, visionEnabled: !prev.visionEnabled }))}
                    onMaxImageSizeChange={(size) => setCurrentConfig((prev) => ({ ...prev, maxImageSize: size }))}
                    onToggleMultiModel={() => setCurrentConfig((prev) => ({ ...prev, multiModelEnabled: !prev.multiModelEnabled }))}
                    onThinkingProviderChange={(providerId) => setCurrentConfig((prev) => ({ ...prev, thinkingProvider: providerId }))}
                    onThinkingModelChange={(model) => setCurrentConfig((prev) => ({ ...prev, thinkingModel: model }))}
                    onFetchRemoteModels={handleFetchRemoteModels}
                    onVerifyKey={handleVerifyKey}
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

          <SettingsFooter
            onClose={onClose}
            onSave={handleSave}
            isSaving={isValidating}
            lang={lang}
            onLanguageChange={onLanguageChange ?? (() => {})}
            t={t as Record<string, string>}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
