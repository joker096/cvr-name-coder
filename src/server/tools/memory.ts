import type { ToolResult } from "../../types/tools";
import { readMemory, writeMemory, readUser, writeUser } from "../memoryStore.js";

/**
 * Reads memory content, either project-level or user-level.
 * @param params - Contains `type`: "user" for user preferences, anything else for project memory.
 * @returns A tool result with the raw memory content.
 */
export async function executeMemoryRead(params: Record<string, unknown>): Promise<ToolResult> {
  const memoryType = String(params.type);
  if (memoryType === "user") {
    const userData = await readUser();
    return { success: true, output: userData.raw };
  } else {
    const memData = await readMemory();
    return { success: true, output: memData.raw };
  }
}

/**
 * Writes memory content, either to project memory or user preferences.
 * @param params - Contains `type` ("user" or anything else), `content` (the text to store), and optional `section`.
 * @returns A tool result confirming the write.
 */
export async function executeMemoryWrite(params: Record<string, unknown>): Promise<ToolResult> {
  const memoryType = String(params.type);
  const content = String(params.content);
  const section = params.section ? String(params.section) : undefined;
  if (memoryType === "user") {
    await writeUser(content, section);
    return { success: true, output: "User preference recorded." };
  } else {
    await writeMemory(content, section);
    return { success: true, output: "Project memory recorded." };
  }
}
