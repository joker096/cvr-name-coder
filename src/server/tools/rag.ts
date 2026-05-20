import type { ToolResult } from "../../types/tools";
import { searchRAG } from "../ragEngine.js";
import type { EmbedFunction } from "../ragEngine.js";

let ragEmbedFn: EmbedFunction | null = null;

export function setRagEmbedFn(fn: EmbedFunction): void {
  ragEmbedFn = fn;
}

export async function executeRagSearch(params: Record<string, unknown>): Promise<ToolResult> {
  const query = String(params.query);
  const topK = params.limit ? Number(params.limit) : 3;
  if (!ragEmbedFn) {
    return { success: false, output: "", error: "RAG embeddings not initialized" };
  }
  const results = await searchRAG(query, ragEmbedFn, topK);
  return { success: true, output: JSON.stringify(results, null, 2) };
}
