import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../utils/cn";
import { SettingsHeader } from "./SettingsHeader";
import { SettingsFooter } from "./SettingsFooter";
import type { Provider } from "./ProviderSelector";
import type { ModelConfig as ModelConfigType, KeyValidationResult } from "./ModelConfig";
import type { ChatConfig, Preset, ChatProviderId } from "../../types/settings";
import { toChatProviderId } from "../../types/ai";
import { useAIProviders } from "../../hooks/useAIProviders";
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
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
  const [activeTab, setActiveTab] = useState("chat" as "chat" | "mcp" | "design");
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);
  const { getModelsForProvider, fetchRemoteModels, remoteModels, isRefreshingModels } = useAIProviders();
  const [keyValidations, setKeyValidations] = useState<KeyValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    const provider = localConfig.aiProvider;
    const results: KeyValidationResult[] = [];
    setIsValidating(true);
    if (provider && provider !== "local" && provider !== "custom") {
      const key = (localConfig.providerKeys?.[provider] || localConfig.apiKey || "").trim();
      if (key) {
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
    }
    setIsValidating(false);
    setKeyValidations(results);
    if (results.some(r => !r.valid)) return;
    onSave(localConfig);
    onClose();
  };

  const handleProviderChange = (providerId: string) => {
    setLocalConfig((prev) => ({ ...prev, aiProvider: providerId as ChatConfig["aiProvider"] }));
  };

  const handleModelConfigChange = (modelConfig: Partial<ModelConfigType>) => {
    setLocalConfig((prev) => {
      const next = { ...prev, ...modelConfig };
      if (modelConfig.providerKeys) {
        next.providerKeys = { ...prev.providerKeys, ...modelConfig.providerKeys };
      }
      return next;
    });
    if (modelConfig.apiKey !== undefined) setKeyValidations([]);
  };

  const handleFetchRemoteModels = () => {
    const provider = localConfig.aiProvider;
    const key = localConfig.providerKeys?.[provider] || localConfig.apiKey;
    if (key) fetchRemoteModels(provider, key).catch(() => {});
  };

  const handleVerifyKey = async () => {
    const provider = localConfig.aiProvider;
    const key = (localConfig.providerKeys?.[provider] || localConfig.apiKey || "").trim();
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
            providers={PROVIDERS}
            remoteModels={remoteModels}
            isRefreshingModels={isRefreshingModels}
            getModelsForProvider={getModelsForProvider}
            onProviderChange={handleProviderChange}
            onModelConfigChange={handleModelConfigChange}
            onAgentChange={(agent) => setLocalConfig((prev) => ({ ...prev, agent }))}
            onTemperatureChange={(temp) => setLocalConfig((prev) => ({ ...prev, temperature: temp }))}
            onMaxTokensChange={(tokens) => setLocalConfig((prev) => ({ ...prev, maxTokens: tokens }))}
            onSystemPromptChange={(prompt) => setLocalConfig((prev) => ({ ...prev, systemPrompt: prompt }))}
            onVisionToggle={() => setLocalConfig((prev) => ({ ...prev, visionEnabled: !prev.visionEnabled }))}
            onMaxImageSizeChange={(size) => setLocalConfig((prev) => ({ ...prev, maxImageSize: size }))}
            onToggleMultiModel={() => setLocalConfig((prev) => ({ ...prev, multiModelEnabled: !prev.multiModelEnabled }))}
            onThinkingProviderChange={(pid: ChatProviderId) => setLocalConfig((prev) => ({ ...prev, thinkingProvider: pid }))}
            onThinkingModelChange={(model) => setLocalConfig((prev) => ({ ...prev, thinkingModel: model }))}
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
            t={t as Record<string, string>}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
