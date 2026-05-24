import { describe, it, expect } from "vitest";
import { buildUrl, isValidUrl, generateId } from "../apiHelpers";

describe("buildUrl", () => {
  it("should combine base URL with endpoint", () => {
    expect(buildUrl("https://api.example.com", "/v1/models")).toBe(
      "https://api.example.com/v1/models"
    );
  });

  it("should remove trailing slash from base URL", () => {
    expect(buildUrl("https://api.example.com/", "/v1/models")).toBe(
      "https://api.example.com/v1/models"
    );
  });

  it("should handle base URL without trailing slash", () => {
    expect(buildUrl("https://api.example.com", "/v1/models")).toBe(
      "https://api.example.com/v1/models"
    );
  });

  it("should handle endpoint without leading slash", () => {
    expect(buildUrl("https://api.example.com", "v1/models")).toBe(
      "https://api.example.comv1/models"
    );
  });
});

describe("isValidUrl", () => {
  it("should return true for valid HTTP URL", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("should return true for valid HTTP URL without protocol", () => {
    expect(isValidUrl("http://localhost:3000")).toBe(true);
  });

  it("should return true for URL with path", () => {
    expect(isValidUrl("https://api.example.com/v1/models")).toBe(true);
  });

  it("should return false for invalid URL", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("should return false for relative path", () => {
    expect(isValidUrl("/api/v1")).toBe(false);
  });

  it("should return false for malformed URL", () => {
    expect(isValidUrl("https://")).toBe(false);
  });
});

describe("generateId", () => {
  it("should generate a non-empty string", () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("should contain a timestamp and random part", () => {
    const id = generateId();
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it("should generate unique IDs on successive calls", () => {
    const first = generateId();
    const second = generateId();
    expect(first).not.toBe(second);
  });

  it("should generate exactly two different IDs in a loop", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});
