import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "../useChat";
import type { ChatConfig } from "../../types/chat";

global.fetch = vi.fn();

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
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\" world\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

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
    const mockStream = new ReadableStream({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
          controller.close();
        }, 1000);
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

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
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

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
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

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
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

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

    const mockStream = new ReadableStream({
      start(controller) {
        callCount++;
        controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Response\"}\n\n"));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
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

    expect(result.current.messages).toHaveLength(2);
  });

  it("should set isStreaming during message send", async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        setTimeout(() => {
          controller.enqueue(new TextEncoder().encode("data: {\"content\":\"Hello\"}\n\n"));
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        }, 100);
      },
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockStream.getReader(),
      },
    });

    const { result } = renderHook(() => useChat(mockConfig));

    act(() => {
      result.current.sendMessage("Test message");
    });

    expect(result.current.isStreaming).toBe(true);

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });
  });
});
