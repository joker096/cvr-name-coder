import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";
import { ProviderSelector, type Provider } from "./ProviderSelector";
import { ModelConfig, type ModelConfig as ModelConfigType } from "./ModelConfig";
import { PresetManager } from "./PresetManager";
import { ValidationMessage } from "./ValidationMessage";
import type { ChatConfig, Preset } from "../../types/settings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ChatConfig;
  kernelConfig: ChatConfig;
  presets: Preset[];
  onSave: (config: ChatConfig, kernelConfig: ChatConfig) => void;
  onPresetSave: (preset: Omit<Preset, "id" | "createdAt">) => void;
  onPresetApply: (preset: Preset) => void;
  onPresetDelete: (id: string) => void;
  t: any;
  lang?: string;
  className?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  kernelConfig,
  presets,
  onSave,
  onPresetSave,
  onPresetApply,
  onPresetDelete,
  t,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("chat");
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);
  const [localKernelConfig, setLocalKernelConfig] = useState<ChatConfig>(kernelConfig);
  const [validationErrors] = useState<Record<string, string>>({});

  const currentConfig = activeTab === "chat" ? localConfig : localKernelConfig;
  const setCurrentConfig = activeTab === "chat" ? setLocalConfig : setLocalKernelConfig;

  const handleSave = () => {
    onSave(localConfig, localKernelConfig);
    onClose();
  };

  const handleProviderChange = (providerId: string) => {
    setCurrentConfig((prev) => ({
      ...prev,
      aiProvider: providerId as any,
    }));
  };

  const handleModelConfigChange = (modelConfig: Partial<ModelConfigType>) => {
    setCurrentConfig((prev) => ({
      ...prev,
      ...modelConfig,
    }));
  };

  const providers: Provider[] = [
    { id: "gemini", icon: () => <span className="text-2xl">⚙️</span>, label: t.cloudGemini || "Google Gemini" },
    { id: "openai", icon: () => <span className="text-2xl">⚡</span>, label: t.openaiProvider || "OpenAI" },
    { id: "anthropic", icon: () => <span className="text-2xl">🧠</span>, label: t.anthropicProvider || "Anthropic" },
    { id: "deepseek", icon: () => <span className="text-2xl">💻</span>, label: t.deepseekProvider || "DeepSeek" },
    { id: "grok", icon: () => <span className="text-2xl">🚀</span>, label: t.grokProvider || "Grok" },
    { id: "groq", icon: () => <span className="text-2xl">⚡</span>, label: "Groq" },
    { id: "local", icon: () => <span className="text-2xl">💻</span>, label: t.localModel || "Local" },
    { id: "custom", icon: () => <span className="text-2xl">🔧</span>, label: t.customProvider || "Custom" },
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                      apiKey: currentConfig.customKey,
                      baseUrl: currentConfig.customUrl,
                      localUrl: currentConfig.localUrl,
                      localModelName: currentConfig.localModelName,
                    }}
                    onChange={handleModelConfigChange}
                    t={t}
                  />

                  <PresetManager
                    presets={presets}
                    currentConfig={currentConfig}
                    onSavePreset={onPresetSave}
                    onApplyPreset={onPresetApply}
                    onDeletePreset={onPresetDelete}
                    t={t}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="mcp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="text-center py-8 text-dash-text-muted"
                >
                  <p>{t.mcpSettings || "MCP settings coming soon"}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {Object.keys(validationErrors).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <ValidationMessage
                    key={field}
                    type="error"
                    message={error}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-dash-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-dash-text-muted hover:text-white transition-colors"
            >
              {t.cancel || "Cancel"}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-dash-accent hover:bg-dash-accent/80 rounded text-sm font-bold text-white transition-colors"
            >
              {t.save || "Save"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
