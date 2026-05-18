import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Cpu, Compass, Search, Brain, Zap, Shield } from "lucide-react";
import { cn } from "../../utils/cn";
import { SettingsTabs, type SettingsTab } from "./SettingsTabs";
import { ProviderSelector, type Provider } from "./ProviderSelector";
import { ModelConfig, type ModelConfig as ModelConfigType } from "./ModelConfig";
import { LanguageSelector } from "./LanguageSelector";
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
  onPresetSave?: (preset: any) => void;
  onPresetApply?: (preset: any) => void;
  onPresetDelete?: (id: string) => void;
  onToggleAutonomous?: () => void;
  onToggleAutoCommit?: () => void;
  onChangeAutoLoopDelay?: (delay: number) => void;
  onLanguageChange?: (lang: string) => void;
  onToggleVoiceEnabled?: () => void;
  onChangeVoiceLanguage?: (lang: string) => void;
  onToggleVoiceAutoSend?: () => void;
  t: any;
  lang?: string;
  className?: string;
}

const AGENT_OPTIONS: { id: AgentId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "build", label: "BUILD", icon: Cpu },
  { id: "general", label: "GENERAL", icon: Brain },
  { id: "explore", label: "EXPLORE", icon: Search },
  { id: "scout", label: "SCOUT", icon: Compass },
  { id: "prometheus", label: "PROMETHEUS", icon: Zap },
  { id: "hephaestus", label: "HEPHAESTUS", icon: Shield },
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
  t,
  lang = "en",
  className,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("chat");
  const [localConfig, setLocalConfig] = useState<ChatConfig>(config);
  const [localKernelConfig, setLocalKernelConfig] = useState<ChatConfig>(kernelConfig);
  const { getModelsForProvider } = useAIProviders();

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

  const handleAgentChange = (agent: AgentId) => {
    setCurrentConfig((prev) => ({ ...prev, agent }));
  };

  const handleTemperatureChange = (temp: number) => {
    setCurrentConfig((prev) => ({ ...prev, temperature: temp }));
  };

  const handleMaxTokensChange = (tokens: number) => {
    setCurrentConfig((prev) => ({ ...prev, maxTokens: tokens }));
  };

  const handleSystemPromptChange = (prompt: string) => {
    setCurrentConfig((prev) => ({ ...prev, systemPrompt: prompt }));
  };

  const handleVisionToggle = () => {
    setCurrentConfig((prev) => ({ ...prev, visionEnabled: !prev.visionEnabled }));
  };

  const handleMaxImageSizeChange = (size: number) => {
    setCurrentConfig((prev) => ({ ...prev, maxImageSize: size }));
  };

  const providers: Provider[] = [
    { id: toChatProviderId("gemini"), icon: { type: "lucide", name: "sparkles" }, label: t.cloudGemini || "Google Gemini", type: "cloud" },
    { id: toChatProviderId("openai"), icon: { type: "lucide", name: "bot" }, label: t.openaiProvider || "OpenAI", type: "cloud" },
    { id: toChatProviderId("anthropic"), icon: { type: "lucide", name: "brain" }, label: t.anthropicProvider || "Anthropic", type: "cloud" },
    { id: toChatProviderId("deepseek"), icon: { type: "lucide", name: "search" }, label: t.deepseekProvider || "DeepSeek", type: "cloud" },
    { id: toChatProviderId("grok"), icon: { type: "lucide", name: "zap" }, label: t.grokProvider || "Grok", type: "cloud" },
    { id: toChatProviderId("groq"), icon: { type: "lucide", name: "cpu" }, label: "Groq", type: "cloud" },
    { id: toChatProviderId("baseten"), icon: { type: "lucide", name: "box" }, label: t.basetenProvider || "Baseten", type: "cloud" },
    { id: toChatProviderId("openrouter"), icon: { type: "lucide", name: "router" }, label: t.openrouterProvider || "OpenRouter", type: "cloud" },
    { id: toChatProviderId("together"), icon: { type: "lucide", name: "users" }, label: t.togetherProvider || "Together AI", type: "cloud" },
    { id: toChatProviderId("mistral"), icon: { type: "lucide", name: "wind" }, label: t.mistralProvider || "Mistral AI", type: "cloud" },
    { id: toChatProviderId("local"), icon: { type: "lucide", name: "server" }, label: t.localModel || "Local", type: "local" },
    { id: toChatProviderId("custom"), icon: { type: "lucide", name: "settings" }, label: t.customProvider || "Custom", type: "cloud" },
  ];

  const tabs = [
    { id: "chat" as const, label: t.chatEngine || "Chat AI" },
    { id: "kernel" as const, label: t.kernelEngine || "Agent AI" },
    { id: "mcp" as const, label: "MCP" },
  ];

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
          className={cn("bg-dash-bg border border-dash-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dash-border">
            <h2 className="text-lg font-bold text-dash-text-primary">{t.settings || "Settings"}</h2>
            <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} className="mb-6" />

            <AnimatePresence mode="wait">
              {activeTab === "chat" || activeTab === "kernel" ? (
                <motion.div key={activeTab} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest mb-3">{t.selectProvider || "Select Provider"}</h3>
                    <ProviderSelector providers={providers} selectedProvider={currentConfig.aiProvider} onSelectProvider={handleProviderChange} />
                  </div>

                  {/* Model Config */}
                  <ModelConfig
                    provider={currentConfig.aiProvider}
                    config={{
                      aiModel: currentConfig.aiModel ?? "",
                      localUrl: currentConfig.localUrl ?? "",
                      localModelName: currentConfig.localModelName ?? "",
                      customUrl: currentConfig.customUrl ?? "",
                    }}
                    models={getModelsForProvider(currentConfig.aiProvider)}
                    engineType={activeTab === "chat" ? "chat" : "kernel"}
                    onChange={handleModelConfigChange}
                    t={t}
                  />

                  {/* Agent Settings */}
                  <div className="space-y-3 pt-4 border-t border-dash-border">
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.agentSettings || "Agent Settings"}</h3>
                    <div>
                      <label className="block text-sm font-medium text-dash-text-primary mb-2">{t.activeAgent || "Active Agent"}</label>
                      <select
                        value={currentConfig.agent || "build"}
                        onChange={(e) => handleAgentChange(e.target.value as AgentId)}
                        className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
                      >
                        {AGENT_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Generation Parameters */}
                  <div className="space-y-3 pt-4 border-t border-dash-border">
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.generationParams || "Generation Parameters"}</h3>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-dash-text-primary">{t.temperature || "Temperature"}</label>
                        <span className="text-[11px] font-mono text-dash-accent">{currentConfig.temperature ?? 0.7}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.1}
                        value={currentConfig.temperature ?? 0.7}
                        onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                        className="w-full accent-dash-accent"
                      />
                      <div className="flex justify-between text-[9px] text-dash-text-muted mt-1">
                        <span>Precise (0)</span>
                        <span>Balanced (0.7)</span>
                        <span>Creative (2)</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dash-text-primary mb-2">{t.maxTokens || "Max Tokens"}</label>
                      <input
                        type="number"
                        min={256}
                        max={32768}
                        step={256}
                        value={currentConfig.maxTokens ?? 4096}
                        onChange={(e) => handleMaxTokensChange(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
                      />
                    </div>
                  </div>

                  {/* Vision Settings */}
                  <div className="space-y-3 pt-4 border-t border-dash-border">
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.visionSettings || "Vision Settings"}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-dash-text-primary">{t.visionEnabled || "Enable Vision"}</div>
                        <div className="text-[11px] text-dash-text-muted">{t.visionEnabledDesc || "Allow image upload and vision model usage"}</div>
                      </div>
                      <button
                        onClick={handleVisionToggle}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          currentConfig.visionEnabled ? "bg-dash-accent" : "bg-neutral-700"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                            currentConfig.visionEnabled ? "translate-x-5" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                    {currentConfig.visionEnabled && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-dash-text-primary">{t.maxImageSize || "Max Image Size"}</label>
                          <span className="text-[11px] font-mono text-dash-accent">{currentConfig.maxImageSize ?? 1024}px</span>
                        </div>
                        <input
                          type="range"
                          min={512}
                          max={2048}
                          step={128}
                          value={currentConfig.maxImageSize ?? 1024}
                          onChange={(e) => handleMaxImageSizeChange(parseInt(e.target.value))}
                          className="w-full accent-dash-accent"
                        />
                        <div className="flex justify-between text-[9px] text-dash-text-muted mt-1">
                          <span>Small (512px)</span>
                          <span>Medium (1024px)</span>
                          <span>Large (2048px)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-3 pt-4 border-t border-dash-border">
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.systemPrompt || "System Prompt / Persona"}</h3>
                    <textarea
                      value={currentConfig.systemPrompt || ""}
                      onChange={(e) => handleSystemPromptChange(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary placeholder-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm resize-none"
                      placeholder={t.systemPromptPlaceholder || "Enter a custom system prompt to define AI behavior and persona..."}
                    />
                  </div>
                </motion.div>
              ) : activeTab === "mcp" ? (
                <motion.div key="mcp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest mb-3">MCP Tools</h3>
                    <p className="text-sm text-dash-text-muted">MCP (Model Context Protocol) tools allow the AI to interact with external services and APIs.</p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Global Settings */}
            <div className="mt-6 pt-4 border-t border-dash-border space-y-4">
              <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.globalSettings || "Global Settings"}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-dash-text-primary">{t.autonomousMode || "Autonomous Mode"}</div>
                  <div className="text-[11px] text-dash-text-muted">{t.autonomousDesc || "Allow AI to trigger itself for multi-step tasks"}</div>
                </div>
                <button
                  onClick={onToggleAutonomous}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    isAutonomous ? "bg-dash-accent" : "bg-neutral-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      isAutonomous ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-dash-text-primary">{t.autoCommit || "Auto-Commit"}</div>
                  <div className="text-[11px] text-dash-text-muted">{t.autoCommitDesc || "Automatically commit changes after successful agent loop"}</div>
                </div>
                <button
                  onClick={onToggleAutoCommit}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    autoCommit ? "bg-dash-accent" : "bg-neutral-700"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      autoCommit ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-dash-text-primary">{t.autoLoopDelay || "Auto-Loop Delay"}</div>
                    <div className="text-[11px] text-dash-text-muted">{t.autoLoopDelayDesc || "Delay between autonomous iterations (ms)"}</div>
                  </div>
                  <span className="text-[11px] font-mono text-dash-accent">{autoLoopDelay}ms</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={500}
                  value={autoLoopDelay}
                  onChange={(e) => onChangeAutoLoopDelay?.(parseInt(e.target.value))}
                  className="w-full accent-dash-accent"
                />
                <div className="flex justify-between text-[9px] text-dash-text-muted mt-1">
                  <span>Fast (500ms)</span>
                  <span>Normal (2000ms)</span>
                  <span>Slow (10s)</span>
                </div>
              </div>

              {/* Voice Input Settings */}
              <div className="pt-4 border-t border-dash-border space-y-4">
                <h3 className="text-sm font-bold text-dash-text-muted uppercase tracking-widest">{t.voiceSettings || "Voice Input"}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-dash-text-primary">{t.voiceEnabled || "Enable Voice Input"}</div>
                    <div className="text-[11px] text-dash-text-muted">{t.voiceEnabledDesc || "Show microphone button in chat input"}</div>
                  </div>
                  <button
                    onClick={onToggleVoiceEnabled}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      voiceEnabled ? "bg-dash-accent" : "bg-neutral-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                        voiceEnabled ? "translate-x-5" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
                {voiceEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dash-text-primary mb-2">{t.voiceLanguage || "Speech Recognition Language"}</label>
                      <select
                        value={voiceLanguage}
                        onChange={(e) => onChangeVoiceLanguage?.(e.target.value)}
                        className="w-full px-3 py-2 bg-dash-bg border border-dash-border rounded text-dash-text-primary focus:outline-none focus:ring-2 focus:ring-dash-accent text-sm"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="ru-RU">Russian</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                        <option value="it-IT">Italian</option>
                        <option value="pt-BR">Portuguese (Brazil)</option>
                        <option value="ja-JP">Japanese</option>
                        <option value="ko-KR">Korean</option>
                        <option value="zh-CN">Chinese (Simplified)</option>
                        <option value="ar-SA">Arabic</option>
                        <option value="tr-TR">Turkish</option>
                        <option value="pl-PL">Polish</option>
                        <option value="uk-UA">Ukrainian</option>
                        <option value="vi-VN">Vietnamese</option>
                        <option value="hi-IN">Hindi</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-dash-text-primary">{t.voiceAutoSend || "Auto-Send After Silence"}</div>
                        <div className="text-[11px] text-dash-text-muted">{t.voiceAutoSendDesc || "Automatically send message after detecting silence"}</div>
                      </div>
                      <button
                        onClick={onToggleVoiceAutoSend}
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          voiceAutoSend ? "bg-dash-accent" : "bg-neutral-700"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                            voiceAutoSend ? "translate-x-5" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-dash-border">
            <div className="flex items-center gap-4">
              <LanguageSelector currentLang={lang} onLanguageChange={onLanguageChange ?? (() => {})} t={t} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-dash-text-muted hover:text-dash-text-primary transition-colors">{t.cancel || "Cancel"}</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-dash-accent text-white rounded hover:bg-dash-accent/90 transition-colors">{t.save || "Save"}</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
