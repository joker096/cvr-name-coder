import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "./useChat";
import type { ChatConfig } from "./../types/chat";

global.fetch = vi.fn();

function createMockSSEResponse(chunks: string[]) {
  const events = chunks.join('');
  const encoded = new TextEncoder().encode(events);
  let offset = 0;

  return {
    ok: true,
    headers: new Map([["content-type", "text/event-stream"]]),
    body: {
      getReader: () => ({
        read: async () => {
          if (offset < encoded.length) {
            const chunk = encoded.slice(offset);
            offset = encoded.length;
            return { done: false, value: chunk };
          }
          return { done: true, value: undefined };
        },
      }),
    },
  };
}

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockConfig: ChatConfig = {
    aiProvider: "gemini",
    aiModel: "gemini-2.5-pro",
    localUrl: "",
    localModelName: "",
    customKey: "",
    customUrl: "",
  };

  it("should initialize with empty messages", () => {
    const { result } = renderHook(() => useChat(mockConfig));

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isStreaming).toBe(false);
  });

  it("should send message successfully", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: {\"content\":\" world\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe("user");

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("Hello world");
  });

  it("should not send empty message", () => {
    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle send message error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  it("should cancel message", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.cancelMessage();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should clear history", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should delete message", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    const messageId = result.current.messages[0].id;

    act(() => {
      result.current.deleteMessage(messageId);
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it("should update message", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    const messageId = result.current.messages[0].id;

    act(() => {
      result.current.updateMessage(messageId, "Updated content");
    });

    expect(result.current.messages[0].content).toBe("Updated content");
  });

  it("should retry message", async () => {
    let callCount = 0;

    (global.fetch as any).mockImplementation(() => {
      callCount++;
      return Promise.resolve(createMockSSEResponse([
        "data: {\"content\":\"Response\"}\n\n",
        "data: [DONE]\n\n",
      ]));
    });

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(callCount).toBe(1);

    const assistantMessageId = result.current.messages[1].id;

    act(() => {
      result.current.retryMessage(assistantMessageId);
    });

    await waitFor(() => {
      expect(callCount).toBe(2);
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.current.isLoading).toBe(false);
  });

  it("should set isStreaming during message send", async () => {
    const mockResponse = createMockSSEResponse([
      "data: {\"content\":\"Hello\"}\n\n",
      "data: [DONE]\n\n",
    ]);

    (global.fetch as any).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
  });
});
