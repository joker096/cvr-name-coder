import { describe, it, expect, beforeEach } from "vitest";
import { setMemoryDir, readMemory, readUser } from "../memoryStore.js";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

describe("memoryStore", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `cvr-memory-test-${Date.now()}`);
    await fs.promises.mkdir(testDir, { recursive: true });
    setMemoryDir(testDir);
  });

  describe("setMemoryDir", () => {
    it("should switch to a new directory", () => {
      const newDir = path.join(os.tmpdir(), `cvr-memory-test-${Date.now()}`);
      expect(() => setMemoryDir(newDir)).not.toThrow();
    });
  });

  describe("readMemory", () => {
    it("should create MEMORY.md with defaults when not present", async () => {
      const data = await readMemory();
      expect(data).toHaveProperty("raw");
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.raw.length).toBeGreaterThan(0);
    });

    it("should return parsed sections", async () => {
      const data = await readMemory();
      expect(data.sections.length).toBeGreaterThan(0);
      for (const section of data.sections) {
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("lines");
        expect(typeof section.title).toBe("string");
        expect(Array.isArray(section.lines)).toBe(true);
      }
    });
  });

  describe("readUser", () => {
    it("should create USER.md with defaults when not present", async () => {
      const data = await readUser();
      expect(data).toHaveProperty("raw");
      expect(data).toHaveProperty("sections");
      expect(Array.isArray(data.sections)).toBe(true);
      expect(data.raw.length).toBeGreaterThan(0);
    });

    it("should return parsed user preference sections", async () => {
      const data = await readUser();
      expect(data.sections.length).toBeGreaterThan(0);
      for (const section of data.sections) {
        expect(section).toHaveProperty("title");
        expect(section).toHaveProperty("lines");
      }
    });
  });
});
