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

/**
 * Sets the directory path for the session database.
 * Reinitializes the database connection and fallback JSON storage to the new directory.
 * @param {string} dir - The directory path where the sessions database file should be stored.
 */
export function setSessionDbPath(dir: string): void {
  _dbPath = path.join(dir, "sessions.db");
  _db = null;
  if (_useFallback) {
    _jsonPath = path.join(dir, "sessions-fallback.json");
    loadJson();
  }
}

/**
 * Returns the active database instance, initializing it if necessary.
 * Attempts to use better-sqlite3 first, falling back to a JSON-based in-memory store.
 * @returns {Database} The database instance (SQLite or fallback).
 */
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

/**
 * Represents a chat session stored in the database.
 */
export interface Session {
  /** Unique session identifier (UUID). */
  id: string;
  /** Human-readable session title. */
  title: string;
  /** Unix timestamp (ms) when the session was created. */
  createdAt: number;
  /** Unix timestamp (ms) when the session was last updated. */
  updatedAt: number;
}

/**
 * Represents a single chat message within a session.
 */
export interface Message {
  /** Unique message identifier (UUID). */
  id: string;
  /** The session ID this message belongs to. */
  sessionId: string;
  /** The role of the message sender (e.g. "user", "assistant", "system"). */
  role: string;
  /** The message content text. */
  content: string;
  /** Unix timestamp (ms) when the message was created. */
  createdAt: number;
}

/**
 * Represents a full-text search result across sessions and messages.
 */
export interface SearchResult {
  /** The session ID containing the matching message. */
  sessionId: string;
  /** The title of the session containing the match. */
  sessionTitle: string;
  /** The ID of the matching message. */
  messageId: string;
  /** The role of the matching message sender. */
  role: string;
  /** A truncated snippet of the matching content with highlighted terms. */
  snippet: string;
  /** Unix timestamp (ms) when the matching message was created. */
  createdAt: number;
}

/**
 * Creates a new chat session with the given title.
 * @param {string} title - The title for the new session.
 * @returns {Session} The newly created session object.
 */
export function createSession(title: string): Session {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const session: Session = { id, title, createdAt: now, updatedAt: now };
  db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run!(id, title, now, now);
  if (_useFallback) saveJson();
  return session;
}

/**
 * Adds a message to an existing session and updates the session's timestamp.
 * Also inserts into the FTS index when using SQLite backend.
 * @param {string} sessionId - The ID of the session to add the message to.
 * @param {string} role - The role of the message sender.
 * @param {string} content - The message content.
 * @returns {Message} The newly created message object.
 */
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

/**
 * Retrieves a session and all its messages.
 * @param {string} sessionId - The ID of the session to retrieve.
 * @returns {{ session: Session; messages: Message[] } | null} The session with its messages, or null if not found.
 */
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

/**
 * Lists all sessions ordered by most recently updated first.
 * @returns {Session[]} An array of all sessions sorted by updatedAt descending.
 */
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

/**
 * Searches sessions and messages using full-text search (via FTS5 or fallback substring matching).
 * @param {string} query - The search query string.
 * @param {number} [limit=20] - Maximum number of results to return.
 * @returns {SearchResult[]} An array of matching search results.
 */
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

/**
 * Deletes a session and all its associated messages and FTS indexes.
 * @param {string} sessionId - The ID of the session to delete.
 */
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
