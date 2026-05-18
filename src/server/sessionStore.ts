import Database from "better-sqlite3";
import * as path from "path";
import { randomUUID } from "crypto";

let _dbPath = path.resolve(process.cwd(), ".opencode-infinite", "sessions.db");
let _db: Database.Database | null = null;

export function setSessionDbPath(dir: string): void {
  _dbPath = path.join(dir, "sessions.db");
  _db = null; // reset so next getDb() will reopen
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
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  // FTS5 virtual table for full-text search over messages
  const ftsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'").get();
  if (!ftsExists) {
    db.exec(`
      CREATE VIRTUAL TABLE messages_fts USING fts5(
        content,
        session_id UNINDEXED,
        tokenize='porter'
      );
    `);
  }
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: number;
}

export interface SearchResult {
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  role: string;
  snippet: string;
  createdAt: number;
}

export function createSession(title: string): Session {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const session: Session = { id, title, createdAt: now, updatedAt: now };
  db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, title, now, now);
  return session;
}

export function addMessage(sessionId: string, role: string, content: string): Message {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const insertResult = db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    sessionId,
    role,
    content,
    now
  );

  // Sync to FTS5
  db.prepare("INSERT INTO messages_fts (rowid, content, session_id) VALUES (?, ?, ?)").run(
    insertResult.lastInsertRowid,
    content,
    sessionId
  );

  // Update session timestamp
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);

  return { id, sessionId, role, content, createdAt: now };
}

export function getSession(sessionId: string): { session: Session; messages: Message[] } | null {
  const db = getDb();
  const session = db.prepare("SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?").get(sessionId) as
    | { id: string; title: string; created_at: number; updated_at: number }
    | undefined;
  if (!session) return null;

  const rows = db.prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC").all(sessionId) as Array<{
    id: string; session_id: string; role: string; content: string; created_at: number;
  }>;

  return {
    session: { id: session.id, title: session.title, createdAt: session.created_at, updatedAt: session.updated_at },
    messages: rows.map((r) => ({ id: r.id, sessionId: r.session_id, role: r.role, content: r.content, createdAt: r.created_at })),
  };
}

export function listSessions(): Session[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC").all() as Array<{
    id: string; title: string; created_at: number; updated_at: number;
  }>;
  return rows.map((r) => ({ id: r.id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export function searchSessions(query: string, limit = 20): SearchResult[] {
  const db = getDb();
  if (!query.trim()) return [];

  // FTS5 search with snippet highlighting
  const rows = db.prepare(`
    SELECT
      m.session_id AS sessionId,
      s.title AS sessionTitle,
      m.rowid AS messageRowId,
      msg.id AS messageId,
      msg.role AS role,
      msg.created_at AS createdAt,
      snippet(messages_fts, 0, '**', '**', '...', 32) AS snippet
    FROM messages_fts
    JOIN messages msg ON messages_fts.rowid = msg.rowid
    JOIN sessions s ON msg.session_id = s.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query, limit) as Array<{
    sessionId: string;
    sessionTitle: string;
    messageId: string;
    role: string;
    createdAt: number;
    snippet: string;
  }>;

  return rows.map((r) => ({
    sessionId: r.sessionId,
    sessionTitle: r.sessionTitle,
    messageId: r.messageId,
    role: r.role,
    snippet: r.snippet,
    createdAt: r.createdAt,
  }));
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  // FTS5 rows are deleted automatically via foreign key if configured, but we use rowid matching.
  // Since we delete messages via CASCADE, we need to also clean fts. However, SQLite FTS5 doesn't auto-cascade.
  // For simplicity, we re-sync or just delete manually.
  const messageRowids = db.prepare("SELECT rowid FROM messages WHERE session_id = ?").all(sessionId) as Array<{ rowid: number }>;
  for (const { rowid } of messageRowids) {
    db.prepare("DELETE FROM messages_fts WHERE rowid = ?").run(rowid);
  }
  db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
}
