import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettings } from "./useSettings";
import { storageService } from "./../services/storageService";

vi.mock("../../services/storageService");

describe("useSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load default settings when no saved settings exist", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.chat.aiProvider).toBe("gemini");
    expect(result.current.settings.chat.aiModel).toBe("gemini-2.5-pro");
    expect(result.current.settings.autoLoopDelay).toBe(2000);
    expect(result.current.settings.isAutonomous).toBe(true);
    expect(result.current.settings.lang).toBe("en");
  });

  it("should load saved settings when they exist", () => {
    const savedSettings = {
      chat: {
        aiProvider: "openai" as const,
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      presets: [],
      autoLoopDelay: 3000,
      isAutonomous: false,
      lang: "ru" as const,
    };
    (storageService.get as any).mockReturnValue(savedSettings);

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
    expect(result.current.settings.autoLoopDelay).toBe(3000);
    expect(result.current.settings.isAutonomous).toBe(false);
    expect(result.current.settings.lang).toBe("ru");
  });

  it("should update chat config", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateChatConfig({ aiProvider: "openai", aiModel: "gpt-4" });
    });

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should update auto loop delay", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateAutoLoopDelay(5000);
    });

    expect(result.current.settings.autoLoopDelay).toBe(5000);
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should toggle autonomous mode", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings.isAutonomous).toBe(true);

    act(() => {
      result.current.toggleAutonomous();
    });

    expect(result.current.settings.isAutonomous).toBe(false);
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should set language", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setLanguage("ru");
    });

    expect(result.current.settings.lang).toBe("ru");
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should add preset", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customKey: "",
          customUrl: "",
        },
      });
    });

    expect(result.current.settings.presets).toHaveLength(1);
    expect(result.current.settings.presets[0].name).toBe("Test Preset");
    expect(result.current.settings.presets[0].id).toMatch(/^preset_\d+$/);
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should update preset", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customKey: "",
          customUrl: "",
        },
      });

      result.current.updatePreset(preset.id, { name: "Updated Preset" });
    });

    expect(result.current.settings.presets[0].name).toBe("Updated Preset");
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should delete preset", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customKey: "",
          customUrl: "",
        },
      });

      result.current.deletePreset(preset.id);
    });

    expect(result.current.settings.presets).toHaveLength(0);
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should load preset", () => {
    (storageService.get as any).mockReturnValue(null);

    const { result } = renderHook(() => useSettings());

    act(() => {
      const preset = result.current.addPreset({
        name: "Test Preset",
        description: "Test description",
        config: {
          aiProvider: "openai" as const,
          aiModel: "gpt-4",
          localUrl: "",
          localModelName: "",
          customKey: "",
          customUrl: "",
        },
      });

      result.current.loadPreset(preset.id);
    });

    expect(result.current.settings.chat.aiProvider).toBe("openai");
    expect(result.current.settings.chat.aiModel).toBe("gpt-4");
    expect(storageService.set).toHaveBeenCalled();
  });

  it("should reset settings to defaults", () => {
    const savedSettings = {
      chat: {
        aiProvider: "openai" as const,
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      presets: [],
      autoLoopDelay: 3000,
      isAutonomous: false,
      lang: "ru" as const,
    };
    (storageService.get as any).mockReturnValue(savedSettings);

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.chat.aiProvider).toBe("gemini");
    expect(result.current.settings.chat.aiModel).toBe("gemini-2.5-pro");
    expect(result.current.settings.autoLoopDelay).toBe(2000);
    expect(result.current.settings.isAutonomous).toBe(true);
    expect(result.current.settings.lang).toBe("en");
    expect(storageService.set).toHaveBeenCalled();
  });
});
