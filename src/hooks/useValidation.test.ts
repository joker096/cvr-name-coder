import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useValidation } from "./useValidation";
import { validationService } from "../services/validationService";

vi.mock("../services/validationService", () => ({
  validationService: {
    validateField: vi.fn(),
    validateConfig: vi.fn(),
  },
}));

describe("useValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty errors and warnings", () => {
    const { result } = renderHook(() => useValidation());

    expect(result.current.errors).toEqual({});
    expect(result.current.warnings).toEqual({});
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasWarnings).toBe(false);
  });

  it("should validate field and set error", () => {
    vi.mocked(validationService.validateField).mockReturnValue({
      isValid: false,
      error: "Invalid value",
    });

    const { result } = renderHook(() => useValidation());

    act(() => {
      result.current.validateField("testField", "invalid");
    });

    expect(result.current.errors.testField).toBe("Invalid value");
    expect(result.current.hasErrors).toBe(true);
  });

  it("should validate field and clear error", () => {
    vi.mocked(validationService.validateField).mockReturnValue({
      isValid: true,
    });

    const { result } = renderHook(() => useValidation());

    act(() => {
      result.current.validateField("testField", "valid");
    });

    expect(result.current.errors.testField).toBeUndefined();
    expect(result.current.hasErrors).toBe(false);
  });

  it("should validate config and set errors and warnings", () => {
    vi.mocked(validationService.validateConfig).mockReturnValue({
      isValid: false,
      errors: { field1: "Error 1", field2: "Error 2" },
      warnings: { field3: "Warning 1" },
    });

    const { result } = renderHook(() => useValidation());

    act(() => {
      result.current.validateConfig({ field1: "value1" });
    });

    expect(result.current.errors).toEqual({
      field1: "Error 1",
      field2: "Error 2",
    });
    expect(result.current.warnings).toEqual({ field3: "Warning 1" });
    expect(result.current.hasErrors).toBe(true);
    expect(result.current.hasWarnings).toBe(true);
  });

  it("should clear all errors and warnings", () => {
    vi.mocked(validationService.validateConfig).mockReturnValue({
      isValid: false,
      errors: { field1: "Error 1" },
      warnings: { field2: "Warning 1" },
    });

    const { result } = renderHook(() => useValidation());

    act(() => {
      result.current.validateConfig({ field1: "value1" });
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.hasWarnings).toBe(true);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.warnings).toEqual({});
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasWarnings).toBe(false);
  });

  it("should clear specific field error", () => {
    vi.mocked(validationService.validateField).mockReturnValue({
      isValid: false,
      error: "Invalid value",
    });

    const { result } = renderHook(() => useValidation());

    act(() => {
      result.current.validateField("field1", "invalid");
      result.current.validateField("field2", "invalid");
    });

    expect(result.current.errors.field1).toBe("Invalid value");
    expect(result.current.errors.field2).toBe("Invalid value");

    act(() => {
      result.current.clearFieldError("field1");
    });

    expect(result.current.errors.field1).toBeUndefined();
    expect(result.current.errors.field2).toBe("Invalid value");
  });

  it("should set isValidating during validation", () => {
    vi.mocked(validationService.validateConfig).mockImplementation(() => {
      return {
        isValid: true,
        errors: {},
        warnings: {},
      };
    });

    const { result } = renderHook(() => useValidation());

    expect(result.current.isValidating).toBe(false);

    act(() => {
      result.current.validateConfig({});
    });

    expect(result.current.isValidating).toBe(false);
  });
});
