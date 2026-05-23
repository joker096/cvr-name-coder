import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { SettingsTabs } from "./SettingsTabs";
import { AIEngineTab } from "./AIEngineTab";
import { GlobalSettingsSection } from "./GlobalSettingsSection";
import { VoiceSettingsSection } from "./VoiceSettingsSection";
import { DesignSystemsTab } from "./DesignSystemsTab";
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
  const tabs = [
    { id: "chat" as const, label: t.chatEngine || "AI Engine" },
    { id: "design" as const, label: "Design" },
    { id: "mcp" as const, label: "MCP" },
  ];

  return (
    <div className="p-3 overflow-y-auto max-h-[calc(90vh-120px)]">
      <SettingsTabs tabs={tabs} activeTab={activeTab as any} onTabChange={setActiveTab as any} className="mb-4" />
      <AnimatePresence mode="wait">
        {activeTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <AIEngineTab
              engineType="chat"
              providers={providers}
              currentConfig={config}
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
              keyValidation={keyValidations.find(kv => kv.provider === config.aiProvider) || null}
              isValidating={isValidating}
              onPresetSave={onPresetSave}
              onPresetApply={onPresetApply}
              onPresetDelete={onPresetDelete}
              t={t}
            />
          </motion.div>
        )}
        {activeTab === "design" && (
          <motion.div
            key="design"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <DesignSystemsTab />
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
              <p className="text-xs text-dash-text-muted mb-3 leading-relaxed">
                MCP (Model Context Protocol) tools allow the AI to interact with external services and APIs.
              </p>
              
              <div className="p-3 bg-dash-accent/5 border border-dash-accent/20 rounded-md">
                <h4 className="text-xs font-medium text-dash-text-primary mb-2">{t.howToAddMcp || "How to add MCP servers"}</h4>
                <ol className="text-[11px] text-dash-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>{t.mcpStep1 || "Create a <code>mcp-servers.json</code> file in the cvr.name extension storage"}</li>
                  <li>{t.mcpStep2 || "Add server entries with <code>name</code>, <code>command</code>, <code>args</code>:"}</li>
                </ol>
                <pre className="mt-2 p-2 bg-dash-bg border border-dash-border rounded text-[10px] text-dash-text-muted font-mono overflow-x-auto">
{`[
  {
    "name": "my-server",
    "command": "npx",
    "args": ["-y", "@scope/mcp-server"],
    "env": { "API_KEY": "..." }
  }
]`}
                </pre>
                <p className="text-[11px] text-dash-text-muted mt-2 leading-relaxed">
                  {t.mcpStep3 || "Use <code>POST /api/mcp-config</code> to apply, or restart the extension."}
                </p>
              </div>

              <div className="p-3 bg-dash-accent/5 border border-dash-accent/20 rounded-md mt-3">
                <h4 className="text-xs font-medium text-dash-text-primary mb-2">{t.mcpServerOutbound || "Expose cvr.name as MCP server"}</h4>
                <p className="text-[11px] text-dash-text-muted leading-relaxed">
                  {t.mcpOutboundDesc || "Edit <code>.cvr/mcp.json</code> to control the outbound MCP server that lets other tools (Claude Desktop, Cursor) use cvr.name:"}
                </p>
                <pre className="mt-2 p-2 bg-dash-bg border border-dash-border rounded text-[10px] text-dash-text-muted font-mono overflow-x-auto">
{`{
  "enabled": true,
  "transport": "sse",
  "basePath": "/mcp"
}`}
                </pre>
              </div>

              <div className="p-3 border border-dash-border rounded-md mt-3">
                <h4 className="text-xs font-medium text-dash-text-primary mb-1.5">{t.mcpEndpoints || "API Endpoints"}</h4>
                <div className="space-y-1 text-[10px] font-mono text-dash-text-muted">
                  <div><span className="text-green-400">GET</span> /api/mcp-config — {t.mcpGetConfig || "List servers & tools"}</div>
                  <div><span className="text-yellow-400">POST</span> /api/mcp-config — {t.mcpSetConfig || "Update server config"}</div>
                  <div><span className="text-yellow-400">POST</span> /api/mcp-call — {t.mcpCallTool || "Call tool by name"}</div>
                  <div><span className="text-yellow-400">POST</span> /api/mcp-refresh — {t.mcpRefresh || "Restart all servers"}</div>
                </div>
              </div>
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
