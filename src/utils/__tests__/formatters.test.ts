import { describe, it, expect } from "vitest";
import { formatTimestamp, formatFileSize, truncate } from "../formatters";

describe("formatTimestamp", () => {
  it("should format a timestamp with hour and minute", () => {
    const ts = new Date("2025-01-15T14:30:00").getTime();
    const result = formatTimestamp(ts);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result).toMatch(/\d/);
  });

  it("should format early morning timestamp", () => {
    const ts = new Date("2025-01-15T05:07:00").getTime();
    const result = formatTimestamp(ts);
    expect(result).toContain("05");
    expect(result).toContain("07");
  });

  it("should handle midnight", () => {
    const ts = new Date("2025-01-15T00:00:00").getTime();
    const result = formatTimestamp(ts);
    expect(result).toContain("00");
  });

  it("should handle late evening", () => {
    const ts = new Date("2025-01-15T23:59:00").getTime();
    const result = formatTimestamp(ts);
    expect(result).toContain("59");
  });
});

describe("formatFileSize", () => {
  it("should format zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("should format bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("should format kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("should format megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  it("should format gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("should format fractional KB", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("should format fractional MB", () => {
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("should format large values at GB boundary", () => {
    expect(formatFileSize(2147483648)).toBe("2 GB");
  });

  it("should handle 1 byte", () => {
    expect(formatFileSize(1)).toBe("1 B");
  });

  it("should handle boundary just below 1 KB", () => {
    expect(formatFileSize(1023)).toBe("1023 B");
  });
});

describe("truncate", () => {
  it("should return original string when within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("should return exact-length string unchanged", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("should truncate with ellipsis when over limit", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("should handle empty string", () => {
    expect(truncate("", 5)).toBe("");
  });

  it("should truncate long strings", () => {
    expect(truncate("this is a very long string", 12)).toBe("this is a...");
  });

  it("should handle maxLength of 4 (minimum) correctly", () => {
    expect(truncate("abcdef", 4)).toBe("a...");
  });

  it("should handle maxLength of 3 correctly", () => {
    expect(truncate("abcdef", 3)).toBe("...");
  });

  it("should truncate long texts at specified boundary", () => {
    const result = truncate("1234567890", 7);
    expect(result).toBe("1234...");
    expect(result.length).toBe(7);
  });
});
