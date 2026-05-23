import { useState, useEffect, useRef, useCallback } from "react";
import { useSettings } from "./useSettings";
import { useChat } from "./useChat";
import { useMemory } from "./useMemory";
import { useChanges } from "./useChanges";
import { usePermissions } from "./usePermissions";
import { useAgentLoop } from "./useAgentLoop";
import { useBrowserStatus } from "./useBrowserStatus";
import { useGoal } from "./useGoal";
import type { Message } from "../types/chat";
import { completeTask, commitCode } from "../server/gamerState";
import { parseGoalCommand } from "../utils/commands";
import { TRANSLATIONS } from "../i18n";

const ALL_LANGS = ["en", "ru", "es", "zh", "de", "fr", "pt", "it", "ja", "ko", "ar", "tr", "pl", "uk", "vi", "hi"] as const;
type Lang = (typeof ALL_LANGS)[number];

export function useAppState() {
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
  const { messages, isLoading, error: chatError, sendMessage, cancelMessage, addMessage, deleteMessage, clearHistory } = useChat(settings.chat);
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
    const currentInput = input;
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
  }, [sendMessage, settings, startLoop, undo, redo, addMessage, deleteMessage, tt, input]);

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
      }
    }
    prevAgentRunningRef.current = isAgentRunning;
  }, [isAgentRunning, agentState, settings.autoCommit, addMessage]);

  const activeAgent = settings.chat.agent || "build";

  const [skillsCount, setSkillsCount] = useState(0);
  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills && Array.isArray(data.skills)) {
          setSkillsCount(data.skills.length);
        }
      })
      .catch(() => {});
  }, []);

  const toolsCount = 3;
  const memoryCount = memories.length;
  const agentsCount = 6;

  return {
    showSettings,
    setShowSettings,
    sidebarOpen,
    setSidebarOpen,
    input,
    setInput,
    lang,
    setLang,
    settings,
    settingsLoading,
    updateChatConfig,
    toggleAutonomous,
    updateAutoLoopDelay,
    toggleAutoCommit,
    toggleVoiceEnabled,
    setVoiceLanguage,
    toggleVoiceAutoSend,
    setLanguage,
    agentState,
    isAgentRunning,
    startLoop,
    abortLoop,
    messages,
    isLoading,
    chatError,
    sendMessage,
    cancelMessage,
    clearHistory,
    addMessage,
    deleteMessage,
    memories,
    undo,
    redo,
    canUndo,
    canRedo,
    pending,
    approve,
    deny,
    isBrowserActive,
    goalState,
    events,
    startGoal,
    abortGoal,
    handleModeToggle,
    t,
    tt,
    handleSendMessage,
    handleCancelMessage,
    activeAgent,
    skillsCount,
    toolsCount,
    memoryCount,
    agentsCount,
    ALL_LANGS,
  };
}
