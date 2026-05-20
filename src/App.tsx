import { useState, useEffect, useRef } from "react";
import { Settings as SettingsIcon, Cpu, Compass, Search, Brain, Zap, Shield, Undo2, Redo2, Lightbulb, Hammer, Loader2, Square, Eye } from "lucide-react";
import { TRANSLATIONS } from "./i18n";
import { ChatContainer } from "./components/chat/ChatContainer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { useSettings } from "./hooks/useSettings";
import { useChat } from "./hooks/useChat";
import { useMemory } from "./hooks/useMemory";
import { useChanges } from "./hooks/useChanges";
import { usePermissions } from "./hooks/usePermissions";
import { useAgentLoop } from "./hooks/useAgentLoop";
import { useBrowserStatus } from "./hooks/useBrowserStatus";
import { cn } from "./utils/cn";
import type { AgentId } from "./types/settings";
import type { Message } from "./types/chat";
import { PermissionDialog } from "./components/chat/PermissionDialog";
import GamerStatusBar from "./components/dashboard/GamerStatusBar";
import { completeTask, commitCode } from "./server/gamerState";

const AGENT_CONFIG: Record<AgentId, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  build: { label: "BUILD", icon: Cpu, color: "text-dash-accent" },
  general: { label: "GENERAL", icon: Brain, color: "text-blue-400" },
  explore: { label: "EXPLORE", icon: Search, color: "text-green-400" },
  scout: { label: "SCOUT", icon: Compass, color: "text-yellow-400" },
  prometheus: { label: "PLAN", icon: Zap, color: "text-purple-400" },
  hephaestus: { label: "EXECUTE", icon: Shield, color: "text-red-400" },
};

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState("");
  const ALL_LANGS = ["en", "ru", "es", "zh", "de", "fr", "pt", "it", "ja", "ko", "ar", "tr", "pl", "uk", "vi", "hi"] as const;
  type Lang = (typeof ALL_LANGS)[number];
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("cvr_lang");
    return saved && (ALL_LANGS as readonly string[]).includes(saved) ? (saved as Lang) : "en";
  });

  const { settings, updateChatConfig, toggleAutonomous, updateAutoLoopDelay, toggleAutoCommit, toggleVoiceEnabled, setVoiceLanguage, toggleVoiceAutoSend } = useSettings();
  const { state: agentState, isRunning: isAgentRunning, startLoop, abortLoop } = useAgentLoop();
  const { messages, isLoading, sendMessage, cancelMessage, addMessage, deleteMessage } = useChat(settings.chat);
  const { memories } = useMemory();
  const { undo, redo, canUndo, canRedo } = useChanges();
  const { pending, approve, deny } = usePermissions();
  const { isActive: isBrowserActive } = useBrowserStatus();

  const handleModeToggle = () => {
    const modes: Array<"build" | "plan" | "review"> = ["build", "plan", "review"];
    const currentIndex = modes.indexOf(settings.chat.mode || "build");
    const newMode = modes[(currentIndex + 1) % modes.length]!;
    updateChatConfig({ mode: newMode });
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleSendMessage = async (images?: string[]) => {
    if (!input.trim() && (!images || images.length === 0)) return;

    // Handle undo/redo commands directly
    const trimmed = input.trim();
    if (trimmed === "/undo") {
      const result = await undo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `↶ Undone: ${result.restored?.description || "last change"}`
          : `Undo failed: ${result.error}`,
        timestamp: Date.now(),
      } as Message);
      setInput("");
      return;
    }
    if (trimmed === "/redo") {
      const result = await redo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `↷ Redone: ${result.restored?.description || "last change"}`
          : `Redo failed: ${result.error}`,
        timestamp: Date.now(),
      } as Message);
      setInput("");
      return;
    }
    if (trimmed.startsWith("/review")) {
      setInput("");
      // Show loading indicator
      const loadingId = crypto.randomUUID();
      addMessage({
        id: loadingId,
        role: "assistant",
        content: "🔍 Analyzing code changes for review...",
        timestamp: Date.now(),
      } as Message);
      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: settings.chat }),
        });
        const reviewData = await response.json();
        // Replace loading message with review result
        deleteMessage(loadingId);
        addMessage({
          id: crypto.randomUUID(),
          role: "review",
          content: reviewData.summary || "Code review completed.",
          timestamp: Date.now(),
          reviewData: {
            summary: reviewData.summary || "",
            comments: reviewData.comments || [],
          },
        } as Message);
      } catch (err: any) {
        deleteMessage(loadingId);
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Review failed: ${err.message}`,
          timestamp: Date.now(),
        } as Message);
      }
      return;
    }

    const result = await sendMessage(input, images);
    setInput("");

    if (result?.continueNeeded && settings.isAutonomous) {
      startLoop(input, settings.chat.aiProvider, settings.chat.aiModel);
    }
  };

  const handleCancelMessage = () => {
    cancelMessage();
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleSaveSettings = (chatConfig: any) => {
    updateChatConfig(chatConfig);
  };

  const handleLanguageChange = (newLang: string) => {
    if ((ALL_LANGS as readonly string[]).includes(newLang)) {
      setLang(newLang as Lang);
      localStorage.setItem("cvr_lang", newLang);
    }
  };

  const handleAgentChange = (agent: AgentId) => {
    updateChatConfig({ agent });
  };

  // Auto-commit after successful agent loop
  const prevAgentRunningRef = useRef(false);
  useEffect(() => {
    if (prevAgentRunningRef.current && !isAgentRunning && agentState?.status === "completed") {
      completeTask();
      if (settings.autoCommit) {
        const message = `Auto-commit: Agent loop completed — ${agentState.goal.slice(0, 50)}`;
        fetch("/api/git/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }).then(async (res) => {
          const result = await res.json();
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.success
              ? `✓ Auto-committed: ${result.output || "Changes committed"}`
              : `Auto-commit failed: ${result.error || "Unknown error"}`,
            timestamp: Date.now(),
          } as Message);
          if (result.success) commitCode();
        }).catch((err) => {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Auto-commit failed: ${err.message}`,
            timestamp: Date.now(),
          } as Message);
        });
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Agent loop completed. Use the Git panel to commit changes.`,
          timestamp: Date.now(),
        } as Message);
      }
    }
    prevAgentRunningRef.current = isAgentRunning;
  }, [isAgentRunning, agentState, settings.autoCommit, addMessage]);

  const activeAgent = settings.chat.agent || "build";
  const agentConfig = AGENT_CONFIG[activeAgent];

  const [skillsCount, setSkillsCount] = useState(0);
  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills && Array.isArray(data.skills)) setSkillsCount(data.skills.length);
      })
      .catch(() => {});
  }, []);

  const toolsCount = 3;
  const memoryCount = memories.length;

  return (
    <div className="h-screen w-screen bg-dash-bg text-dash-text-primary overflow-hidden flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3 py-1 bg-dash-elevated border-b border-dash-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono text-dash-text-primary font-bold tracking-wide">
            cvr.name<span className="text-dash-accent">.coder</span>
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-dash-success animate-pulse" />
            Online
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* Agent Selector */}
          <div className="hidden md:flex items-center gap-1">
            <select
              value={activeAgent}
              onChange={(e) => handleAgentChange(e.target.value as AgentId)}
              className="bg-transparent text-[11px] font-mono uppercase tracking-wider border-none focus:ring-0 cursor-pointer hover:text-dash-accent transition-colors text-dash-text-muted"
              title={t.agentSelect || "Select Agent"}
            >
              {(Object.keys(AGENT_CONFIG) as AgentId[]).map((id) => (
                <option key={id} value={id} className="bg-dash-bg text-dash-text-primary">
                  {AGENT_CONFIG[id].label}
                </option>
              ))}
            </select>
            <span className={agentConfig.color}>
              <agentConfig.icon className="w-3 h-3" />
            </span>
          </div>
          {/* Mode Toggle */}
          <button
            onClick={handleModeToggle}
            className={cn(
              "hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border",
              settings.chat.mode === "plan"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : settings.chat.mode === "review"
                ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}
            title={
              settings.chat.mode === "plan"
                ? t.planMode || "Plan Mode"
                : settings.chat.mode === "review"
                ? (t as any).reviewMode || "Review Mode"
                : t.buildMode || "Build Mode"
            }
          >
            {settings.chat.mode === "plan" ? (
              <>
                <Lightbulb className="w-3 h-3" /> PLAN
              </>
            ) : settings.chat.mode === "review" ? (
              <>
                <Eye className="w-3 h-3" /> REVIEW
              </>
            ) : (
              <>
                <Hammer className="w-3 h-3" /> BUILD
              </>
            )}
          </button>

          {/* Undo/Redo */}
          <div className="hidden md:flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.undo || "Undo"}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
              title={t.redo || "Redo"}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-dash-text-muted">
            <span className="flex items-center gap-1 opacity-70">
              <span className="w-2 h-2 bg-dash-success rounded-full" aria-hidden="true" /> {t.engineStable}
            </span>
            <span className="flex items-center gap-1 opacity-70">
              <span className="w-2 h-2 bg-dash-accent rounded-full" aria-hidden="true" /> {memories.length}
            </span>
          </div>

          <GamerStatusBar />
          {isBrowserActive && (
            <span className="hidden sm:inline-flex text-[9px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              BROWSER
            </span>
          )}
          {settings.isAutonomous && (
            <span className="hidden sm:inline-flex text-[9px] font-mono text-dash-success bg-dash-success/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {t.autonomyForce || "AUTO"}
            </span>
          )}
          {isAgentRunning && (
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-dash-accent bg-dash-accent/10 px-2 py-0.5 rounded uppercase tracking-wider">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>AGENT {agentState ? `${agentState.currentStep}/${agentState.maxSteps}` : ""}</span>
              <button
                onClick={abortLoop}
                className="ml-1 hover:text-red-400 transition-colors"
                title="Abort loop"
              >
                <Square className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatContainer
            messages={messages}
            input={input}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onCancelMessage={handleCancelMessage}
            isLooming={isLoading}
            agentLabel={AGENT_CONFIG[activeAgent]?.label}
            t={t}
            lang={lang}
            loadingText={t.processing}
            placeholder={t.promptPlaceholder}
            voiceEnabled={settings.voiceEnabled}
            voiceLanguage={settings.voiceLanguage}
            voiceAutoSend={settings.voiceAutoSend}
            visionEnabled={settings.chat.visionEnabled ?? true}
          />
        </div>

        {/* Resources — bottom bar */}
        <div className="shrink-0 border-t border-dash-border bg-dash-surface px-4 py-1.5">
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <div className="text-[11px] font-bold font-mono text-dash-text-primary">{skillsCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Skills</div>
            </div>
            <div>
              <div className="text-[11px] font-bold font-mono text-dash-text-primary">{toolsCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Tools</div>
            </div>
            <div>
              <div className="text-[11px] font-bold font-mono text-dash-text-primary">{memoryCount}</div>
              <div className="text-[9px] font-mono text-dash-text-muted">Memory</div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={settings.chat}
        kernelConfig={settings.chat}
        presets={settings.presets}
        isAutonomous={settings.isAutonomous}
        autoLoopDelay={settings.autoLoopDelay}
        autoCommit={settings.autoCommit}
        voiceEnabled={settings.voiceEnabled}
        voiceLanguage={settings.voiceLanguage}
        voiceAutoSend={settings.voiceAutoSend}
        onSave={handleSaveSettings}
        onPresetSave={(preset) => console.log("Save preset:", preset)}
        onPresetApply={(preset) => console.log("Apply preset:", preset)}
        onPresetDelete={(id) => console.log("Delete preset:", id)}
        onToggleAutonomous={toggleAutonomous}
        onToggleAutoCommit={toggleAutoCommit}
        onChangeAutoLoopDelay={updateAutoLoopDelay}
        onLanguageChange={handleLanguageChange}
        onToggleVoiceEnabled={toggleVoiceEnabled}
        onChangeVoiceLanguage={setVoiceLanguage}
        onToggleVoiceAutoSend={toggleVoiceAutoSend}
        t={t}
        lang={lang}
      />

      {/* Permission Dialog */}
      <PermissionDialog pending={pending} onApprove={approve} onDeny={deny} />
    </div>
  );
}
