import type { ToolResult } from "../../types/tools";
import { readMemory, writeMemory, readUser, writeUser } from "../memoryStore.js";

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
