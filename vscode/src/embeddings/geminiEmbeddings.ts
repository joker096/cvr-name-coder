let geminiClient: InstanceType<typeof import('@google/genai').GoogleGenAI> | null = null;
let hasLoggedMissingGeminiKey = false;

function hasGeminiEmbeddingsConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getGemini() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set. Set it to enable RAG embeddings, or disable Project Oracle with CVR_ORACLE_ENABLED=false');
    }
    const { GoogleGenAI } = require('@google/genai');
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const result = await getGemini().models.embedContent({
      model: 'text-embedding-004',
      contents: texts.map((t) => ({ role: 'user', parts: [{ text: t }] })),
    });
    interface EmbedResult {
      values: number[];
    }
    if (Array.isArray(result.embeddings)) {
      return (result.embeddings as EmbedResult[]).map((e) => e.values);
    }
    if (result.embeddings && Array.isArray((result.embeddings as EmbedResult).values)) {
      return [(result.embeddings as EmbedResult).values];
    }
    return texts.map(() => []);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message?.includes('GEMINI_API_KEY not set')) {
      if (!hasLoggedMissingGeminiKey) {
        hasLoggedMissingGeminiKey = true;
        console.warn('[cvr.name] RAG embeddings disabled: GEMINI_API_KEY not configured');
      }
    } else {
      console.error('[cvr.name] Embedding generation failed:', message);
    }
    return texts.map(() => []);
  }
}

export { hasGeminiEmbeddingsConfigured };
