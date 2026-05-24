import * as path from "path";
import * as fs from "fs";
import type { Database, RagChunk, RagJsonData, DatabaseStatement } from "../types/database";

let _dbPath = path.resolve(process.cwd(), ".opencode-infinite", "rag.db");
let _db: Database | null = null;
let _useFallback = false;

let _chunks: RagChunk[] = [];
let _jsonPath = "";
let _nextId = 1;

function loadJson(): void {
  try {
    if (fs.existsSync(_jsonPath)) {
      const raw = fs.readFileSync(_jsonPath, "utf-8");
      const data: RagJsonData = JSON.parse(raw) as RagJsonData;
      _chunks = data.chunks || [];
      _nextId = data.nextId || 1;
    }
  } catch {
    /* ignore */
  }
}

function saveJson(): void {
  try {
    fs.mkdirSync(path.dirname(_jsonPath), { recursive: true });
    const data: RagJsonData = { chunks: _chunks, nextId: _nextId };
    fs.writeFileSync(_jsonPath, JSON.stringify(data, null, 2));
  } catch {
    /* ignore */
  }
}

function fallbackGetDb(): Database {
  if (!_jsonPath) {
    _jsonPath = _dbPath.replace(/\.db$/, "") + "-fallback.json";
    loadJson();
  }
  return {
    prepare: (sql: string) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("insert into chunks")) {
        const stmt: DatabaseStatement = {
          run: (source: unknown, content: unknown, embedding: unknown) => {
            _chunks.push({
              id: _nextId++,
              source: String(source),
              content: String(content),
              embedding: String(embedding),
            });
            saveJson();
            return { lastInsertRowid: _nextId - 1, changes: 1 };
          },
        };
        return stmt;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from chunks")) {
        const stmt: DatabaseStatement = {
          all: () => [..._chunks],
          get: () => undefined,
        };
        return stmt;
      }
      if (trimmed.startsWith("delete from chunks where source =")) {
        const stmt: DatabaseStatement = {
          run: (source: unknown) => {
            _chunks = _chunks.filter((c) => c.source !== String(source));
            saveJson();
            return { lastInsertRowid: 0, changes: 1 };
          },
        };
        return stmt;
      }
      const stmt: DatabaseStatement = {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
      return stmt;
    },
    exec: () => {},
    pragma: () => {},
  };
}

/**
 * Sets the directory where the RAG SQLite database (and JSON fallback) is stored.
 *
 * @param dir - The target directory path.
 */
/**
 * Sets the directory path for the RAG database.
 * Resets any cached database instance so it will be re-initialized on next access.
 *
 * @param dir - Directory path containing (or to contain) the rag.db file.
 */
export function setRagDbPath(dir: string): void {
  _dbPath = path.join(dir, "rag.db");
  _db = null;
  if (_useFallback) {
    _jsonPath = path.join(dir, "rag-fallback.json");
    loadJson();
  }
}

function getDb(): Database {
  if (!_db) {
    try {
      const DatabaseClass: typeof import("better-sqlite3") = require("better-sqlite3");
      const db = new DatabaseClass(_dbPath) as Database;
      db.pragma("journal_mode = WAL");
      initSchema(db);
      _db = db;
    } catch {
      _useFallback = true;
      _db = fallbackGetDb();
    }
  }
  return _db;
}

function initSchema(db: Database): void {
  if (_useFallback) return;
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

/**
 * A function that accepts an array of text strings and returns their embedding vectors.
 * Each inner array corresponds to the embedding for the text at the same index.
 */
/** Callback that accepts an array of text strings and returns their vector embeddings. */
export type EmbedFunction = (texts: string[]) => Promise<number[][]>;

function chunkText(text: string, maxChars = 500): string[] {
  const chunks: string[] = [];
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

/**
 * Ingests a document into the RAG store by chunking its content, generating
 * embeddings, and persisting them to the database.
 *
 * @param source - A label identifying the document source.
 * @param content - The full text content to ingest.
 * @param embedFn - Function that converts text chunks to embedding vectors.
 */
/**
 * Splits a document into chunks, generates embeddings, and stores them in the RAG database.
 *
 * @param source - A label/identifier for the document source.
 * @param content - The full text content to ingest.
 * @param embedFn - Function that generates embeddings for an array of text chunks.
 */
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
    insert.run!(source, chunks[i], JSON.stringify(embeddings[i]));
  }
  if (_useFallback) saveJson();
}

/** A single search result from the RAG store, including a similarity score. */
/** A single search result from the RAG index. */
export interface RagResult {
  /** Source identifier of the document chunk. */
  source: string;
  /** The matched text content. */
  content: string;
  /** Cosine similarity score (0-1), higher is better. */
  score: number;
}

/**
 * Searches ingested documents using cosine similarity on embeddings.
 *
 * @param query - The search query text.
 * @param embedFn - Function that converts a text query to an embedding vector.
 * @param topK - Maximum number of results to return (default 3).
 * @returns An array of scored results, filtered to those with similarity > 0.5.
 */
/**
 * Searches the RAG index for chunks semantically similar to the query.
 * Only returns results with a cosine similarity above 0.5.
 *
 * @param query - The search query text.
 * @param embedFn - Function that generates embeddings for text.
 * @param topK - Maximum number of results to return (default 3).
 * @returns Array of ranked {@link RagResult} objects, sorted by descending score.
 */
export async function searchRAG(
  query: string,
  embedFn: EmbedFunction,
  topK = 3
): Promise<RagResult[]> {
  const db = getDb();
  const [queryEmbedding] = await embedFn([query]);
  if (!queryEmbedding) return [];

  const rows = db.prepare("SELECT source, content, embedding FROM chunks").all!() as RagChunk[];

  const scored = rows
    .map((r) => ({
      source: r.source,
      content: r.content,
      score: cosineSimilarity(queryEmbedding, JSON.parse(r.embedding)),
    }))
    .filter((r) => r.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Returns the distinct source labels for all ingested documents.
 *
 * @returns An array of source name strings.
 */
/**
 * Lists all unique source identifiers currently in the RAG database.
 *
 * @returns Array of source name strings.
 */
export function listSources(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT source FROM chunks").all!() as Array<{ source: string }>;
  return rows.map((r) => r.source);
}

/**
 * Removes all chunks associated with a given document source.
 *
 * @param source - The source label to clear.
 */
/**
 * Removes all chunks belonging to a specific source from the RAG database.
 *
 * @param source - The source identifier to clear.
 */
export function clearSource(source: string): void {
  const db = getDb();
  db.prepare("DELETE FROM chunks WHERE source = ?").run!(source);
  if (_useFallback) saveJson();
}
