import { useState } from "react";
import { Menu, Settings as SettingsIcon, X, Cpu, Compass, Search, Brain, Zap, Shield, Undo2, Redo2, Lightbulb, Hammer, Loader2, Square } from "lucide-react";
import { TRANSLATIONS } from "./i18n";
import { ChatContainer } from "./components/chat/ChatContainer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { Sidebar } from "./components/sidebar/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { useChat } from "./hooks/useChat";
import { useMemory } from "./hooks/useMemory";
import { useChanges } from "./hooks/useChanges";
import { usePermissions } from "./hooks/usePermissions";
import { useAgentLoop } from "./hooks/useAgentLoop";
import { cn } from "./utils/cn";
import type { Skill } from "./components/sidebar/SkillsPanel";
import type { AgentId } from "./types/settings";
import type { Message } from "./types/chat";
import { PermissionDialog } from "./components/chat/PermissionDialog";

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
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"memory" | "skills">("memory");
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<"en" | "ru" | "es" | "zh" | "de" | "fr" | "pt" | "it" | "ja" | "ko" | "ar" | "tr" | "pl" | "uk" | "vi" | "hi">(() => {
    const saved = localStorage.getItem("cvr_lang");
    const validLangs = ["en", "ru", "es", "zh", "de", "fr", "pt", "it", "ja", "ko", "ar", "tr", "pl", "uk", "vi", "hi"];
    return validLangs.includes(saved || "") ? (saved as any) : "en";
  });

  const { settings, updateChatConfig, toggleAutonomous, updateAutoLoopDelay } = useSettings();
  const { state: agentState, isRunning: isAgentRunning, startLoop, abortLoop } = useAgentLoop();
  const { messages, isLoading, sendMessage, cancelMessage, addMessage } = useChat(settings.chat);
  const { memories } = useMemory();
  const { undo, redo, canUndo, canRedo } = useChanges();
  const { pending, approve, deny } = usePermissions();

  const handleModeToggle = () => {
    const newMode = settings.chat.mode === "plan" ? "build" : "plan";
    updateChatConfig({ mode: newMode });
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleSendMessage = async () => {
    if (!input.trim()) return;

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

    const result = await sendMessage(input);
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
    setLang(newLang as any);
    localStorage.setItem("cvr_lang", newLang);
  };

  const handleAgentChange = (agent: AgentId) => {
    updateChatConfig({ agent });
  };

  const handleLearnSkill = (skillId: string) => {
    console.log("Learn skill:", skillId);
  };

  const activeAgent = settings.chat.agent || "build";
  const agentConfig = AGENT_CONFIG[activeAgent];

  const learnedSkills: Skill[] = [
    {
      id: "skill1",
      name: "Code Analysis",
      description: "Analyze code patterns",
      icon: SettingsIcon,
      status: "learned",
      category: "research",
    },
  ];

  const availableSkills: Skill[] = [
    {
      id: "skill2",
      name: "API Design",
      description: "Design REST APIs",
      icon: SettingsIcon,
      status: "available",
      category: "devops",
    },
  ];

  const skills = [...learnedSkills, ...availableSkills];

  return (
    <div className="h-screen w-screen bg-dash-bg text-dash-text-primary overflow-hidden flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between px-2 md:px-3 py-0.5 bg-dash-header border-b border-dash-border shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          {showSidebar && (
            <button
              onClick={() => setShowSidebar(false)}
              className="hidden md:block p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-dash-success animate-pulse" aria-hidden="true" />
              <span className="text-[11px] font-mono text-dash-text-muted uppercase tracking-wider">
                cvr
              </span>
            </div>
          </div>
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
          {/* Plan/Build Toggle */}
          <button
            onClick={handleModeToggle}
            className={cn(
              "hidden md:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all border",
              settings.chat.mode === "plan"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            )}
            title={settings.chat.mode === "plan" ? t.planMode || "Plan Mode" : t.buildMode || "Build Mode"}
          >
            {settings.chat.mode === "plan" ? (
              <>
                <Lightbulb className="w-3 h-3" /> PLAN
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
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          isOpen={showSidebar}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          memories={memories}
          skills={skills}
          onLearnSkill={handleLearnSkill}
          lang={lang}
          t={t}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
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
          />
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
        onSave={handleSaveSettings}
        onPresetSave={(preset) => console.log("Save preset:", preset)}
        onPresetApply={(preset) => console.log("Apply preset:", preset)}
        onPresetDelete={(id) => console.log("Delete preset:", id)}
        onToggleAutonomous={toggleAutonomous}
        onChangeAutoLoopDelay={updateAutoLoopDelay}
        onLanguageChange={handleLanguageChange}
        t={t}
        lang={lang}
      />

      {/* Permission Dialog */}
      <PermissionDialog pending={pending} onApprove={approve} onDeny={deny} />
    </div>
  );
}
