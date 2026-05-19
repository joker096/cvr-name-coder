import * as path from "path";
import * as fs from "fs";

let _dbPath = path.resolve(process.cwd(), ".opencode-infinite", "rag.db");
let _db: any = null;
let _useFallback = false;

// Fallback JSON storage
let _chunks: Array<{ id: number; source: string; content: string; embedding: string }> = [];
let _jsonPath = "";
let _nextId = 1;

function loadJson() {
  try {
    if (fs.existsSync(_jsonPath)) {
      const data = JSON.parse(fs.readFileSync(_jsonPath, "utf-8"));
      _chunks = data.chunks || [];
      _nextId = data.nextId || 1;
    }
  } catch { /* ignore */ }
}

function saveJson() {
  try {
    fs.mkdirSync(path.dirname(_jsonPath), { recursive: true });
    fs.writeFileSync(_jsonPath, JSON.stringify({ chunks: _chunks, nextId: _nextId }, null, 2));
  } catch { /* ignore */ }
}

function fallbackGetDb(): any {
  if (!_jsonPath) {
    _jsonPath = _dbPath.replace(/\.db$/, '') + '-fallback.json';
    loadJson();
  }
  return {
    prepare: (sql: string) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith('insert into chunks')) {
        return {
          run: (source: string, content: string, embedding: string) => {
            _chunks.push({ id: _nextId++, source, content, embedding });
            saveJson();
            return { lastInsertRowid: _nextId - 1 };
          },
        };
      }
      if (trimmed.startsWith('select') && trimmed.includes('from chunks')) {
        return {
          all: () => [..._chunks],
          get: () => undefined,
        };
      }
      if (trimmed.startsWith('delete from chunks where source =')) {
        return {
          run: (source: string) => {
            _chunks = _chunks.filter(c => c.source !== source);
            saveJson();
            return {};
          },
        };
      }
      return { run: () => ({}), get: () => undefined, all: () => [] };
    },
    exec: () => {},
    pragma: () => {},
  };
}

export function setRagDbPath(dir: string): void {
  _dbPath = path.join(dir, "rag.db");
  _db = null;
  if (_useFallback) {
    _jsonPath = path.join(dir, "rag-fallback.json");
    loadJson();
  }
}

function getDb(): any {
  if (!_db) {
    try {
      const Database = require("better-sqlite3");
      _db = new Database(_dbPath);
      _db.pragma("journal_mode = WAL");
      initSchema(_db);
    } catch {
      _useFallback = true;
      _db = fallbackGetDb();
    }
  }
  return _db;
}

function initSchema(db: any): void {
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
  if (_useFallback) saveJson();
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
    .filter((r) => r.score > 0.5)
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
  if (_useFallback) saveJson();
}
