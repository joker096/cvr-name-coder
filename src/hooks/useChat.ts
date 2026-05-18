import { useState, useCallback, useRef } from "react";
import type { Message } from "../types/chat";
import type { ChatConfig } from "../types/settings";
import type { ToolCall } from "../types/tools";
import { parseCommand, getCommandPrompt, getCommandAgent } from "../utils/commands";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
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

export const useChat = (config: ChatConfig) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    isStreaming: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string): Promise<{ content: string; continueNeeded: boolean } | null> => {
    if (!content.trim()) {
      return null;
    }

    // Parse slash commands
    const { command, args } = parseCommand(content);
    const agent = command ? getCommandAgent(command) : undefined;
    const messageContent = command ? getCommandPrompt(command, args) : content;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
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
        },
        body: JSON.stringify({
          message: messageContent,
          config,
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
        // Standalone server returns JSON
        const data = await response.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content || "",
          timestamp: Date.now(),
        };
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          isStreaming: false,
        }));
        return { content: assistantMessage.content, continueNeeded: !!data.continueNeeded };
      }

      // VS Code extension server returns SSE
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isStreaming: true,
      }));

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let continueNeeded = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (typeof parsed === "string") {
                fullContent += parsed;
                setState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: msg.content + parsed }
                      : msg
                  ),
                }));
              } else if (parsed.content) {
                fullContent += parsed.content;
                setState((prev) => ({
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  ),
                }));
              } else if (parsed.done) {
                continueNeeded = !!parsed.continueNeeded;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }

      if (!continueNeeded) {
        continueNeeded = fullContent.includes("CONTINUE_NEEDED");
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
  }, [config, state.messages]);

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
    const messageIndex = state.messages.findIndex((msg) => msg.id === id);
    if (messageIndex === -1) {
      return;
    }

    const previousMessages = state.messages.slice(0, messageIndex);
    setState((prev) => ({
      ...prev,
      messages: previousMessages,
    }));

    const lastUserMessage = previousMessages
      .filter((msg) => msg.role === "user")
      .pop();

    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  const executeToolCalls = useCallback(async (messageId: string, mode: "plan" | "build" = "build") => {
    const message = state.messages.find((m) => m.id === messageId);
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
      id: crypto.randomUUID(),
      role: "assistant",
      content: `[TOOL_RESULTS]\n${results.join("\n---\n")}`,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, toolMessage],
    }));
  }, [state.messages]);

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
  };
};
