import type { ToolResult } from "../../types/tools";
import { searchRAG } from "../ragEngine.js";
import type { EmbedFunction } from "../ragEngine.js";

let ragEmbedFn: EmbedFunction | null = null;

/**
 * Sets the embedding function used for RAG vector searches.
 * @param fn - The embedding function to use for generating query vectors.
 */
export function setRagEmbedFn(fn: EmbedFunction): void {
  ragEmbedFn = fn;
}

/**
 * Searches the RAG index for documents semantically similar to the query.
 * @param params - Contains `query` (search string) and optional `limit` (number of results, defaults to 3).
 * @returns A tool result with JSON-encoded search results, or an error if embeddings are not initialized.
 */
export async function executeRagSearch(params: Record<string, unknown>): Promise<ToolResult> {
  const query = String(params.query);
  const topK = params.limit ? Number(params.limit) : 3;
  if (!ragEmbedFn) {
    return { success: false, output: "", error: "RAG embeddings not initialized" };
  }
  const results = await searchRAG(query, ragEmbedFn, topK);
  return { success: true, output: JSON.stringify(results, null, 2) };
}
