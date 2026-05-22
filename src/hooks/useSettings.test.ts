import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSettings } from "./useSettings";
import { storageService } from "../services/storageService";

const DEFAULT_MODEL = "";

vi.mock("../services/storageService", () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockRejectedValue(new Error("no server"));
  });

  it("should load default settings when no saved settings exist", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.chat.aiProvider).toBe("");
    expect(result.current.settings.chat.aiModel).toBe(DEFAULT_MODEL);
    expect(result.current.settings.autoLoopDelay).toBe(2000);
    expect(result.current.settings.isAutonomous).toBe(true);
    expect(result.current.settings.lang).toBe("en");
  });

  it("should load saved settings from localStorage", async () => {
    const savedSettings = {
      chat: {
        aiProvider: "openai" as const,
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customUrl: "",
        apiKey: "",
        temperature: 0.5,
        maxTokens: 2048,
        systemPrompt: "",
        agent: "build" as const,
        visionEnabled: true,
        maxImageSize: 1024,
        multiModelEnabled: false,
        thinkingProvider: "gemini" as const,
        thinkingModel: "gemini-2.0-flash",
      },
      presets: [],
      autoLoopDelay: 3000,
      isAutonomous: false,
      autoCommit: false,
      lang: "ru",
      voiceEnabled: false,
      voiceLanguage: "en",
      voiceAutoSend: false,
    };
    vi.mocked(storageService.get).mockReturnValue(savedSettings);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
    expect(result.current.settings.autoLoopDelay).toBe(3000);
    expect(result.current.settings.isAutonomous).toBe(false);
    expect(result.current.settings.lang).toBe("ru");
  });

  it("should load settings from server if available", async () => {
    const serverSettings = {
      chat: {
        aiProvider: "anthropic",
        aiModel: "claude-sonnet-4-20250514",
        localUrl: "",
        localModelName: "",
        customUrl: "",
        apiKey: "",
        temperature: 0.3,
        maxTokens: 8192,
        systemPrompt: "",
        agent: "general",
        visionEnabled: false,
        maxImageSize: 2048,
        multiModelEnabled: true,
        thinkingProvider: "gemini",
        thinkingModel: "gemini-2.0-flash",
      },
      presets: [],
      autoLoopDelay: 5000,
      isAutonomous: true,
      autoCommit: true,
      lang: "de",
      voiceEnabled: true,
      voiceLanguage: "de-DE",
      voiceAutoSend: true,
    };
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(serverSettings),
    } as Response);
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.chat.aiProvider).toBe("anthropic");
    expect(result.current.settings.chat.aiModel).toBe("claude-sonnet-4-20250514");
    expect(result.current.settings.autoLoopDelay).toBe(5000);
    expect(result.current.settings.lang).toBe("de");
    expect(storageService.set).toHaveBeenCalledWith("cvr_settings", serverSettings);
  });

  it("should update chat config", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateChatConfig({ aiProvider: "openai", aiModel: "gpt-4" });
    });

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should update auto loop delay", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateAutoLoopDelay(5000);
    });

    expect(result.current.settings.autoLoopDelay).toBe(5000);
  });

  it("should toggle autonomous mode", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.isAutonomous).toBe(true);

    act(() => {
      result.current.toggleAutonomous();
    });

    expect(result.current.settings.isAutonomous).toBe(false);
  });

  it("should set language", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setLanguage("ru");
    });

    expect(result.current.settings.lang).toBe("ru");
  });

  it("should add preset", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customUrl: "",
          apiKey: "",
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: "",
          agent: "build" as const,
          visionEnabled: true,
          maxImageSize: 1024,
          multiModelEnabled: false,
          thinkingProvider: "gemini" as const,
          thinkingModel: "",
        },
      });
    });

    expect(result.current.settings.presets).toHaveLength(1);
    expect(result.current.settings.presets[0].name).toBe("Test Preset");
    expect(result.current.settings.presets[0].id).toMatch(/^preset_\d+$/);
  });

  it("should update preset", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let presetId: string;
    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customUrl: "",
          apiKey: "",
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: "",
          agent: "build" as const,
          visionEnabled: true,
          maxImageSize: 1024,
          multiModelEnabled: false,
          thinkingProvider: "gemini" as const,
          thinkingModel: "",
        },
      });
      presetId = preset.id;
    });

    act(() => {
      result.current.updatePreset(presetId!, { name: "Updated Preset" });
    });

    expect(result.current.settings.presets[0].name).toBe("Updated Preset");
  });

  it("should delete preset", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let presetId: string;
    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customUrl: "",
          apiKey: "",
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: "",
          agent: "build" as const,
          visionEnabled: true,
          maxImageSize: 1024,
          multiModelEnabled: false,
          thinkingProvider: "gemini" as const,
          thinkingModel: "",
        },
      });
      presetId = preset.id;
    });

    act(() => {
      result.current.deletePreset(presetId!);
    });

    expect(result.current.settings.presets).toHaveLength(0);
  });

  it("should load preset", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let presetId: string;
    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customUrl: "",
          apiKey: "",
          temperature: 0.7,
          maxTokens: 4096,
          systemPrompt: "",
          agent: "build" as const,
          visionEnabled: true,
          maxImageSize: 1024,
          multiModelEnabled: false,
          thinkingProvider: "gemini" as const,
          thinkingModel: "",
        },
      });
      presetId = preset.id;
    });

    act(() => {
      result.current.loadPreset(presetId!);
    });

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
  });

  it("should reset settings to defaults", async () => {
    const savedSettings = {
      chat: { aiProvider: "openai" as const, aiModel: "gpt-4", localUrl: "", localModelName: "", customUrl: "", apiKey: "", temperature: 0.7, maxTokens: 4096, systemPrompt: "", agent: "build" as const, visionEnabled: true, maxImageSize: 1024, multiModelEnabled: false, thinkingProvider: "gemini" as const, thinkingModel: "" },
      presets: [],
      autoLoopDelay: 3000,
      isAutonomous: false,
      autoCommit: false,
      lang: "ru",
      voiceEnabled: false,
      voiceLanguage: "en",
      voiceAutoSend: false,
    };
    vi.mocked(storageService.get).mockReturnValue(savedSettings);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.chat.aiProvider).toBe("");
    expect(result.current.settings.chat.aiModel).toBe(DEFAULT_MODEL);
    expect(result.current.settings.autoLoopDelay).toBe(2000);
    expect(result.current.settings.isAutonomous).toBe(true);
    expect(result.current.settings.lang).toBe("en");
  });

  it("should persist settings to server on change", async () => {
    vi.mocked(storageService.get).mockReturnValue(null);
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve({ saved: true }) } as Response);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateChatConfig({ aiModel: "gpt-4" });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/settings",
      expect.objectContaining({ method: "POST" })
    );
  });
});
