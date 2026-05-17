import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePresets } from "../usePresets";
import { presetService } from "../../services/presetService";
import type { Preset } from "../../types/settings";

vi.mock("../../services/presetService");

describe("usePresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load presets on mount", async () => {
    const mockPresets: Preset[] = [
      {
        id: "preset1",
        name: "Preset 1",
        description: "Description 1",
        config: {
          aiProvider: "gemini",
          aiModel: "gemini-2.5-pro",
          localUrl: "",
          localModelName: "",
          customKey: "",
          customUrl: "",
        },
        createdAt: Date.now(),
      },
    ];
    (presetService.loadPresets as any).mockResolvedValue(mockPresets);

    const { result } = renderHook(() => usePresets());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.presets).toEqual(mockPresets);
    expect(presetService.loadPresets).toHaveBeenCalled();
  });

  it("should handle load presets error", async () => {
    (presetService.loadPresets as any).mockRejectedValue(new Error("Failed to load"));

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load");
    expect(result.current.presets).toEqual([]);
  });

  it("should save preset", async () => {
    const newPreset: Omit<Preset, "id" | "createdAt"> = {
      name: "New Preset",
      description: "New description",
      config: {
        aiProvider: "openai",
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
    };

    const savedPreset: Preset = {
      ...newPreset,
      id: "preset_new",
      createdAt: Date.now(),
    };

    (presetService.loadPresets as any).mockResolvedValue([]);
    (presetService.savePreset as any).mockResolvedValue(savedPreset);

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(async () => {
      const resultPreset = await result.current.savePreset(newPreset);
      expect(resultPreset).toEqual(savedPreset);
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]).toEqual(savedPreset);
    expect(presetService.savePreset).toHaveBeenCalledWith(newPreset);
  });

  it("should update preset", async () => {
    const existingPreset: Preset = {
      id: "preset1",
      name: "Preset 1",
      description: "Description 1",
      config: {
        aiProvider: "gemini",
        aiModel: "gemini-2.5-pro",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    };

    const updatedPreset: Preset = {
      ...existingPreset,
      name: "Updated Preset",
    };

    (presetService.loadPresets as any).mockResolvedValue([existingPreset]);
    (presetService.updatePreset as any).mockResolvedValue(updatedPreset);

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(async () => {
      const resultPreset = await result.current.updatePreset("preset1", { name: "Updated Preset" });
      expect(resultPreset).toEqual(updatedPreset);
    });

    expect(result.current.presets[0].name).toBe("Updated Preset");
    expect(presetService.updatePreset).toHaveBeenCalledWith("preset1", { name: "Updated Preset" });
  });

  it("should delete preset", async () => {
    const existingPreset: Preset = {
      id: "preset1",
      name: "Preset 1",
      description: "Description 1",
      config: {
        aiProvider: "gemini",
        aiModel: "gemini-2.5-pro",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    };

    (presetService.loadPresets as any).mockResolvedValue([existingPreset]);
    (presetService.deletePreset as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.presets).toHaveLength(1);

    act(async () => {
      await result.current.deletePreset("preset1");
    });

    expect(result.current.presets).toHaveLength(0);
    expect(presetService.deletePreset).toHaveBeenCalledWith("preset1");
  });

  it("should apply preset and return config", async () => {
    const preset: Preset = {
      id: "preset1",
      name: "Preset 1",
      description: "Description 1",
      config: {
        aiProvider: "openai",
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    };

    (presetService.loadPresets as any).mockResolvedValue([preset]);

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const config = result.current.applyPreset(preset);

    expect(config).toEqual(preset.config);
  });

  it("should get preset by id", async () => {
    const preset1: Preset = {
      id: "preset1",
      name: "Preset 1",
      description: "Description 1",
      config: {
        aiProvider: "gemini",
        aiModel: "gemini-2.5-pro",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    };

    const preset2: Preset = {
      id: "preset2",
      name: "Preset 2",
      description: "Description 2",
      config: {
        aiProvider: "openai",
        aiModel: "gpt-4",
        localUrl: "",
        localModelName: "",
        customKey: "",
        customUrl: "",
      },
      createdAt: Date.now(),
    };

    (presetService.loadPresets as any).mockResolvedValue([preset1, preset2]);

    const { result } = renderHook(() => usePresets());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const foundPreset = result.current.getPresetById("preset1");

    expect(foundPreset).toEqual(preset1);

    const notFoundPreset = result.current.getPresetById("preset3");

    expect(notFoundPreset).toBeUndefined();
  });
});
