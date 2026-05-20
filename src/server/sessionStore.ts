import * as path from "path";
import { randomUUID } from "crypto";
import * as fs from "fs";
import type { Database, DatabaseStatement } from "../types/database";

let _dbPath = path.resolve(process.cwd(), ".opencode-infinite", "sessions.db");
let _db: Database | null = null;
let _useFallback = false;

let _sessions: Session[] = [];
let _messages: Message[] = [];
let _jsonPath = "";

interface SessionJsonData {
  sessions: Session[];
  messages: Message[];
}

function loadJson(): void {
  try {
    if (fs.existsSync(_jsonPath)) {
      const raw = fs.readFileSync(_jsonPath, "utf-8");
      const data = JSON.parse(raw) as SessionJsonData;
      _sessions = data.sessions || [];
      _messages = data.messages || [];
    }
  } catch {
    /* ignore */
  }
}

function saveJson(): void {
  try {
    fs.mkdirSync(path.dirname(_jsonPath), { recursive: true });
    const data: SessionJsonData = { sessions: _sessions, messages: _messages };
    fs.writeFileSync(_jsonPath, JSON.stringify(data, null, 2));
  } catch {
    /* ignore */
  }
}

function fallbackGetDb(): Database {
  if (!_jsonPath) {
    _jsonPath = path.join(_dbPath.replace(/\.db$/, "") + "-fallback.json");
    loadJson();
  }
  return {
    prepare: (sql: string): DatabaseStatement => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("insert into sessions")) {
        const stmt: DatabaseStatement = {
          run: (...args: unknown[]) => {
            const id = args[0] as string;
            const title = args[1] as string;
            const createdAt = args[2] as number;
            const updatedAt = args[3] as number;
            _sessions.push({ id, title, createdAt, updatedAt });
            saveJson();
            return { lastInsertRowid: _sessions.length, changes: 1 };
          },
        };
        return stmt;
      }
      if (trimmed.startsWith("insert into messages")) {
        const stmt: DatabaseStatement = {
          run: (...args: unknown[]) => {
            const id = args[0] as string;
            const sessionId = args[1] as string;
            const role = args[2] as string;
            const content = args[3] as string;
            const createdAt = args[4] as number;
            _messages.push({ id, sessionId, role, content, createdAt });
            saveJson();
            return { lastInsertRowid: _messages.length, changes: 1 };
          },
        };
        return stmt;
      }
      if (trimmed.startsWith("insert into messages_fts")) {
        const stmt: DatabaseStatement = {
          run: () => ({ lastInsertRowid: 0, changes: 0 }),
        };
        return stmt;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from sessions where id =")) {
        const stmt: DatabaseStatement = {
          get: (id: unknown) => _sessions.find((s) => s.id === id) || undefined,
        };
        return stmt;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from messages where session_id =")) {
        const stmt: DatabaseStatement = {
          all: (sessionId: unknown) => _messages.filter((m) => m.sessionId === sessionId),
        };
        return stmt;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from sessions order by updated_at desc")) {
        const stmt: DatabaseStatement = {
          all: () => [..._sessions].sort((a, b) => b.updatedAt - a.updatedAt),
        };
        return stmt;
      }
      if (trimmed.startsWith("update sessions set updated_at")) {
        const stmt: DatabaseStatement = {
          run: (updatedAt: unknown, id: unknown) => {
            const s = _sessions.find((s) => s.id === id);
            if (s) s.updatedAt = updatedAt as number;
            saveJson();
            return { lastInsertRowid: 0, changes: 1 };
          },
        };
        return stmt;
      }
      if (trimmed.startsWith("delete from sessions where id =")) {
        const stmt: DatabaseStatement = {
          run: (id: unknown) => {
            _sessions = _sessions.filter((s) => s.id !== id);
            _messages = _messages.filter((m) => m.sessionId !== id);
            saveJson();
            return { lastInsertRowid: 0, changes: 1 };
          },
        };
        return stmt;
      }
      if (trimmed.startsWith("select name from sqlite_master")) {
        const stmt: DatabaseStatement = {
          get: () => undefined,
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

export function setSessionDbPath(dir: string): void {
  _dbPath = path.join(dir, "sessions.db");
  _db = null;
  if (_useFallback) {
    _jsonPath = path.join(dir, "sessions-fallback.json");
    loadJson();
  }
}

export function getDb(): Database {
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

  const ftsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'").get!();
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
  db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run!(id, title, now, now);
  if (_useFallback) saveJson();
  return session;
}

export function addMessage(sessionId: string, role: string, content: string): Message {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const insertResult = db
    .prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
    .run!(id, sessionId, role, content, now);

  if (!_useFallback) {
    db.prepare("INSERT INTO messages_fts (rowid, content, session_id) VALUES (?, ?, ?)").run!(
      insertResult.lastInsertRowid,
      content,
      sessionId
    );
  }

  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run!(now, sessionId);
  if (_useFallback) saveJson();

  return { id, sessionId, role, content, createdAt: now };
}

export function getSession(sessionId: string): { session: Session; messages: Message[] } | null {
  const db = getDb();
  const session = db.prepare("SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?").get!(sessionId) as
    | { id: string; title: string; created_at: number; updated_at: number }
    | undefined;
  if (!session) return null;

  const rows = db
    .prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC")
    .all!(sessionId) as Array<{
    id: string;
    session_id: string;
    role: string;
    content: string;
    created_at: number;
  }>;

  return {
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    },
    messages: rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      createdAt: r.created_at,
    })),
  };
}

export function listSessions(): Session[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC")
    .all!() as Array<{
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function searchSessions(query: string, limit = 20): SearchResult[] {
  if (_useFallback) {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    for (const m of _messages) {
      if (m.content.toLowerCase().includes(q)) {
        const s = _sessions.find((s) => s.id === m.sessionId);
        if (s) {
          results.push({
            sessionId: s.id,
            sessionTitle: s.title,
            messageId: m.id,
            role: m.role,
            snippet: m.content.slice(0, 100),
            createdAt: m.createdAt,
          });
        }
      }
    }
    return results.slice(0, limit);
  }

  const db = getDb();
  if (!query.trim()) return [];

  const rows = db
    .prepare(
      `
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
  `
    )
    .all!(query, limit) as Array<{
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
  if (_useFallback) {
    _sessions = _sessions.filter((s) => s.id !== sessionId);
    _messages = _messages.filter((m) => m.sessionId !== sessionId);
    saveJson();
    return;
  }
  db.prepare("DELETE FROM sessions WHERE id = ?").run!(sessionId);
  const messageRowids = db.prepare("SELECT rowid FROM messages WHERE session_id = ?").all!(sessionId) as Array<{
    rowid: number;
  }>;
  for (const { rowid } of messageRowids) {
    db.prepare("DELETE FROM messages_fts WHERE rowid = ?").run!(rowid);
  }
  db.prepare("DELETE FROM messages WHERE session_id = ?").run!(sessionId);
}
