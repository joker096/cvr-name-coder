import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("should return empty string when called without args", () => {
    expect(cn()).toBe("");
  });

  it("should return single class string", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("should merge multiple classes", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
  });

  it("should filter out falsy values", () => {
    expect(cn("text-red-500", false, undefined, null, "bg-blue-500")).toBe(
      "text-red-500 bg-blue-500"
    );
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("should merge tailwind classes and resolve conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle array of classes", () => {
    expect(cn(["text-red-500", "bg-blue-500"])).toBe("text-red-500 bg-blue-500");
  });

  it("should handle object syntax", () => {
    expect(cn({ "text-red-500": true, "hidden": false })).toBe("text-red-500");
  });

  it("should handle mixed conditions", () => {
    expect(cn("base", { visible: true, hidden: false }, "extra")).toBe("base visible extra");
  });

  it("should resolve conflicting tailwind utilities", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("font-bold", "font-normal")).toBe("font-normal");
  });
});
