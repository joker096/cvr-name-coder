import { Suspense, lazy } from "react";
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
        agentStep={s.agentState ? `${s.agentState.currentStep}/${s.agentState.maxSteps}` : undefined}
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
        {s.sidebarOpen && (
          <LeftPanel
            skillsCount={s.skillsCount}
            toolsCount={s.toolsCount}
            memoryCount={s.memoryCount}
            agentsCount={s.agentsCount}
            t={t}
          />
        )}

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
              <ChatContainer
                messages={s.messages}
                input={s.input}
                onInputChange={s.setInput}
                onSendMessage={s.handleSendMessage}
                onCancelMessage={s.handleCancelMessage}
                isLooming={s.isLoading}
                agentLabel="BUILD"
                providerLabel={s.settings.chat.aiProvider}
                modelName={s.settings.chat.aiModel}
                t={t}
                lang={s.lang}
                loadingText={t.processing}
                placeholder={t.promptPlaceholder}
                voiceEnabled={s.settings.voiceEnabled}
                voiceLanguage={s.settings.voiceLanguage}
                voiceAutoSend={s.settings.voiceAutoSend}
                visionEnabled={s.settings.chat.visionEnabled ?? true}
              />
            </div>
          )}
        </main>
      </div>

      <Suspense fallback={null}>
        {s.showSettings && (
          <SettingsModal
            isOpen={s.showSettings}
            onClose={() => s.setShowSettings(false)}
            config={s.settings.chat}
            presets={s.settings.presets}
            isAutonomous={s.settings.isAutonomous}
            autoLoopDelay={s.settings.autoLoopDelay}
            autoCommit={s.settings.autoCommit}
            voiceEnabled={s.settings.voiceEnabled}
            voiceLanguage={s.settings.voiceLanguage}
            voiceAutoSend={s.settings.voiceAutoSend}
            onSave={(cfg) => s.updateChatConfig(cfg)}
            onPresetSave={() => {}}
            onPresetApply={() => {}}
            onPresetDelete={() => {}}
            onToggleAutonomous={s.toggleAutonomous}
            onToggleAutoCommit={s.toggleAutoCommit}
            onChangeAutoLoopDelay={s.updateAutoLoopDelay}
            onLanguageChange={(newLang) => {
              if ((s.ALL_LANGS as readonly string[]).includes(newLang)) {
                s.setLang(newLang as typeof s.ALL_LANGS[number]);
                localStorage.setItem("cvr_lang", newLang);
                s.setLanguage(newLang as "en" | "ru");
              }
            }}
            onToggleVoiceEnabled={s.toggleVoiceEnabled}
            onChangeVoiceLanguage={s.setVoiceLanguage}
            onToggleVoiceAutoSend={s.toggleVoiceAutoSend}
            t={t}
            lang={s.lang}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <PermissionDialog pending={s.pending} onApprove={s.approve} onDeny={s.deny} t={t} />
      </Suspense>
    </div>
  );
}
