import { useState, useCallback, useRef, useEffect } from "react";
import type { Message } from "../types/chat";
import type { ChatConfig } from "../types/settings";
import type { ToolCall } from "../types/tools";
import { toMessageId } from "../types/ai";
import { parseCommand, getCommandPrompt, getCommandAgent } from "../utils/commands";
import type { HistoryEntry } from "../types/api";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
}

interface MessagesMap {
  [id: string]: Message;
}

const LOCAL_MESSAGES_KEY = "cvr_chat_messages";
const LOCAL_SAVE_DEBOUNCE_MS = 2000;

function messagesToMap(msgs: Message[]): MessagesMap {
  const map: MessagesMap = {};
  for (const m of msgs) {
    map[m.id] = m;
  }
  return map;
}

function loadStoredMessages(): Message[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const seen = new Set<string>();
  const merged: Message[] = [];

  for (const message of [...incoming, ...existing]) {
    const key = `${message.role}:${message.timestamp}:${message.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(message);
  }

  return merged.sort((a, b) => a.timestamp - b.timestamp);
}

function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /<tool_call>\s*<name>(\w+)<\/name>\s*<params>([\s\S]*?)<\/params>\s*<\/tool_call>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    try {
      const name = match[1] as ToolCall["name"];
      const paramStr = match[2];
      if (!paramStr) continue;
      const params = JSON.parse(paramStr.trim());
      calls.push({ name, params });
    } catch {
      // skip malformed tool calls
    }
  }
  return calls;
}

const SSE_BATCH_MS = 50;

export const useChat = (config: ChatConfig) => {
  const [state, setState] = useState<ChatState>({
    messages: loadStoredMessages(),
    isLoading: false,
    error: null,
    isStreaming: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const configRef = useRef(config);
  configRef.current = config;
  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;
  const messagesMapRef = useRef<MessagesMap>(messagesToMap(state.messages));
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistMessages = useCallback((msgs: Message[]) => {
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
    }
    localSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
      } catch {
        // Ignore storage failures
      }
      localSaveTimerRef.current = null;
    }, LOCAL_SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const response = await fetch("/api/history");
        if (!response.ok) return;
        const data = await response.json() as { history?: HistoryEntry[] };
        if (cancelled || !Array.isArray(data.history) || data.history.length === 0) {
          return;
        }

        const hydratedMessages: Message[] = data.history.map((entry, index) => ({
          id: toMessageId(`history-${index}-${crypto.randomUUID()}`),
          role: entry.role,
          content: entry.content,
          images: entry.images,
          timestamp: entry.createdAt ? new Date(entry.createdAt).getTime() : Date.now() + index,
        }));

        setState((prev) => {
          const nextMessages = prev.messages.length > 0
            ? mergeMessages(prev.messages, hydratedMessages)
            : hydratedMessages;
          messagesMapRef.current = messagesToMap(nextMessages);
          return { ...prev, messages: nextMessages };
        });
      } catch {
        // Keep chat usable even if persisted history fails to load.
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistMessages(state.messages);
  }, [state.messages, persistMessages]);

  const sendMessage = useCallback(async (content: string, images?: string[]): Promise<{ content: string; continueNeeded: boolean } | null> => {
    if (!content.trim() && (!images || images.length === 0)) {
      return null;
    }

    // Parse slash commands
    const { command, args } = parseCommand(content);
    const agent = command ? getCommandAgent(command) : undefined;
    const messageContent = command ? getCommandPrompt(command, args) : content;

    const userMessage: Message = {
      id: toMessageId(crypto.randomUUID()),
      role: "user",
      content,
      ...(images ? { images } : {}),
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          message: messageContent,
          images,
          config: configRef.current,
          agent,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      if (isJson) {
        const data = await response.json() as { content?: string; reasoning?: string; continueNeeded?: boolean; tokenUsage?: { input: number; output: number } };
        const assistantMessage: Message = {
          id: toMessageId(crypto.randomUUID()),
          role: "assistant",
          content: data.content || "",
          reasoning: data.reasoning ?? undefined,
          timestamp: Date.now(),
          ...(data.tokenUsage ? { tokenUsage: data.tokenUsage } : {}),
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          isStreaming: false,
        }));
        return { content: assistantMessage.content, continueNeeded: !!data.continueNeeded };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const assistantMessage: Message = {
        id: toMessageId(crypto.randomUUID()),
        role: "assistant",
        content: "",
        reasoning: undefined,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isStreaming: true,
      }));

      const msgId = assistantMessage.id;

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullReasoning = "";
      let continueNeeded = false;
      let batchedToken = "";
      let lastBatchTime = 0;
      let batchTimer: ReturnType<typeof setTimeout> | null = null;

      const flushBatch = () => {
        if (batchedToken) {
          const token = batchedToken;
          batchedToken = "";
          setState((prev) => ({
            ...prev,
            messages: prev.messages.map((msg) =>
              msg.id === msgId
                ? { ...msg, content: msg.content + token }
                : msg
            ),
          }));
        }
      };

      let streamDone = false;

      const processLines = (lines: string[]) => {
        for (const line of lines) {
          if (streamDone) break;
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") {
            streamDone = true;
            continue;
          }

          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            if (typeof parsed === "string") {
              fullContent += parsed;
              batchedToken += parsed;
              const now = Date.now();
              if (now - lastBatchTime >= SSE_BATCH_MS) {
                flushBatch();
                lastBatchTime = now;
              } else if (!batchTimer) {
                batchTimer = setTimeout(() => {
                  flushBatch();
                  lastBatchTime = Date.now();
                  batchTimer = null;
                }, SSE_BATCH_MS - (now - lastBatchTime));
              }
            } else if (parsed.error) {
              const errStr = `\n\n⚠ ${parsed.error}`;
              fullContent += errStr;
              flushBatch();
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === msgId
                    ? { ...msg, content: msg.content + errStr }
                    : msg
                ),
              }));
            } else if (parsed.reasoning && typeof parsed.reasoning === "string") {
              fullReasoning += parsed.reasoning;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === msgId
                    ? { ...msg, reasoning: (msg.reasoning || "") + parsed.reasoning }
                    : msg
                ),
              }));
            } else if (parsed.content && typeof parsed.content === "string") {
              fullContent += parsed.content;
              batchedToken += parsed.content;
              const now = Date.now();
              if (now - lastBatchTime >= SSE_BATCH_MS) {
                flushBatch();
                lastBatchTime = now;
              } else if (!batchTimer) {
                batchTimer = setTimeout(() => {
                  flushBatch();
                  lastBatchTime = Date.now();
                  batchTimer = null;
                }, SSE_BATCH_MS - (now - lastBatchTime));
              }
            } else if (parsed.done) {
              continueNeeded = !!parsed.continueNeeded;
              if (parsed.tokenUsage) {
                const usage = parsed.tokenUsage as { input: number; output: number };
                flushBatch();
                setState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === msgId
                      ? { ...msg, tokenUsage: { input: usage.input, output: usage.output } }
                      : msg
                  ),
                }));
              }
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer before exiting
          if (buffer.trim()) {
            const lines = buffer.split("\n");
            buffer = "";
            processLines(lines);
          }
          flushBatch();
          if (batchTimer) clearTimeout(batchTimer);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        processLines(lines);

        if (streamDone) {
          flushBatch();
          if (batchTimer) clearTimeout(batchTimer);
          // Drain any remaining data from reader to prevent resource leak
          while (!(await reader.read()).done) {}
          break;
        }
      }

      if (!continueNeeded) {
        continueNeeded = fullContent.includes("CONTINUE_NEEDED");
      }

      if (!fullContent.trim()) {
        fullContent = "⚠ No response received from AI provider. Check your API key and model configuration in Settings.";
        setState((prev) => ({
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === msgId
              ? { ...msg, content: fullContent }
              : msg
          ),
        }));
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));

      return { content: fullContent, continueNeeded };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
        }));
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: errorMessage,
        }));
      }
      return null;
    }
  }, []);

  const cancelMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      isStreaming: false,
    });
  }, []);

  const deleteMessage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== id),
    }));
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }));
  }, []);

  const retryMessage = useCallback(async (id: string) => {
    const currentMessages = messagesRef.current;
    const messageIndex = currentMessages.findIndex((msg) => msg.id === id);
    if (messageIndex === -1) {
      return;
    }

    const previousMessages = currentMessages.slice(0, messageIndex);
    setState((prev) => ({
      ...prev,
      messages: previousMessages,
    }));

    const lastUserMessage = previousMessages
      .filter((msg) => msg.role === "user")
      .pop();

    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content, lastUserMessage.images);
    }
  }, [sendMessage]);

  const executeToolCalls = useCallback(async (messageId: string, mode: "plan" | "build" | "review" = "build") => {
    const message = messagesRef.current.find((m) => m.id === messageId);
    if (!message || message.role !== "assistant") return;

    const toolCalls = parseToolCalls(message.content);
    if (toolCalls.length === 0) return;

    const results: string[] = [];
    for (const toolCall of toolCalls) {
      try {
        const response = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolCall, mode }),
        });
        const result = await response.json();
        results.push(`Tool: ${toolCall.name}\nSuccess: ${result.success}\nOutput: ${result.output}${result.error ? "\nError: " + result.error : ""}`);
      } catch (err: any) {
        results.push(`Tool: ${toolCall.name}\nError: ${err.message}`);
      }
    }

    const toolMessage: Message = {
      id: toMessageId(crypto.randomUUID()),
      role: "assistant",
      content: `[TOOL_RESULTS]\n${results.join("\n---\n")}`,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, toolMessage],
    }));
  }, []);

  const addMessage = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isStreaming: state.isStreaming,
    sendMessage,
    cancelMessage,
    clearHistory,
    deleteMessage,
    updateMessage,
    retryMessage,
    executeToolCalls,
    addMessage,
    setMessages: (messages: Message[]) => {
      messagesMapRef.current = messagesToMap(messages);
      setState((prev) => ({ ...prev, messages }));
    },
  };
};
