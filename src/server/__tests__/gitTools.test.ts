import { describe, it, expect, beforeEach, vi } from "vitest";
import { setGitProjectRoot, getGitStatus } from "../gitTools.js";

describe("gitTools", () => {
  describe("setGitProjectRoot", () => {
    it("should accept a valid directory path", () => {
      expect(() => setGitProjectRoot(process.cwd())).not.toThrow();
    });

    it("should accept a different path", () => {
      expect(() => setGitProjectRoot("/tmp")).not.toThrow();
      setGitProjectRoot(process.cwd());
    });
  });

  describe("getGitStatus", () => {
    it("should return a valid GitStatus object even when not in a git repo", async () => {
      setGitProjectRoot("/tmp/nonexistent-repo-12345");
      const status = await getGitStatus();
      expect(status).toHaveProperty("branch", "");
      expect(status).toHaveProperty("modified");
      expect(status).toHaveProperty("staged");
      expect(status).toHaveProperty("untracked");
      expect(status).toHaveProperty("deleted");
      expect(status).toHaveProperty("renamed");
      expect(status).toHaveProperty("clean", true);
      expect(Array.isArray(status.modified)).toBe(true);
      expect(Array.isArray(status.staged)).toBe(true);
      expect(Array.isArray(status.untracked)).toBe(true);
      expect(Array.isArray(status.deleted)).toBe(true);
      expect(Array.isArray(status.renamed)).toBe(true);
    });

    it("should return clean status in this git repo", async () => {
      setGitProjectRoot(process.cwd());
      const status = await getGitStatus();
      expect(status).toHaveProperty("branch");
      expect(typeof status.branch).toBe("string");
      expect(status.branch.length).toBeGreaterThan(0);
      expect(Array.isArray(status.modified)).toBe(true);
      expect(Array.isArray(status.staged)).toBe(true);
      expect(Array.isArray(status.untracked)).toBe(true);
      expect(Array.isArray(status.deleted)).toBe(true);
      expect(Array.isArray(status.renamed)).toBe(true);
      expect(typeof status.clean).toBe("boolean");
    });
  });
});
