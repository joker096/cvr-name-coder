import React from "react";
import { Settings as SettingsIcon, Undo2, Redo2, PanelLeft, Loader2, Square, Trash2 } from "lucide-react";
import type { AgentId } from "../../types/settings";
import { AgentSelector } from "./AgentSelector";

interface AppHeaderProps {
  activeAgent: AgentId;
  mode: "build" | "plan" | "review";
  isAutonomous: boolean;
  isAgentRunning: boolean;
  isBrowserActive: boolean;
  canUndo: boolean;
  canRedo: boolean;
  sidebarOpen: boolean;
  agentStep?: string | undefined;
  onAgentChange: (agent: AgentId) => void;
  onModeToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onAbortLoop: () => void;
  onClearChat: () => void;
  t: Record<string, string>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeAgent,
  mode: _mode,
  isAutonomous,
  isAgentRunning,
  isBrowserActive,
  canUndo,
  canRedo,
  sidebarOpen: _sidebarOpen,
  agentStep,
  onAgentChange,
  onModeToggle: _onModeToggle,
  onUndo,
  onRedo,
  onToggleSidebar,
  onOpenSettings,
  onAbortLoop,
  onClearChat,
  t,
}) => (
  <header className="flex items-center justify-between px-3 py-1 bg-dash-elevated border-b border-dash-border shrink-0">
    <div className="flex items-center gap-2">
      <span className="text-[12px] font-mono text-dash-text-primary font-bold tracking-wide">
        cvr.name<span className="text-green-500">.coder</span>
        <span className="text-[8px] text-dash-text-muted ml-1">v{__APP_VERSION__}</span>
      </span>
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      <AgentSelector
        activeAgent={activeAgent}
        onChange={onAgentChange}
        title={t.agentSelect || "Select Agent"}
      />

      <div className="hidden md:flex items-center gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title={t.undo || "Undo"}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
          title={t.redo || "Redo"}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={onToggleSidebar}
        className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
        title="Toggle sidebar"
      >
        <PanelLeft className="w-3.5 h-3.5" />
      </button>

      {isBrowserActive && (
        <span className="hidden sm:inline-flex text-[9px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
          {t.browse || "BROWSER"}
        </span>
      )}

      {isAutonomous && (
        <span className="hidden sm:inline-flex text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
          {t.autonomyForce || "AUTO"}
        </span>
      )}

      {isAgentRunning && (
        <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t.agentLabel || "AGENT"} {agentStep}</span>
          <button
            onClick={onAbortLoop}
            className="ml-1 hover:text-red-400 transition-colors"
            title={t.abortLoop || "Abort loop"}
          >
            <Square className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      <button
        onClick={onClearChat}
        className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted hover:text-red-400"
        title={t.clearChat || "Clear chat"}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onOpenSettings}
        className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
);
