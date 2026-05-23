import { describe, expect, it } from "vitest";
import { validateBrowserUrl } from "../browserTools";

describe("browserTools security", () => {
  it("allows normal public http and https URLs", () => {
    expect(validateBrowserUrl("https://example.com")).toBeNull();
    expect(validateBrowserUrl("http://example.org/path")).toBeNull();
  });

  it("blocks local and non-http targets", () => {
    expect(validateBrowserUrl("http://127.0.0.1:3000")).toMatch(/blocked/i);
    expect(validateBrowserUrl("https://localhost")).toMatch(/blocked/i);
    expect(validateBrowserUrl("file:///etc/passwd")).toMatch(/Only HTTP and HTTPS/i);
  });
});
