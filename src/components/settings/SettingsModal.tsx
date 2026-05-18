import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";
import { ProviderSelector, type Provider } from "./ProviderSelector";
import { ModelConfig, type ModelConfig as ModelConfigType } from "./ModelConfig";
import { LanguageSelector } from "./LanguageSelector";
import type { ChatConfig, Preset } from "../../types/settings";
import { toChatProviderId } from "../../types/ai";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChatConfig;
  kernelConfig: ChatConfig;
  onSave: (config: ChatConfig, kernelConfig: ChatConfig) => void;
  onLanguageChange?: (lang: string) => void;
  t: any;
  lang?: string;
  className?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  kernelConfig,
  onSave,
  onLanguageChange,
  t,
  lang = "en",
  className,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("chat");
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);
  const [localKernelConfig, setLocalKernelConfig] = useState<ChatConfig>(kernelConfig);

  const currentConfig = activeTab === "chat" ? localConfig : localKernelConfig;
  const setCurrentConfig = activeTab === "chat" ? setLocalConfig : setLocalKernelConfig;

  const handleSave = () => {
    onSave(localConfig, localKernelConfig);
    onClose();
  };

  const handleProviderChange = (providerId: string) => {
    setCurrentConfig((prev) => ({
      ...prev,
      aiProvider: providerId as ChatConfig["aiProvider"],
    }));
  };

  const handleModelConfigChange = (modelConfig: Partial<ModelConfigType>) => {
    setCurrentConfig((prev) => ({
      ...prev,
      ...modelConfig,
    }));
  };

  const providers: Provider[] = [
    { 
      id: toChatProviderId("gemini"), 
      icon: { type: "lucide", name: "sparkles" }, 
      label: t.cloudGemini || "Google Gemini",
      type: "cloud"
    },
    { 
      id: toChatProviderId("openai"), 
      icon: { type: "lucide", name: "bot" }, 
      label: t.openaiProvider || "OpenAI",
      type: "cloud"
    },
    { 
      id: toChatProviderId("anthropic"), 
      icon: { type: "lucide", name: "brain" }, 
      label: t.anthropicProvider || "Anthropic",
      type: "cloud"
    },
    { 
      id: toChatProviderId("deepseek"), 
      icon: { type: "lucide", name: "search" }, 
      label: t.deepseekProvider || "DeepSeek",
      type: "cloud"
    },
    { 
      id: toChatProviderId("grok"), 
      icon: { type: "lucide", name: "zap" }, 
      label: t.grokProvider || "Grok",
      type: "cloud"
    },
    { 
      id: toChatProviderId("groq"), 
      icon: { type: "lucide", name: "cpu" }, 
      label: "Groq",
      type: "cloud"
    },
    { 
      id: toChatProviderId("local"), 
      icon: { type: "lucide", name: "server" }, 
      label: t.localModel || "Local",
      type: "local"
    },
    { 
      id: toChatProviderId("custom"), 
      icon: { type: "lucide", name: "settings" }, 
      label: t.customProvider || "Custom",
      type: "cloud"
    },
  ];

  const tabs = [
    { id: "chat" as const, label: t.chatEngine || "Chat Engine" },
    { id: "kernel" as const, label: t.kernelEngine || "Kernel Engine" },
    { id: "mcp" as const, label: "MCP" },
  ];

  if (!isOpen) {
    return null;
  }

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
          className={cn(
            "bg-dash-bg border border-dash-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dash-border">
            <h2 className="text-lg font-bold text-dash-text-primary">
              {t.settings || "Settings"}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <SettingsTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="mb-6"
            />

            <AnimatePresence mode="wait">
              {activeTab === "chat" || activeTab === "kernel" ? (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest mb-3">
                      {t.selectProvider || "Select Provider"}
                    </h3>
                    <ProviderSelector
                      providers={providers}
                      selectedProvider={currentConfig.aiProvider}
                      onSelectProvider={handleProviderChange}
                    />
                  </div>

                  <ModelConfig
                    provider={currentConfig.aiProvider}
                    config={{
                      aiModel: currentConfig.aiModel,
                      apiKey: currentConfig.apiKey,
                      localUrl: currentConfig.localUrl,
                      localModelName: currentConfig.localModelName,
                      customKey: currentConfig.customKey,
                      customUrl: currentConfig.customUrl,
                    }}
                    onChange={handleModelConfigChange}
                    t={t}
                  />
                </motion.div>
              ) : activeTab === "mcp" ? (
                <motion.div
                  key="mcp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest mb-3">
                      MCP Tools
                    </h3>
                    <p className="text-sm text-dash-text-muted">
                      MCP (Model Context Protocol) tools allow the AI to interact with external services and APIs.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-dash-border">
            <div className="flex items-center gap-4">
              <LanguageSelector
                currentLang={lang}
                onLanguageChange={onLanguageChange}
                t={t}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-dash-text-muted hover:text-dash-text-primary transition-colors"
              >
                {t.cancel || "Cancel"}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-dash-accent text-white rounded hover:bg-dash-accent/90 transition-colors"
              >
                {t.save || "Save"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
