import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoiceInput } from "../../../hooks/useVoiceInput";

describe("useVoiceInput", () => {
  let mockRecognition: {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
    onstart: ((ev: Event) => void) | null;
    onresult: ((ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((ev: Event) => void) | null;
  };

  const createMockRecognition = () => ({
    continuous: false,
    interimResults: false,
    lang: "",
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
  });

  beforeEach(() => {
    mockRecognition = createMockRecognition();
    const MockSpeechRecognition = vi.fn(function () {
      return mockRecognition;
    }) as unknown as typeof window.SpeechRecognition;
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should indicate not supported when SpeechRecognition is unavailable", () => {
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;

    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    expect(result.current.isSupported).toBe(false);
  });

  it("should indicate supported when SpeechRecognition is available", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    expect(result.current.isSupported).toBe(true);
  });

  it("should start listening when startListening is called", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognition.start).toHaveBeenCalled();
    expect(mockRecognition.lang).toBe("en-US");
    expect(mockRecognition.continuous).toBe(true);
    expect(mockRecognition.interimResults).toBe(true);
  });

  it("should set isListening to true when recognition starts", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition start
    act(() => {
      mockRecognition.onstart?.(new Event("start"));
    });

    expect(result.current.isListening).toBe(true);
  });

  it("should call onTranscript with final results", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    act(() => {
      result.current.startListening();
    });

    const mockResultItem: SpeechRecognitionResult = {
      isFinal: true,
      length: 1,
      item: (i: number) => mockResultItem[i] ?? ({} as SpeechRecognitionAlternative),
      0: { transcript: "hello world", confidence: 0.95 } as SpeechRecognitionAlternative,
    };

    const mockResultList: SpeechRecognitionResultList = {
      length: 1,
      item: (i: number) => mockResultList[i] ?? ({} as SpeechRecognitionResult),
      0: mockResultItem,
    };

    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: mockResultList,
      } as unknown as SpeechRecognitionEvent);
    });

    expect(onTranscript).toHaveBeenCalledWith("hello world", true);
  });

  it("should stop listening when stopListening is called", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript }));

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockRecognition.onstart?.(new Event("start"));
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it("should handle not-allowed error", () => {
    const onTranscript = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript, onError }));

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockRecognition.onerror?.(new Event("error") as unknown as SpeechRecognitionErrorEvent);
      // @ts-expect-error Manually creating error event
      mockRecognition.onerror({ error: "not-allowed" } as unknown as SpeechRecognitionErrorEvent);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe("no-permission");
    expect(onError).toHaveBeenCalled();
  });

  it("should set language based on prop", () => {
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onTranscript, language: "ru-RU" }));

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognition.lang).toBe("ru-RU");
  });

  it("should call onSend when autoSend is enabled and silence detected", () => {
    vi.useFakeTimers();
    const onTranscript = vi.fn();
    const onSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInput({ onTranscript, onSend, autoSend: true })
    );

    act(() => {
      result.current.startListening();
    });

    const mockResultItem: SpeechRecognitionResult = {
      isFinal: true,
      length: 1,
      item: (i: number) => mockResultItem[i] ?? ({} as SpeechRecognitionAlternative),
      0: { transcript: "test", confidence: 0.95 } as SpeechRecognitionAlternative,
    };

    const mockResultList: SpeechRecognitionResultList = {
      length: 1,
      item: (i: number) => mockResultList[i] ?? ({} as SpeechRecognitionResult),
      0: mockResultItem,
    };

    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: mockResultList,
      } as unknown as SpeechRecognitionEvent);
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onSend).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
