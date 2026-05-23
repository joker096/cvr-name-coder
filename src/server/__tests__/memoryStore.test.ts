import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readUser, setMemoryDir, writeUser } from "../memoryStore";

describe("memoryStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvr-memory-"));
    setMemoryDir(tempDir);
  });

  afterEach(async () => {
    setMemoryDir(path.resolve(process.cwd(), ".opencode-infinite"));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("preserves the USER.md document heading when updating user preferences", async () => {
    await readUser();
    await writeUser("Prefer terse status updates", "Communication Preferences");

    const userPath = path.join(tempDir, "USER.md");
    const raw = await fs.readFile(userPath, "utf-8");

    expect(raw.startsWith("# User Preferences")).toBe(true);
    expect(raw).toContain("Prefer terse status updates");
    expect(raw).not.toContain("# Project Memory");
  });
});
