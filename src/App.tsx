import { useState, useEffect, useRef, useCallback } from "react";
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
import type { Message } from "./types/chat";
import { PermissionDialog } from "./components/chat/PermissionDialog";
import { LeftPanel } from "./components/sidebar/LeftPanel";
import { AppHeader } from "./components/layout/AppHeader";
import { completeTask, commitCode } from "./server/gamerState";
import { useGoal } from "./hooks/useGoal";
import { GoalPanel } from "./components/goal/GoalPanel";
import { parseGoalCommand } from "./utils/commands";

const ALL_LANGS = ["en", "ru", "es", "zh", "de", "fr", "pt", "it", "ja", "ko", "ar", "tr", "pl", "uk", "vi", "hi"] as const;
type Lang = (typeof ALL_LANGS)[number];

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("cvr_lang");
    return saved && (ALL_LANGS as readonly string[]).includes(saved) ? (saved as Lang) : "en";
  });

  const { settings, isLoading: settingsLoading, updateChatConfig, toggleAutonomous, updateAutoLoopDelay, toggleAutoCommit, toggleVoiceEnabled, setVoiceLanguage, toggleVoiceAutoSend, setLanguage } = useSettings();
  const { state: agentState, isRunning: isAgentRunning, startLoop, abortLoop } = useAgentLoop();
  const { messages, isLoading, sendMessage, cancelMessage, addMessage, deleteMessage } = useChat(settings.chat);
  const { memories } = useMemory();
  const { undo, redo, canUndo, canRedo } = useChanges();
  const { pending, approve, deny } = usePermissions();
  const { isActive: isBrowserActive } = useBrowserStatus();
  const { goalState, events, startGoal, abortGoal } = useGoal();

  useEffect(() => {
    if (!settingsLoading && settings.lang && (ALL_LANGS as readonly string[]).includes(settings.lang)) {
      setLang(settings.lang as Lang);
    }
  }, [settingsLoading, settings.lang]);

  const handleModeToggle = () => {
    const modes: Array<"build" | "plan" | "review"> = ["build", "plan", "review"];
    const currentIndex = modes.indexOf(settings.chat.mode || "build");
    const newMode = modes[(currentIndex + 1) % modes.length]!;
    updateChatConfig({ mode: newMode });
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const tt = t as Record<string, string>;

  const handleSendMessage = useCallback(async (images?: string[]) => {
    const currentInput = inputRef.current;
    if (!currentInput.trim() && (!images || images.length === 0)) return;

    const trimmed = currentInput.trim();
    if (trimmed === "/undo") {
      const result = await undo();
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.success
          ? `${tt.undoSuccess || "Undone"}: ${result.restored?.description || "last change"}`
          : `${tt.undoFailed || "Undo failed"}: ${result.error}`,
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
          ? `${tt.redoSuccess || "Redone"}: ${result.restored?.description || "last change"}`
          : `${tt.redoFailed || "Redo failed"}: ${result.error}`,
        timestamp: Date.now(),
      } as Message);
      setInput("");
      return;
    }
    const goalParse = parseGoalCommand(currentInput);
    if (goalParse) {
      setInput("");
      await startGoal(goalParse.goal, goalParse.successCriteria, settings.chat);
      return;
    }

    if (trimmed.startsWith("/review")) {
      setInput("");
      const loadingId = crypto.randomUUID();
      addMessage({
        id: loadingId,
        role: "assistant",
        content: tt.analyzingCode || "🔍 Analyzing code changes for review...",
        timestamp: Date.now(),
      } as Message);
      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: settings.chat }),
        });
        const reviewData = await response.json();
        deleteMessage(loadingId);
        addMessage({
          id: crypto.randomUUID(),
          role: "review",
          content: reviewData.summary || tt.codeReviewCompleted || "Code review completed.",
          timestamp: Date.now(),
          reviewData: {
            summary: reviewData.summary || "",
            comments: reviewData.comments || [],
          },
        } as Message);
      } catch (err: unknown) {
        const error = err as Error;
        deleteMessage(loadingId);
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${tt.reviewFailed || "Review failed"}: ${error.message}`,
          timestamp: Date.now(),
        } as Message);
      }
      return;
    }

    const result = await sendMessage(currentInput, images);
    setInput("");

    if (result?.continueNeeded && settings.isAutonomous) {
      startLoop(currentInput, settings.chat.aiProvider, settings.chat.aiModel);
    }
  }, [sendMessage, settings, startLoop, undo, redo, addMessage, deleteMessage, tt]);

  const handleCancelMessage = useCallback(() => {
    cancelMessage();
  }, [cancelMessage]);

  // Auto-commit after successful agent loop
  const prevAgentRunningRef = useRef(false);
  useEffect(() => {
    if (prevAgentRunningRef.current && !isAgentRunning && agentState?.status === "completed") {
      completeTask();
      if (settings.autoCommit) {
        const message = `${tt.autoCommitMsg || "Auto-commit: Agent loop completed"} — ${agentState.goal.slice(0, 50)}`;
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
              ? `✓ ${tt.changesCommitted || "Changes committed"}: ${result.output || ""}`
              : `${tt.commitFailed || "Auto-commit failed"}: ${result.error || tt.commitError || "Unknown error"}`,
            timestamp: Date.now(),
          } as Message);
          if (result.success) commitCode();
        }).catch((err: Error) => {
          addMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: `${tt.commitFailed || "Auto-commit failed"}: ${err.message}`,
            timestamp: Date.now(),
          } as Message);
        });
      } else {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: tt.loopCompleted || "Agent loop completed. Use the Git panel to commit changes.",
          timestamp: Date.now(),
        } as Message);
      }
    }
    prevAgentRunningRef.current = isAgentRunning;
  }, [isAgentRunning, agentState, settings.autoCommit, addMessage]);

  const activeAgent = settings.chat.agent || "build";

  const [skillsCount, setSkillsCount] = useState(0);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills && Array.isArray(data.skills)) {
          setSkillsCount(data.skills.length);
          setSkillsList(data.skills.map((s: Record<string, unknown>) => typeof s === "string" ? s : (s.name || s.id || s.title || "")));
        }
      })
      .catch(() => {});
  }, []);

  const toolsCount = 3;
  const memoryCount = memories.length;
  const agentsCount = 6;

  return (
    <div className="h-screen w-screen bg-dash-bg text-dash-text-primary overflow-hidden flex flex-col">
      <AppHeader
        activeAgent={activeAgent}
        mode={settings.chat.mode || "build"}
        isAutonomous={settings.isAutonomous}
        isAgentRunning={isAgentRunning}
        isBrowserActive={isBrowserActive}
        canUndo={canUndo}
        canRedo={canRedo}
        sidebarOpen={sidebarOpen}
        agentStep={agentState ? `${agentState.currentStep}/${agentState.maxSteps}` : undefined}
        onAgentChange={(agent) => updateChatConfig({ agent })}
        onModeToggle={handleModeToggle}
        onUndo={undo}
        onRedo={redo}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={() => setShowSettings(true)}
        onAbortLoop={abortLoop}
        t={t}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <LeftPanel
            skillsCount={skillsCount}
            skillsList={skillsList}
            toolsCount={toolsCount}
            memoryCount={memoryCount}
            agentsCount={agentsCount}
            t={t}
          />
        )}

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {goalState ? (
            <GoalPanel
              goalState={goalState}
              events={events}
              onAbort={abortGoal}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatContainer
                messages={messages}
                input={input}
                onInputChange={setInput}
                onSendMessage={handleSendMessage}
                onCancelMessage={handleCancelMessage}
                isLooming={isLoading}
                agentLabel="BUILD"
                providerLabel={settings.chat.aiProvider}
                modelName={settings.chat.aiModel}
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
          )}
        </main>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={settings.chat}
        presets={settings.presets}
        isAutonomous={settings.isAutonomous}
        autoLoopDelay={settings.autoLoopDelay}
        autoCommit={settings.autoCommit}
        voiceEnabled={settings.voiceEnabled}
        voiceLanguage={settings.voiceLanguage}
        voiceAutoSend={settings.voiceAutoSend}
        onSave={(cfg) => updateChatConfig(cfg)}
        onPresetSave={() => {}}
        onPresetApply={() => {}}
        onPresetDelete={() => {}}
        onToggleAutonomous={toggleAutonomous}
        onToggleAutoCommit={toggleAutoCommit}
        onChangeAutoLoopDelay={updateAutoLoopDelay}
        onLanguageChange={(newLang) => {
          if ((ALL_LANGS as readonly string[]).includes(newLang)) {
            setLang(newLang as Lang);
            localStorage.setItem("cvr_lang", newLang);
            setLanguage(newLang as "en" | "ru");
          }
        }}
        onToggleVoiceEnabled={toggleVoiceEnabled}
        onChangeVoiceLanguage={setVoiceLanguage}
        onToggleVoiceAutoSend={toggleVoiceAutoSend}
        t={t}
        lang={lang}
      />

      <PermissionDialog pending={pending} onApprove={approve} onDeny={deny} t={t} />
    </div>
  );
}
