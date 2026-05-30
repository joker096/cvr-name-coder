import { Suspense, lazy, useMemo } from "react";
import { ChatContainer } from "./components/chat/ChatContainer";
import { useAppState } from "./hooks/useAppState";
import { LeftPanel } from "./components/sidebar/LeftPanel";
import { AppHeader } from "./components/layout/AppHeader";
import { LoadingSpinner } from "./components/shared/LoadingSpinner";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal").then(m => ({ default: m.SettingsModal })));
const GoalPanel = lazy(() => import("./components/goal/GoalPanel").then(m => ({ default: m.GoalPanel })));
const PermissionDialog = lazy(() => import("./components/chat/PermissionDialog").then(m => ({ default: m.PermissionDialog })));

export default function App() {
  const s = useAppState();
  const t = s.t;

  const displayedModelName = useMemo(() => {
    return s.settings.chat.aiProvider === "local"
      ? (s.settings.chat.localModelName || s.settings.chat.aiModel)
      : s.settings.chat.aiModel;
  }, [s.settings.chat.aiProvider, s.settings.chat.aiModel, s.settings.chat.localModelName]);

  const agentStep = useMemo(() => 
    s.agentState ? `${s.agentState.currentStep}/${s.agentState.maxSteps}` : undefined,
    [s.agentState]
  );

  const chatContainerProps = useMemo(() => ({
    messages: s.messages,
    input: s.input,
    onInputChange: s.setInput,
    onSendMessage: s.handleSendMessage,
    onCancelMessage: s.handleCancelMessage,
    isLooming: s.isLoading,
    error: s.chatError,
    agentLabel: "BUILD",
    providerLabel: s.settings.chat.aiProvider,
    modelName: displayedModelName,
    t,
    lang: s.lang,
    loadingText: t.processing,
    placeholder: t.promptPlaceholder,
    voiceEnabled: s.settings.voiceEnabled,
    voiceLanguage: s.settings.voiceLanguage,
    voiceAutoSend: s.settings.voiceAutoSend,
    visionEnabled: s.settings.chat.visionEnabled ?? true,
  }), [s.messages, s.input, s.setInput, s.handleSendMessage, s.handleCancelMessage, s.isLoading, s.chatError, s.settings.chat.aiProvider, displayedModelName, s.settings.chat.visionEnabled, s.settings.voiceEnabled, s.settings.voiceLanguage, s.settings.voiceAutoSend, t, s.lang, t.processing, t.promptPlaceholder]);

  const settingsModalProps = useMemo(() => ({
    isOpen: s.showSettings,
    onClose: () => s.setShowSettings(false),
    config: s.settings.chat,
    presets: s.settings.presets,
    isAutonomous: s.settings.isAutonomous,
    autoLoopDelay: s.settings.autoLoopDelay,
    autoCommit: s.settings.autoCommit,
    voiceEnabled: s.settings.voiceEnabled,
    voiceLanguage: s.settings.voiceLanguage,
    voiceAutoSend: s.settings.voiceAutoSend,
    onSave: (cfg: any) => s.updateChatConfig(cfg),
    onPresetSave: (preset: any) => s.addPreset(preset),
    onPresetApply: (preset: any) => s.loadPreset(preset.id),
    onPresetDelete: (id: string) => s.deletePreset(id),
    onToggleAutonomous: s.toggleAutonomous,
    onToggleAutoCommit: s.toggleAutoCommit,
    onChangeAutoLoopDelay: s.updateAutoLoopDelay,
    onLanguageChange: (newLang: string) => {
      if ((s.ALL_LANGS as readonly string[]).includes(newLang)) {
        s.setLang(newLang as typeof s.ALL_LANGS[number]);
        s.setLanguage(newLang as "en" | "ru");
      }
    },
    onToggleVoiceEnabled: s.toggleVoiceEnabled,
    onChangeVoiceLanguage: s.setVoiceLanguage,
    onToggleVoiceAutoSend: s.toggleVoiceAutoSend,
    t,
    lang: s.lang,
  }), [s.showSettings, s.settings.chat, s.settings.presets, s.settings.isAutonomous, s.settings.autoLoopDelay, s.settings.autoCommit, s.settings.voiceEnabled, s.settings.voiceLanguage, s.settings.voiceAutoSend, s.updateChatConfig, s.addPreset, s.loadPreset, s.deletePreset, s.toggleAutonomous, s.toggleAutoCommit, s.updateAutoLoopDelay, s.setLang, s.setLanguage, s.toggleVoiceEnabled, s.setVoiceLanguage, s.toggleVoiceAutoSend, t, s.lang, s.ALL_LANGS]);

  return (
    <div className="h-screen w-screen bg-dash-bg text-dash-text-primary overflow-hidden flex flex-col">
      <AppHeader
        activeAgent={s.activeAgent}
        mode={s.settings.chat.mode || "build"}
        isAutonomous={s.settings.isAutonomous}
        isAgentRunning={s.isAgentRunning}
        isBrowserActive={s.isBrowserActive}
        canUndo={s.canUndo}
        canRedo={s.canRedo}
        sidebarOpen={s.sidebarOpen}
        agentStep={agentStep}
        onAgentChange={(agent) => s.updateChatConfig({ agent })}
        onModeToggle={s.handleModeToggle}
        onUndo={s.undo}
        onRedo={s.redo}
        onToggleSidebar={() => s.setSidebarOpen(!s.sidebarOpen)}
        onOpenSettings={() => s.setShowSettings(true)}
        onAbortLoop={s.abortLoop}
        onClearChat={s.clearHistory}
        t={t}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className={s.sidebarOpen ? "" : "hidden"}>
          <LeftPanel
            skillsCount={s.skillsCount}
            toolsCount={s.toolsCount}
            memoryCount={s.memoryCount}
            agentsCount={s.agentsCount}
            t={t}
            isVisible={s.sidebarOpen}
          />
        </div>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {s.goalState ? (
            <Suspense fallback={<LoadingSpinner />}>
              <GoalPanel
                goalState={s.goalState}
                events={s.events}
                onAbort={s.abortGoal}
              />
            </Suspense>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatContainer {...chatContainerProps} />
            </div>
          )}
        </main>
      </div>

      <Suspense fallback={null}>
        {s.showSettings && <SettingsModal {...settingsModalProps} />}
      </Suspense>

      <Suspense fallback={null}>
        <PermissionDialog pending={s.pending} onApprove={s.approve} onDeny={s.deny} t={t} />
      </Suspense>
    </div>
  );
}
