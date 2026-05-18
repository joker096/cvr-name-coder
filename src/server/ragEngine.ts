import Database from "better-sqlite3";
import * as path from "path";

let _dbPath = path.resolve(process.cwd(), ".opencode-infinite", "rag.db");
let _db: Database.Database | null = null;

export function setRagDbPath(dir: string): void {
  _dbPath = path.join(dir, "rag.db");
  _db = null;
}

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(_dbPath);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);
  `);
}

export type EmbedFunction = (texts: string[]) => Promise<number[][]>;

function chunkText(text: string, maxChars = 500): string[] {
  const chunks: string[] = [];
  // Simple sentence-based chunking
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function ingestDocument(
  source: string,
  content: string,
  embedFn: EmbedFunction
): Promise<void> {
  const db = getDb();
  const chunks = chunkText(content);
  const embeddings = await embedFn(chunks);

  const insert = db.prepare("INSERT INTO chunks (source, content, embedding) VALUES (?, ?, ?)");
  for (let i = 0; i < chunks.length; i++) {
    insert.run(source, chunks[i], JSON.stringify(embeddings[i]));
  }
}

export interface RagResult {
  source: string;
  content: string;
  score: number;
}

export async function searchRAG(
  query: string,
  embedFn: EmbedFunction,
  topK = 3
): Promise<RagResult[]> {
  const db = getDb();
  const [queryEmbedding] = await embedFn([query]);
  if (!queryEmbedding) return [];

  const rows = db.prepare("SELECT source, content, embedding FROM chunks").all() as Array<{
    source: string;
    content: string;
    embedding: string;
  }>;

  const scored = rows
    .map((r) => ({
      source: r.source,
      content: r.content,
      score: cosineSimilarity(queryEmbedding, JSON.parse(r.embedding)),
    }))
    .filter((r) => r.score > 0.5) // threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export function listSources(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT source FROM chunks").all() as Array<{ source: string }>;
  return rows.map((r) => r.source);
}

export function clearSource(source: string): void {
  const db = getDb();
  db.prepare("DELETE FROM chunks WHERE source = ?").run(source);
}
