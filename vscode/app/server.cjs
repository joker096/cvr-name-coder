"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/types/errors.ts
function isError(e) {
  return e instanceof Error;
}
function getErrorMessage(e) {
  if (isError(e)) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}
var init_errors = __esm({
  "src/types/errors.ts"() {
    "use strict";
  }
});

// src/server/browserTools.ts
var browserTools_exports = {};
__export(browserTools_exports, {
  browserClick: () => browserClick,
  browserClose: () => browserClose,
  browserEvaluate: () => browserEvaluate,
  browserGetHtml: () => browserGetHtml,
  browserNavigate: () => browserNavigate,
  browserScreenshot: () => browserScreenshot,
  browserType: () => browserType,
  closeAllBrowsers: () => closeAllBrowsers,
  closeBrowserSession: () => closeBrowserSession,
  getActiveBrowserSessions: () => getActiveBrowserSessions
});
async function getPlaywright() {
  if (playwrightChromium) return playwrightChromium;
  if (playwrightError) throw playwrightError;
  try {
    const pw = await import("playwright");
    playwrightChromium = pw.chromium;
    return playwrightChromium;
  } catch (err) {
    playwrightError = err;
    throw playwrightError;
  }
}
async function getOrCreateSession(sessionId, headless = true) {
  const existing = browserPool.get(sessionId);
  if (existing) {
    try {
      await existing.page.evaluate(() => document.title);
      return existing;
    } catch {
      await closeBrowserSession(sessionId);
    }
  }
  const chromium = await getPlaywright();
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    permissions: [],
    bypassCSP: false,
    ignoreHTTPSErrors: false
  });
  await context.route("**/*", (route, request) => {
    const url = request.url();
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
        route.abort("blockedbyclient");
        return;
      }
    } catch {
    }
    route.continue();
  });
  const page = await context.newPage();
  const session = { browser, context, page, createdAt: Date.now() };
  browserPool.set(sessionId, session);
  return session;
}
async function closeBrowserSession(sessionId) {
  const session = browserPool.get(sessionId);
  if (!session) return;
  try {
    await session.context.close();
    await session.browser.close();
  } catch {
  }
  browserPool.delete(sessionId);
}
async function closeAllBrowsers() {
  for (const [sessionId] of browserPool) {
    await closeBrowserSession(sessionId);
  }
}
function validateBrowserUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Only HTTP and HTTPS URLs are allowed for security";
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.") || hostname.endsWith(".local")) {
      return "Navigation to local/internal addresses is blocked for security";
    }
    return null;
  } catch {
    return "Invalid URL";
  }
}
async function browserNavigate(sessionId, url, headless = true) {
  const validationError = validateBrowserUrl(url);
  if (validationError) {
    return { success: false, output: "", error: validationError };
  }
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.goto(url, { waitUntil: "networkidle", timeout: 3e4 });
    const title = await page.title();
    return { success: true, output: `Navigated to ${url}. Page title: "${title}"` };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserClick(sessionId, selector, headless = true) {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.locator(selector).click({ timeout: 1e4 });
    return { success: true, output: `Clicked element: ${selector}` };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserType(sessionId, selector, text, headless = true) {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.locator(selector).fill(text);
    return { success: true, output: `Typed "${text}" into ${selector}` };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserScreenshot(sessionId, headless = true) {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    const base64 = screenshot.toString("base64");
    return { success: true, output: `Screenshot captured (${screenshot.length} bytes)`, base64 };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserEvaluate(sessionId, script, headless = true) {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    if (script.length > 1e5) {
      return { success: false, output: "", error: "Script exceeds maximum length" };
    }
    const result = await page.evaluate((code) => {
      try {
        const retval = globalThis.eval(code);
        return { __ok: true, __value: retval };
      } catch (e) {
        return { __ok: false, __error: e instanceof Error ? e.message : String(e) };
      }
    }, script);
    if (result && typeof result === "object") {
      if (result.__ok === false) {
        return { success: false, output: "", error: result.__error ?? "Unknown error" };
      }
      const output2 = typeof result.__value === "string" ? result.__value : JSON.stringify(result.__value, null, 2);
      return { success: true, output: output2 || "undefined" };
    }
    const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { success: true, output: output || "undefined" };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserGetHtml(sessionId, headless = true) {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    const html = await page.content();
    return { success: true, output: html };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function browserClose(sessionId) {
  await closeBrowserSession(sessionId);
  return { success: true, output: "Browser closed for session." };
}
function getActiveBrowserSessions() {
  return Array.from(browserPool.keys());
}
var browserPool, playwrightChromium, playwrightError;
var init_browserTools = __esm({
  "src/server/browserTools.ts"() {
    "use strict";
    init_errors();
    browserPool = /* @__PURE__ */ new Map();
    playwrightChromium = null;
    playwrightError = null;
    process.on("exit", () => {
      for (const [, session] of browserPool) {
        try {
          session.browser.close();
        } catch {
        }
      }
    });
    process.on("SIGINT", async () => {
      await closeAllBrowsers();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await closeAllBrowsers();
      process.exit(0);
    });
  }
});

// src/server/sessionStore.ts
var sessionStore_exports = {};
__export(sessionStore_exports, {
  addMessage: () => addMessage,
  createSession: () => createSession,
  deleteSession: () => deleteSession,
  getDb: () => getDb2,
  getSession: () => getSession,
  listSessions: () => listSessions,
  searchSessions: () => searchSessions,
  setSessionDbPath: () => setSessionDbPath
});
function loadJson2() {
  try {
    if (fs3.existsSync(_jsonPath2)) {
      const raw = fs3.readFileSync(_jsonPath2, "utf-8");
      const data = JSON.parse(raw);
      _sessions = data.sessions || [];
      _messages = data.messages || [];
    }
  } catch {
  }
}
function saveJson2() {
  try {
    fs3.mkdirSync(path7.dirname(_jsonPath2), { recursive: true });
    const data = { sessions: _sessions, messages: _messages };
    fs3.writeFileSync(_jsonPath2, JSON.stringify(data, null, 2));
  } catch {
  }
}
function fallbackGetDb2() {
  if (!_jsonPath2) {
    _jsonPath2 = path7.join(_dbPath2.replace(/\.db$/, "") + "-fallback.json");
    loadJson2();
  }
  return {
    prepare: (sql) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("insert into sessions")) {
        const stmt2 = {
          run: (...args) => {
            const id = args[0];
            const title = args[1];
            const createdAt = args[2];
            const updatedAt = args[3];
            _sessions.push({ id, title, createdAt, updatedAt });
            saveJson2();
            return { lastInsertRowid: _sessions.length, changes: 1 };
          }
        };
        return stmt2;
      }
      if (trimmed.startsWith("insert into messages")) {
        const stmt2 = {
          run: (...args) => {
            const id = args[0];
            const sessionId = args[1];
            const role = args[2];
            const content = args[3];
            const createdAt = args[4];
            _messages.push({ id, sessionId, role, content, createdAt });
            saveJson2();
            return { lastInsertRowid: _messages.length, changes: 1 };
          }
        };
        return stmt2;
      }
      if (trimmed.startsWith("insert into messages_fts")) {
        const stmt2 = {
          run: () => ({ lastInsertRowid: 0, changes: 0 })
        };
        return stmt2;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from sessions where id =")) {
        const stmt2 = {
          get: (id) => _sessions.find((s) => s.id === id) || void 0
        };
        return stmt2;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from messages where session_id =")) {
        const stmt2 = {
          all: (sessionId) => _messages.filter((m) => m.sessionId === sessionId)
        };
        return stmt2;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from sessions order by updated_at desc")) {
        const stmt2 = {
          all: () => [..._sessions].sort((a, b) => b.updatedAt - a.updatedAt)
        };
        return stmt2;
      }
      if (trimmed.startsWith("update sessions set updated_at")) {
        const stmt2 = {
          run: (updatedAt, id) => {
            const s = _sessions.find((s2) => s2.id === id);
            if (s) s.updatedAt = updatedAt;
            saveJson2();
            return { lastInsertRowid: 0, changes: 1 };
          }
        };
        return stmt2;
      }
      if (trimmed.startsWith("delete from sessions where id =")) {
        const stmt2 = {
          run: (id) => {
            _sessions = _sessions.filter((s) => s.id !== id);
            _messages = _messages.filter((m) => m.sessionId !== id);
            saveJson2();
            return { lastInsertRowid: 0, changes: 1 };
          }
        };
        return stmt2;
      }
      if (trimmed.startsWith("select name from sqlite_master")) {
        const stmt2 = {
          get: () => void 0
        };
        return stmt2;
      }
      const stmt = {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => void 0,
        all: () => []
      };
      return stmt;
    },
    exec: () => {
    },
    pragma: () => {
    }
  };
}
function setSessionDbPath(dir) {
  _dbPath2 = path7.join(dir, "sessions.db");
  _db2 = null;
  if (_useFallback2) {
    _jsonPath2 = path7.join(dir, "sessions-fallback.json");
    loadJson2();
  }
}
function getDb2() {
  if (!_db2) {
    try {
      const DatabaseClass = require("better-sqlite3");
      const db = new DatabaseClass(_dbPath2);
      db.pragma("journal_mode = WAL");
      initSchema2(db);
      _db2 = db;
    } catch {
      _useFallback2 = true;
      _db2 = fallbackGetDb2();
    }
  }
  return _db2;
}
function initSchema2(db) {
  if (_useFallback2) return;
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
function createSession(title) {
  const db = getDb2();
  const id = (0, import_crypto2.randomUUID)();
  const now = Date.now();
  const session = { id, title, createdAt: now, updatedAt: now };
  db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, title, now, now);
  if (_useFallback2) saveJson2();
  return session;
}
function addMessage(sessionId, role, content) {
  const db = getDb2();
  const id = (0, import_crypto2.randomUUID)();
  const now = Date.now();
  const insertResult = db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(id, sessionId, role, content, now);
  if (!_useFallback2) {
    db.prepare("INSERT INTO messages_fts (rowid, content, session_id) VALUES (?, ?, ?)").run(
      insertResult.lastInsertRowid,
      content,
      sessionId
    );
  }
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
  if (_useFallback2) saveJson2();
  return { id, sessionId, role, content, createdAt: now };
}
function getSession(sessionId) {
  const db = getDb2();
  const session = db.prepare("SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const rows = db.prepare("SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC").all(sessionId);
  return {
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    },
    messages: rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      createdAt: r.created_at
    }))
  };
}
function listSessions() {
  const db = getDb2();
  const rows = db.prepare("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC").all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}
function searchSessions(query, limit = 20) {
  if (_useFallback2) {
    const q = query.toLowerCase();
    const results = [];
    for (const m of _messages) {
      if (m.content.toLowerCase().includes(q)) {
        const s = _sessions.find((s2) => s2.id === m.sessionId);
        if (s) {
          results.push({
            sessionId: s.id,
            sessionTitle: s.title,
            messageId: m.id,
            role: m.role,
            snippet: m.content.slice(0, 100),
            createdAt: m.createdAt
          });
        }
      }
    }
    return results.slice(0, limit);
  }
  const db = getDb2();
  if (!query.trim()) return [];
  const rows = db.prepare(
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
  ).all(query, limit);
  return rows.map((r) => ({
    sessionId: r.sessionId,
    sessionTitle: r.sessionTitle,
    messageId: r.messageId,
    role: r.role,
    snippet: r.snippet,
    createdAt: r.createdAt
  }));
}
function deleteSession(sessionId) {
  const db = getDb2();
  if (_useFallback2) {
    _sessions = _sessions.filter((s) => s.id !== sessionId);
    _messages = _messages.filter((m) => m.sessionId !== sessionId);
    saveJson2();
    return;
  }
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  const messageRowids = db.prepare("SELECT rowid FROM messages WHERE session_id = ?").all(sessionId);
  for (const { rowid } of messageRowids) {
    db.prepare("DELETE FROM messages_fts WHERE rowid = ?").run(rowid);
  }
  db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
}
var path7, import_crypto2, fs3, _dbPath2, _db2, _useFallback2, _sessions, _messages, _jsonPath2;
var init_sessionStore = __esm({
  "src/server/sessionStore.ts"() {
    "use strict";
    path7 = __toESM(require("path"), 1);
    import_crypto2 = require("crypto");
    fs3 = __toESM(require("fs"), 1);
    _dbPath2 = path7.resolve(process.cwd(), ".opencode-infinite", "sessions.db");
    _db2 = null;
    _useFallback2 = false;
    _sessions = [];
    _messages = [];
    _jsonPath2 = "";
  }
});

// src/server/p2pSync.ts
var p2pSync_exports = {};
__export(p2pSync_exports, {
  closeP2PSync: () => closeP2PSync,
  decryptP2P: () => decryptP2P,
  encryptP2P: () => encryptP2P,
  getPeers: () => getPeers,
  getShares: () => getShares,
  isP2PActive: () => isP2PActive,
  publishShare: () => publishShare,
  removeShare: () => removeShare,
  setupP2PSync: () => setupP2PSync
});
function deriveKey(secret) {
  return (0, import_crypto6.scryptSync)(secret, "p2p-sync-salt-v1", 32);
}
function encryptP2P(plaintext, secret) {
  const iv = (0, import_crypto6.randomBytes)(16);
  const key = deriveKey(secret);
  const cipher = (0, import_crypto6.createCipheriv)("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
function decryptP2P(payload, secret) {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const key = deriveKey(secret);
  const decipher = (0, import_crypto6.createDecipheriv)("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}
function generatePeerId() {
  return `peer-${(0, import_crypto6.randomBytes)(8).toString("hex")}`;
}
function broadcast(data, exclude) {
  for (const [id, ws] of peers) {
    if (id !== exclude && ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(data);
    }
  }
}
function sendTo(peerId, data) {
  const ws = peers.get(peerId);
  if (ws?.readyState === import_ws.WebSocket.OPEN) {
    ws.send(data);
  }
}
async function loadSharedStore() {
  try {
    const raw = await (0, import_promises13.readFile)(STORAGE_FILE, "utf-8");
    const items2 = JSON.parse(raw);
    for (const item of items2) {
      sharedStore.set(item.id, item);
    }
  } catch {
  }
}
async function saveSharedStore() {
  await (0, import_promises13.mkdir)(path17.dirname(STORAGE_FILE), { recursive: true });
  const items2 = Array.from(sharedStore.values());
  await (0, import_promises13.writeFile)(STORAGE_FILE, JSON.stringify(items2, null, 2), "utf-8");
}
function setupP2PSync(server, config) {
  if (!config.enabled) return;
  p2pConfig = config;
  wss = new import_ws.WebSocketServer({ server, path: "/p2p" });
  wss.on("connection", (ws, req) => {
    const peerId = generatePeerId();
    peers.set(peerId, ws);
    peerInfo.set(peerId, {
      id: peerId,
      name: req.headers["x-peer-name"] || peerId.slice(0, 8),
      connectedAt: Date.now()
    });
    ws.send(JSON.stringify({
      type: "welcome",
      peerId,
      peers: Array.from(peerInfo.values()),
      sharedCount: sharedStore.size
    }));
    broadcast(JSON.stringify({ type: "peer_joined", peer: peerInfo.get(peerId) }), peerId);
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(peerId, msg);
      } catch {
      }
    });
    ws.on("close", () => {
      peers.delete(peerId);
      const info = peerInfo.get(peerId);
      peerInfo.delete(peerId);
      broadcast(JSON.stringify({ type: "peer_left", peerId, peer: info }));
    });
    ws.on("error", () => {
      peers.delete(peerId);
      peerInfo.delete(peerId);
    });
  });
  loadSharedStore().catch(() => {
  });
}
async function handleMessage(peerId, msg) {
  switch (msg.type) {
    case "chat": {
      broadcast(JSON.stringify({
        type: "chat",
        peerId,
        text: msg.text,
        timestamp: Date.now()
      }));
      break;
    }
    case "share": {
      const fragment = {
        id: `${msg.shareType}-${Date.now()}-${(0, import_crypto6.randomBytes)(4).toString("hex")}`,
        type: msg.shareType,
        name: msg.name,
        content: msg.content,
        author: peerId,
        timestamp: Date.now(),
        signature: encryptP2P(
          `${msg.shareType}:${msg.name}:${peerId}`,
          p2pConfig.secret
        ).slice(0, 32)
      };
      sharedStore.set(fragment.id, fragment);
      await saveSharedStore();
      broadcast(JSON.stringify({ type: "new_share", fragment }), peerId);
      break;
    }
    case "request_share": {
      const fragment = sharedStore.get(msg.id);
      if (fragment) {
        sendTo(peerId, JSON.stringify({ type: "share_data", fragment }));
      }
      break;
    }
    case "list_shares": {
      sendTo(peerId, JSON.stringify({
        type: "share_list",
        shares: Array.from(sharedStore.values()).filter(
          (s) => !msg.filter || s.type === msg.filter
        )
      }));
      break;
    }
    case "ping": {
      sendTo(peerId, JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;
    }
  }
}
function getPeers() {
  return Array.from(peerInfo.values());
}
function getShares(type) {
  const items2 = Array.from(sharedStore.values());
  if (type) return items2.filter((s) => s.type === type);
  return items2;
}
function publishShare(type, name, content) {
  const fragment = {
    id: `${type}-${Date.now()}-${(0, import_crypto6.randomBytes)(4).toString("hex")}`,
    type,
    name,
    content,
    author: "self",
    timestamp: Date.now(),
    signature: encryptP2P(`${type}:${name}:self`, p2pConfig?.secret || "local").slice(0, 32)
  };
  sharedStore.set(fragment.id, fragment);
  saveSharedStore().catch(() => {
  });
  broadcast(JSON.stringify({ type: "new_share", fragment }));
  return fragment;
}
function removeShare(id) {
  const existed = sharedStore.delete(id);
  if (existed) {
    saveSharedStore().catch(() => {
    });
    broadcast(JSON.stringify({ type: "remove_share", id }));
  }
  return existed;
}
function closeP2PSync() {
  if (wss) {
    for (const [, ws] of peers) {
      ws.close();
    }
    peers.clear();
    peerInfo.clear();
    wss.close();
    wss = null;
  }
}
function isP2PActive() {
  return wss !== null;
}
var import_ws, import_crypto6, import_promises13, path17, wss, p2pConfig, peers, peerInfo, sharedStore, STORAGE_FILE;
var init_p2pSync = __esm({
  "src/server/p2pSync.ts"() {
    "use strict";
    import_ws = require("ws");
    import_crypto6 = require("crypto");
    import_promises13 = require("fs/promises");
    path17 = __toESM(require("path"), 1);
    wss = null;
    p2pConfig = null;
    peers = /* @__PURE__ */ new Map();
    peerInfo = /* @__PURE__ */ new Map();
    sharedStore = /* @__PURE__ */ new Map();
    STORAGE_FILE = path17.join(process.cwd(), ".opencode-infinite", "p2p-store.json");
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var path22 = __toESM(require("path"), 1);
var import_fs = require("fs");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/server/permissions.ts
var import_crypto = require("crypto");
var import_events = require("events");
var PermissionEngine = class {
  config;
  pending = /* @__PURE__ */ new Map();
  emitter = new import_events.EventEmitter();
  constructor(config) {
    this.config = config;
  }
  check(request) {
    let lastMatch = null;
    for (const rule of this.config.rules) {
      if (this.matches(request, rule.pattern)) {
        lastMatch = { action: rule.action, rule };
      }
    }
    return lastMatch || { action: this.config.defaultAction };
  }
  matches(request, pattern) {
    return this.globMatch(request.tool, pattern) || (request.filePath ? this.globMatch(request.filePath, pattern) : false) || (request.command ? this.globMatch(request.command, pattern) : false);
  }
  globMatch(text, pattern) {
    const regex = new RegExp(
      "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
      "i"
    );
    return regex.test(text);
  }
  createPending(request) {
    const id = (0, import_crypto.randomUUID)();
    const pending = {
      id,
      request,
      timestamp: Date.now(),
      resolved: false
    };
    this.pending.set(id, pending);
    return pending;
  }
  resolve(id, approved) {
    const pending = this.pending.get(id);
    if (pending) {
      pending.resolved = true;
      pending.approved = approved;
      this.emitter.emit(`resolved:${id}`, approved);
      setTimeout(() => this.pending.delete(id), 3e5);
    }
  }
  async waitForResolution(id, timeoutMs) {
    const pending = this.pending.get(id);
    if (!pending) return false;
    if (pending.resolved) return pending.approved ?? false;
    return new Promise((resolve12) => {
      const timer = setTimeout(() => {
        this.emitter.off(`resolved:${id}`, onResolved);
        resolve12(false);
      }, timeoutMs);
      const onResolved = (approved) => {
        clearTimeout(timer);
        resolve12(approved);
      };
      this.emitter.once(`resolved:${id}`, onResolved);
    });
  }
  getPending(id) {
    return this.pending.get(id);
  }
  listPending() {
    return Array.from(this.pending.values()).filter((p) => !p.resolved);
  }
  clearResolved() {
    for (const [id, p] of this.pending) {
      if (p.resolved) this.pending.delete(id);
    }
  }
};

// src/types/tools.ts
var TOOL_DEFINITIONS = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" }
      },
      required: ["path"]
    },
    isReadOnly: true
  },
  {
    name: "list_directory",
    description: "List files and directories at the given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the directory" }
      },
      required: ["path"]
    },
    isReadOnly: true
  },
  {
    name: "search_files",
    description: "Search for files by name or content using a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        path: { type: "string", description: "Optional relative path to limit search" }
      },
      required: ["query"]
    },
    isReadOnly: true
  },
  {
    name: "write_file",
    description: "Write or overwrite a file with the given content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        content: { type: "string", description: "Full file content" }
      },
      required: ["path", "content"]
    },
    isReadOnly: false
  },
  {
    name: "edit_file",
    description: "Edit a file by replacing an exact string with another.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        oldString: { type: "string", description: "Exact text to replace" },
        newString: { type: "string", description: "Replacement text" }
      },
      required: ["path", "oldString", "newString"]
    },
    isReadOnly: false
  },
  {
    name: "execute_command",
    description: "Execute a shell command in the project directory.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Optional working directory relative to project root" }
      },
      required: ["command"]
    },
    isReadOnly: false
  },
  {
    name: "memory_read",
    description: "Read persistent memory (project facts or user preferences).",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "'project' for MEMORY.md or 'user' for USER.md" }
      },
      required: ["type"]
    },
    isReadOnly: true
  },
  {
    name: "memory_write",
    description: "Write a fact to persistent memory. Use this to remember important discoveries, patterns, or user preferences across sessions.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "'project' for MEMORY.md or 'user' for USER.md" },
        content: { type: "string", description: "The fact or preference to remember" },
        section: { type: "string", description: "Optional section title (e.g., 'Project Facts', 'Code Patterns')" }
      },
      required: ["type", "content"]
    },
    isReadOnly: false
  },
  {
    name: "skill_list",
    description: "List all available skills (reusable workflows) in the project.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: true
  },
  {
    name: "skill_read",
    description: "Read the full content of a skill by its ID.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Skill ID" }
      },
      required: ["id"]
    },
    isReadOnly: true
  },
  {
    name: "skill_run",
    description: "Run a skill workflow by its ID. Returns the skill instructions to follow.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Skill ID" }
      },
      required: ["id"]
    },
    isReadOnly: true
  },
  {
    name: "rag_search",
    description: "Search the RAG memory for relevant context chunks matching a query.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        topK: { type: "number", description: "Number of results (default 3)" }
      },
      required: ["query"]
    },
    isReadOnly: true
  },
  {
    name: "git_status",
    description: "Get the current git status of the repository.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: true
  },
  {
    name: "git_diff",
    description: "Get the git diff for staged or unstaged changes.",
    parameters: {
      type: "object",
      properties: {
        staged: { type: "boolean", description: "Show diff for staged changes only" }
      },
      required: []
    },
    isReadOnly: true
  },
  {
    name: "git_commit",
    description: "Commit staged changes with a message.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Commit message" }
      },
      required: ["message"]
    },
    isReadOnly: false
  },
  {
    name: "git_push",
    description: "Push the current branch to the remote.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: false
  },
  {
    name: "git_log",
    description: "Get recent git commit history.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of commits to return (default 10)" }
      },
      required: []
    },
    isReadOnly: true
  },
  {
    name: "browser_navigate",
    description: "Navigate the browser to a URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: ["url"]
    },
    isReadOnly: false
  },
  {
    name: "browser_click",
    description: "Click an element on the page by CSS selector.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the element to click" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: ["selector"]
    },
    isReadOnly: false
  },
  {
    name: "browser_type",
    description: "Type text into an input element by CSS selector.",
    parameters: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector of the input element" },
        text: { type: "string", description: "Text to type" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: ["selector", "text"]
    },
    isReadOnly: false
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page and return it as base64 PNG.",
    parameters: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: []
    },
    isReadOnly: true
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript in the browser page context.",
    parameters: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript code to execute" },
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: ["script"]
    },
    isReadOnly: false
  },
  {
    name: "browser_get_html",
    description: "Get the full HTML of the current page.",
    parameters: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run in headless mode (default true)" }
      },
      required: []
    },
    isReadOnly: true
  },
  {
    name: "browser_close",
    description: "Close the browser for this session.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: false
  },
  {
    name: "git_branch",
    description: "Create a new git branch and switch to it.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Branch name" }
      },
      required: ["name"]
    },
    isReadOnly: false
  },
  {
    name: "git_branches",
    description: "List all branches (local and remote).",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: true
  },
  {
    name: "git_switch_branch",
    description: "Switch to an existing branch.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Branch name to switch to" }
      },
      required: ["name"]
    },
    isReadOnly: false
  },
  {
    name: "git_pr_context",
    description: "Gather PR context (diff, commits, files) for the current branch.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: true
  },
  {
    name: "git_create_pr",
    description: "Create a GitHub pull request with AI-generated title and description. Requires `gh` CLI installed and authenticated.",
    parameters: {
      type: "object",
      properties: {
        draft: { type: "boolean", description: "Create as draft PR (default false)" }
      },
      required: []
    },
    isReadOnly: false
  },
  {
    name: "git_list_prs",
    description: "List open pull requests.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    isReadOnly: true
  },
  {
    name: "issue_create",
    description: "Create an issue in the configured tracker (GitHub/Jira/Linear). Requires tracker config set via Settings \u2192 Integrations.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description (markdown)" },
        priority: { type: "string", description: "Issue priority: low, medium, high, or urgent" },
        labels: { type: "array", description: "Labels to apply" }
      },
      required: ["title"]
    },
    isReadOnly: false
  },
  {
    name: "issue_list",
    description: "List issues from the configured tracker.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter by status (e.g. 'open', 'In Progress')" },
        limit: { type: "number", description: "Max issues to return (default 20)" }
      },
      required: []
    },
    isReadOnly: true
  },
  {
    name: "issue_view",
    description: "View details of a specific issue by key or number.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Issue key (e.g. '#42', 'PROJ-123', 'TEAM-456')" }
      },
      required: ["key"]
    },
    isReadOnly: true
  },
  {
    name: "issue_comment",
    description: "Add a comment to an issue.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Issue key or number" },
        body: { type: "string", description: "Comment text (markdown)" }
      },
      required: ["key", "body"]
    },
    isReadOnly: false
  }
];
var READ_ONLY_TOOLS = new Set(
  TOOL_DEFINITIONS.filter((t) => t.isReadOnly).map((t) => t.name)
);
var ALL_TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);

// src/server/hooks.ts
init_errors();
var HookRegistry = class {
  hooks = /* @__PURE__ */ new Map();
  register(reg) {
    const existing = this.hooks.get(reg.hookPoint) || [];
    existing.push(reg);
    existing.sort((a, b) => b.priority - a.priority);
    this.hooks.set(reg.hookPoint, existing);
  }
  unregister(id) {
    for (const [point, regs] of this.hooks) {
      this.hooks.set(
        point,
        regs.filter((r) => r.id !== id)
      );
    }
  }
  async execute(hookPoint, data, sessionId) {
    const regs = this.hooks.get(hookPoint) || [];
    const ctx = { hookPoint, data, timestamp: Date.now(), sessionId };
    for (const reg of regs) {
      try {
        await reg.handler(ctx);
      } catch (err) {
        console.error(`Hook ${reg.id} failed at ${hookPoint}:`, getErrorMessage(err));
      }
    }
  }
  list(hookPoint) {
    if (hookPoint) return this.hooks.get(hookPoint) || [];
    return Array.from(this.hooks.values()).flat();
  }
};
var hookRegistry = new HookRegistry();
function registerBuiltinHooks() {
  hookRegistry.register({
    id: "builtin.log-tools",
    hookPoint: "tool.after",
    priority: 0,
    handler: (ctx) => {
      console.log(
        `[HOOK] Tool executed:`,
        ctx.data.tool,
        "Result:",
        ctx.data.result?.substring?.(0, 100)
      );
    }
  });
  hookRegistry.register({
    id: "builtin.log-files",
    hookPoint: "file.write.after",
    priority: 0,
    handler: (ctx) => {
      console.log(`[HOOK] File written:`, ctx.data.path);
    }
  });
}

// src/server/customToolLoader.ts
var import_promises = require("fs/promises");
var path = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var import_util = require("util");
init_errors();
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
var TOOLS_DIR = path.resolve(process.cwd(), ".cvr", "tools");
var _toolsDir = TOOLS_DIR;
function setCustomToolsDir(dir) {
  _toolsDir = dir;
}
async function loadCustomTools() {
  try {
    await (0, import_promises.access)(_toolsDir);
  } catch {
    return [];
  }
  const entries = await (0, import_promises.readdir)(_toolsDir, { withFileTypes: true });
  const tools = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(_toolsDir, entry.name);
    try {
      const raw = await (0, import_promises.readFile)(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.id && parsed.name && parsed.handler) {
        if (parsed.handler.type === "node") {
          console.warn(
            `Custom tool ${parsed.id}: "node" handler type is disabled for security. Use "command" only.`
          );
          continue;
        }
        tools.push(parsed);
      }
    } catch {
    }
  }
  return tools;
}
function shellEscape(str) {
  if (/^[a-zA-Z0-9_./:@~-]+$/.test(str)) return str;
  return "'" + str.replace(/'/g, `'"'"'`) + "'";
}
async function executeCustomTool(definition, params) {
  try {
    if (definition.handler.type === "command") {
      let command = definition.handler.template;
      for (const [key, value] of Object.entries(params)) {
        command = command.replace(new RegExp(`\\{${key}\\}`, "g"), shellEscape(String(value)));
      }
      const cwd = definition.handler.cwd ? path.resolve(process.cwd(), definition.handler.cwd) : process.cwd();
      if (/[;&|`$(){}[\]<>!\\]/.test(command)) {
        return { success: false, output: "", error: "Command contains unsafe shell metacharacters" };
      }
      const { stdout, stderr } = await execFileAsync("sh", ["-c", command], {
        cwd,
        encoding: "utf-8",
        timeout: 3e4,
        maxBuffer: 1024 * 1024
      });
      return { success: true, output: (stdout + (stderr ? "\n" + stderr : "")).trim() };
    }
    return { success: false, output: "", error: "Unknown or disabled handler type" };
  } catch (e) {
    return { success: false, output: "", error: getErrorMessage(e) };
  }
}

// src/server/issueTracker.ts
var trackerConfig = null;
function setTrackerConfig(config) {
  trackerConfig = config;
}
async function createIssue(input) {
  if (!trackerConfig) throw new Error("Issue tracker not configured");
  switch (trackerConfig.type) {
    case "github":
      return createGitHubIssue(input);
    case "jira":
      return createJiraIssue(input);
    case "linear":
      return createLinearIssue(input);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}
async function listIssues(status, limit = 20) {
  if (!trackerConfig) throw new Error("Issue tracker not configured");
  switch (trackerConfig.type) {
    case "github":
      return listGitHubIssues(status, limit);
    case "jira":
      return listJiraIssues(status, limit);
    case "linear":
      return listLinearIssues(status, limit);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}
async function getIssue(issueKey) {
  if (!trackerConfig) throw new Error("Issue tracker not configured");
  switch (trackerConfig.type) {
    case "github":
      return getGitHubIssue(issueKey);
    case "jira":
      return getJiraIssue(issueKey);
    case "linear":
      return getLinearIssue(issueKey);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}
async function addComment(issueKey, body) {
  if (!trackerConfig) throw new Error("Issue tracker not configured");
  switch (trackerConfig.type) {
    case "github":
      await githubRequest(`/repos/${trackerConfig.repo}/issues/${issueKey}/comments`, "POST", { body });
      return;
    case "jira":
      await jiraRequest(`/issue/${issueKey}/comment`, "POST", { body });
      return;
    case "linear":
      await linearRequest("mutation CreateComment { commentCreate(input: { issueId: " + JSON.stringify(issueKey) + ", body: " + JSON.stringify(body) + " }) { success } }");
      return;
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}
async function githubRequest(path23, method = "GET", body) {
  const url = path23.startsWith("http") ? path23 : `https://api.github.com${path23}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${trackerConfig.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res;
}
async function createGitHubIssue(input) {
  const res = await githubRequest(`/repos/${trackerConfig.repo}/issues`, "POST", {
    title: input.title,
    body: input.description,
    labels: input.labels
  });
  const data = await res.json();
  return {
    id: String(data.number),
    key: `#${data.number}`,
    title: data.title,
    description: data.body || "",
    status: data.state,
    priority: input.priority || null,
    url: data.html_url,
    updatedAt: data.updated_at
  };
}
async function listGitHubIssues(status, limit = 20) {
  const q = status ? `state=${status}` : "state=open";
  const res = await githubRequest(`/repos/${trackerConfig.repo}/issues?${q}&per_page=${limit}`);
  const data = await res.json();
  return data.map((i) => ({
    id: String(i.number),
    key: `#${i.number}`,
    title: i.title,
    description: i.body || "",
    status: i.state,
    priority: i.labels?.find((l) => l.name?.startsWith("priority:"))?.name || null,
    url: i.html_url,
    updatedAt: i.updated_at
  }));
}
async function getGitHubIssue(number) {
  const res = await githubRequest(`/repos/${trackerConfig.repo}/issues/${number}`);
  const i = await res.json();
  return {
    id: String(i.number),
    key: `#${i.number}`,
    title: i.title,
    description: i.body || "",
    status: i.state,
    priority: null,
    url: i.html_url,
    updatedAt: i.updated_at
  };
}
async function jiraRequest(path23, method = "GET", body) {
  const base = trackerConfig.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/api/3${path23}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${trackerConfig.token}:`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  return res;
}
async function createJiraIssue(input) {
  const priorityMap = { low: "Low", medium: "Medium", high: "High", urgent: "Highest" };
  const res = await jiraRequest("/issue", "POST", {
    fields: {
      project: { key: trackerConfig.project },
      summary: input.title,
      description: input.description ? { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: input.description }] }] } : void 0,
      issuetype: { name: "Task" },
      priority: input.priority ? { name: priorityMap[input.priority] } : void 0,
      labels: input.labels
    }
  });
  const data = await res.json();
  return {
    id: data.id,
    key: data.key,
    title: data.fields.summary,
    description: input.description || "",
    status: data.fields.status?.name || "To Do",
    priority: data.fields.priority?.name || null,
    url: `${trackerConfig.baseUrl}/browse/${data.key}`,
    updatedAt: data.fields.updated
  };
}
async function listJiraIssues(status, limit = 20) {
  const jql = `project=${trackerConfig.project}${status ? ` AND status="${status}"` : ""}`;
  const res = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`);
  const data = await res.json();
  return (data.issues || []).map((i) => ({
    id: i.id,
    key: i.key,
    title: i.fields.summary,
    description: "",
    status: i.fields.status?.name || "Unknown",
    priority: i.fields.priority?.name || null,
    url: `${trackerConfig.baseUrl}/browse/${i.key}`,
    updatedAt: i.fields.updated
  }));
}
async function getJiraIssue(key) {
  const res = await jiraRequest(`/issue/${key}`);
  const i = (await res.json()).fields;
  return {
    id: key,
    key,
    title: i.summary,
    description: i.description?.content?.[0]?.content?.[0]?.text || "",
    status: i.status?.name || "Unknown",
    priority: i.priority?.name || null,
    url: `${trackerConfig.baseUrl}/browse/${key}`,
    updatedAt: i.updated
  };
}
async function linearRequest(query, variables) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: trackerConfig.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) throw new Error(`Linear API: ${JSON.stringify(data.errors)}`);
  return data.data;
}
async function createLinearIssue(input) {
  const priorityNum = { low: 1, medium: 2, high: 3, urgent: 4 };
  const data = await linearRequest(
    `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id identifier title description state { name } priority priorityLabel url updatedAt } } }`,
    {
      input: {
        teamId: trackerConfig.project,
        title: input.title,
        description: input.description,
        priority: input.priority ? priorityNum[input.priority] : void 0
      }
    }
  );
  const i = data.issueCreate.issue;
  return {
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Backlog",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt
  };
}
async function listLinearIssues(status, limit = 20) {
  const q = status ? `(state: { name: { eq: "${status}" } })` : "";
  const data = await linearRequest(
    `query Issues($first: Int!) { issues(first: $first, filter: ${q || "{}"}) { nodes { id identifier title description state { name } priorityLabel url updatedAt } } }`,
    { first: limit }
  );
  return (data.issues.nodes || []).map((i) => ({
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Unknown",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt
  }));
}
async function getLinearIssue(id) {
  const data = await linearRequest(
    `query Issue($id: String!) { issue(id: $id) { id identifier title description state { name } priorityLabel url updatedAt } }`,
    { id }
  );
  const i = data.issue;
  return {
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Unknown",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt
  };
}

// src/server/tools.ts
init_errors();

// src/server/tools/file.ts
var import_promises2 = require("fs/promises");
var path2 = __toESM(require("path"), 1);
var PROJECT_ROOT = process.cwd();
function resolveProjectPath(requestedPath) {
  const resolved = path2.resolve(PROJECT_ROOT, requestedPath);
  const relative4 = path2.relative(PROJECT_ROOT, resolved);
  if (relative4.startsWith("..") || path2.isAbsolute(relative4)) {
    throw new Error("Path escapes project root: " + requestedPath);
  }
  return resolved;
}
async function searchDir(dir, query) {
  const entries = await (0, import_promises2.readdir)(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path2.join(dir, entry.name);
    const relPath = path2.relative(PROJECT_ROOT, fullPath);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      results.push(...await searchDir(fullPath, query));
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase().includes(query)) {
        results.push(`[MATCH] ${relPath} (filename)`);
      } else {
        try {
          const content = await (0, import_promises2.readFile)(fullPath, "utf-8");
          if (content.toLowerCase().includes(query)) {
            results.push(`[MATCH] ${relPath} (content)`);
          }
        } catch {
        }
      }
    }
  }
  return results;
}
async function executeReadFile(params) {
  const filePath = resolveProjectPath(String(params.path));
  const content = await (0, import_promises2.readFile)(filePath, "utf-8");
  return { success: true, output: content };
}
async function executeListDirectory(params) {
  const dirPath = resolveProjectPath(String(params.path || "."));
  const entries = await (0, import_promises2.readdir)(dirPath, { withFileTypes: true });
  const lines = entries.map((e) => e.isDirectory() ? `[DIR]  ${e.name}` : `[FILE] ${e.name}`);
  return { success: true, output: lines.join("\n") };
}
async function executeSearchFiles(params) {
  const searchPath = resolveProjectPath(String(params.path || "."));
  const query = String(params.query).toLowerCase();
  const matches = await searchDir(searchPath, query);
  return { success: true, output: matches.length > 0 ? matches.join("\n") : "No matches found." };
}
async function executeWriteFile(params, sessionId = "default") {
  const writePath = resolveProjectPath(String(params.path));
  const content = String(params.content);
  await hookRegistry.execute("file.write.before", { path: writePath, content }, sessionId);
  await (0, import_promises2.mkdir)(path2.dirname(writePath), { recursive: true });
  await (0, import_promises2.writeFile)(writePath, content, "utf-8");
  await hookRegistry.execute("file.write.after", { path: writePath, content, success: true }, sessionId);
  return { success: true, output: `File written: ${String(params.path)}` };
}
async function executeEditFile(params, sessionId = "default") {
  const editPath = resolveProjectPath(String(params.path));
  const oldString = String(params.oldString);
  const newString = String(params.newString);
  const content = await (0, import_promises2.readFile)(editPath, "utf-8");
  if (!content.includes(oldString)) {
    return { success: false, output: "", error: "oldString not found in file" };
  }
  const updated = content.replace(oldString, newString);
  await hookRegistry.execute("file.write.before", { path: editPath, content: updated }, sessionId);
  await (0, import_promises2.writeFile)(editPath, updated, "utf-8");
  await hookRegistry.execute("file.write.after", { path: editPath, content: updated, success: true }, sessionId);
  return { success: true, output: `File edited: ${String(params.path)}` };
}

// src/server/tools/system.ts
var import_child_process2 = require("child_process");
var PROJECT_ROOT2 = process.cwd();
function splitArgs(cmd) {
  const args = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  for (const ch of cmd) {
    if (inQuotes) {
      if (ch === quoteChar) {
        inQuotes = false;
        continue;
      }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuotes = true;
      quoteChar = ch;
    } else if (ch === " " || ch === "	") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}
async function executeCommand(params) {
  const resolvedCwd = params.cwd !== void 0 && params.cwd !== null ? resolveProjectPath(String(params.cwd)) : PROJECT_ROOT2;
  const command = String(params.command);
  const args = splitArgs(command);
  if (args.length === 0) {
    return { success: false, output: "", error: "Empty command" };
  }
  const [program, ...programArgs] = args;
  const timeoutMs = 3e4;
  return new Promise((resolve12) => {
    let settled = false;
    const child = (0, import_child_process2.spawn)(program, programArgs, { cwd: resolvedCwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdoutData = "";
    let stderrData = "";
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        resolve12({ success: false, output: "", error: "Command timed out after 30s" });
      }
    }, timeoutMs);
    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve12({ success: false, output: "", error: err.message });
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve12({ success: code === 0, output: stdoutData + (stderrData ? "\n" + stderrData : "") });
      }
    });
  });
}

// src/server/memoryStore.ts
var import_promises3 = require("fs/promises");
var path3 = __toESM(require("path"), 1);
var _memoryDir = path3.resolve(process.cwd(), ".opencode-infinite");
var _memCache = null;
var _userCache = null;
var _contextCache = null;
var _contextTimestamp = 0;
function getMemoryPath() {
  return path3.join(_memoryDir, "MEMORY.md");
}
function getUserPath() {
  return path3.join(_memoryDir, "USER.md");
}
function parseMemoryMarkdown(raw) {
  const sections = [];
  const lines = raw.split("\n");
  let current = null;
  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch && headingMatch[2]) {
      if (current) sections.push(current);
      current = { title: headingMatch[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return { sections, raw };
}
async function ensureFile(filePath, defaultContent) {
  try {
    await (0, import_promises3.access)(filePath);
    const current = await (0, import_promises3.readFile)(filePath, "utf-8");
    const oldDefault = `# Project Memory

## Project Facts

## Architecture Decisions

## Code Patterns

## Known Issues
`;
    const oldUserDefault = `# User Preferences

## Coding Style

## Tech Stack Preferences

## Communication Preferences
`;
    if (current.trim() === oldDefault.trim() || current.trim() === oldUserDefault.trim()) {
      await (0, import_promises3.writeFile)(filePath, defaultContent, "utf-8");
    }
  } catch {
    await (0, import_promises3.writeFile)(filePath, defaultContent, "utf-8");
  }
}
async function readMemory() {
  const memoryPath = getMemoryPath();
  await ensureFile(
    memoryPath,
    `# Project Memory

## Project Overview
- **Name:** cvr.name.coder
- **Type:** VS Code Extension / AI Coding Agent
- **Stack:** TypeScript, React, Express, Vite
- **Description:** Autonomous AI coding agent with multi-provider support, streaming responses, persistent memory, and skills system.

## Architecture
- Dual entry points: \`server.ts\` (standalone) and \`vscode/src/extension.ts\` (VS Code extension)
- Shared code in \`src/server/\` directory
- Frontend: React with Vite, components in \`src/components/\`
- AI providers: Gemini, OpenAI, Anthropic, DeepSeek, Groq, local LLMs
- Memory system: MEMORY.md / USER.md with auto-compression

## Key Files
| File | Purpose |
|------|---------|
| \`server.ts\` | Standalone Express server |
| \`vscode/src/extension.ts\` | VS Code extension entry |
| \`src/server/tools.ts\` | Tool execution logic |
| \`src/server/prompts.ts\` | System prompt builder |
| \`src/server/agentLoop.ts\` | Autonomous agent loop |
| \`src/hooks/useChat.ts\` | Chat state management |
| \`src/App.tsx\` | Main UI component |

## Code Patterns
- TypeScript strict mode, no \`any\` types
- React functional components with hooks
- Zod for runtime validation
- SSE for streaming responses
- Atomic file writes via temp files

## Known Issues
- Some tests are flaky (network-dependent)
- Duplicate code patterns being migrated to shared modules
- Memory compression threshold may need tuning

## Commands
- \`npm run dev\` \u2014 Start dev server
- \`npm test\` \u2014 Run tests
- \`npm run type-check\` \u2014 TypeScript validation
- \`npm run build\` \u2014 Production build
`
  );
  if (_memCache && _memCache.mtime === (await (0, import_promises3.stat)(memoryPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs) {
    return _memCache.data;
  }
  const raw = await (0, import_promises3.readFile)(memoryPath, "utf-8");
  const data = parseMemoryMarkdown(raw);
  _memCache = { data, mtime: (await (0, import_promises3.stat)(memoryPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs };
  return data;
}
async function writeMemory(content, section) {
  const data = await readMemory();
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const entry = `- [${timestamp}] ${content}`;
  if (section) {
    const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
    if (target) {
      target.lines.push(entry);
    } else {
      data.sections.push({ title: section, lines: [entry] });
    }
  } else {
    const facts = data.sections.find((s) => s.title.toLowerCase() === "project facts");
    if (facts) {
      facts.lines.push(entry);
    } else {
      data.sections.push({ title: "Project Facts", lines: [entry] });
    }
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
  _memCache = null;
  _contextCache = null;
}
async function replaceMemorySection(section, lines) {
  const data = await readMemory();
  const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
  if (target) {
    target.lines = lines.filter((l) => l.trim() !== "");
  } else {
    data.sections.push({ title: section, lines: lines.filter((l) => l.trim() !== "") });
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
  _memCache = null;
  _contextCache = null;
}
async function deleteMemorySection(section) {
  const data = await readMemory();
  data.sections = data.sections.filter((s) => s.title.toLowerCase() !== section.toLowerCase());
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
  _memCache = null;
  _contextCache = null;
}
async function readUser() {
  const userPath = getUserPath();
  await ensureFile(
    userPath,
    `# User Preferences

## Coding Style
- Use TypeScript strict mode
- Prefer functional React components with hooks
- Use \`cn()\` utility for conditional CSS classes
- Follow existing code patterns in the project
- No unnecessary comments \u2014 code should be self-documenting
- Use Zod for runtime validation of API inputs

## Tech Stack Preferences
- TypeScript 5.x with ES modules
- React 18+ with functional components
- Express.js for backend APIs
- Vite for frontend bundling
- Vitest for testing (not Jest)
- TailwindCSS for styling (via utility classes)

## Communication Preferences
- Be concise \u2014 answer in 1-3 sentences when possible
- Use Russian when communicating with the user
- Show code changes before applying them
- Run type-check (\`npx tsc --noEmit\`) after each change
- Delete precompiled .js/.d.ts files in src/ \u2014 let Vite compile .tsx directly

## Common Tasks
- \`npm run type-check\` \u2014 verify TypeScript
- \`npm test\` \u2014 run test suite
- \`npm run dev\` \u2014 start development server
`
  );
  if (_userCache && _userCache.mtime === (await (0, import_promises3.stat)(userPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs) {
    return _userCache.data;
  }
  const raw = await (0, import_promises3.readFile)(userPath, "utf-8");
  const data = parseMemoryMarkdown(raw);
  _userCache = { data, mtime: (await (0, import_promises3.stat)(userPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs };
  return data;
}
async function writeUser(content, section) {
  const data = await readUser();
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const entry = `- [${timestamp}] ${content}`;
  if (section) {
    const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
    if (target) {
      target.lines.push(entry);
    } else {
      data.sections.push({ title: section, lines: [entry] });
    }
  } else {
    const style = data.sections.find((s) => s.title.toLowerCase() === "coding style");
    if (style) {
      style.lines.push(entry);
    } else {
      data.sections.push({ title: "Coding Style", lines: [entry] });
    }
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
  _userCache = null;
  _contextCache = null;
}
async function replaceUserSection(section, lines) {
  const data = await readUser();
  const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
  if (target) {
    target.lines = lines.filter((l) => l.trim() !== "");
  } else {
    data.sections.push({ title: section, lines: lines.filter((l) => l.trim() !== "") });
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
  _userCache = null;
  _contextCache = null;
}
async function deleteUserSection(section) {
  const data = await readUser();
  data.sections = data.sections.filter((s) => s.title.toLowerCase() !== section.toLowerCase());
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
  _userCache = null;
  _contextCache = null;
}
async function atomicWriteFile(filePath, content) {
  const tmp = filePath + ".tmp";
  await (0, import_promises3.writeFile)(tmp, content, "utf-8");
  await (0, import_promises3.rename)(tmp, filePath);
}
function rebuildMarkdown(sections) {
  const lines = ["# Project Memory\n"];
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push(...section.lines.filter((l) => l.trim() !== ""));
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}
async function getMemoryContext() {
  if (_contextCache && Date.now() - _contextTimestamp < 1e4) return _contextCache;
  const [memory, user] = await Promise.all([readMemory(), readUser()]);
  const parts = [];
  if (memory.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## Project Memory\n" + memory.raw.replace(/^# Project Memory\n?/i, "").trim());
  }
  if (user.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## User Preferences\n" + user.raw.replace(/^# User Preferences\n?/i, "").trim());
  }
  _contextCache = parts.join("\n\n---\n\n");
  _contextTimestamp = Date.now();
  return _contextCache;
}

// src/server/tools/memory.ts
async function executeMemoryRead(params) {
  const memoryType = String(params.type);
  if (memoryType === "user") {
    const userData = await readUser();
    return { success: true, output: userData.raw };
  } else {
    const memData = await readMemory();
    return { success: true, output: memData.raw };
  }
}
async function executeMemoryWrite(params) {
  const memoryType = String(params.type);
  const content = String(params.content);
  const section = params.section ? String(params.section) : void 0;
  if (memoryType === "user") {
    await writeUser(content, section);
    return { success: true, output: "User preference recorded." };
  } else {
    await writeMemory(content, section);
    return { success: true, output: "Project memory recorded." };
  }
}

// src/server/skillLoader.ts
var import_promises4 = require("fs/promises");
var path4 = __toESM(require("path"), 1);
var SKILLS_DIR = path4.resolve(process.cwd(), ".cvr", "skills");
var _skillsDir = SKILLS_DIR;
var _cache = null;
var _lastLoad = 0;
function setSkillsDir(dir) {
  _skillsDir = dir;
  _cache = null;
}
function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match || !match[1] || match[2] === void 0) {
    return { frontmatter: {}, body: raw };
  }
  const lines = match[1].split("\n");
  const frontmatter = {};
  for (const line of lines) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv && kv[1] !== void 0 && kv[2] !== void 0) {
      const key = kv[1];
      const val = kv[2].trim();
      if (key === "id" || key === "name" || key === "description") {
        frontmatter[key] = val;
      } else if (key === "triggers") {
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            frontmatter.triggers = JSON.parse(val);
          } catch {
            frontmatter.triggers = [];
          }
        }
      }
    }
  }
  return { frontmatter, body: match[2].trim() };
}
async function findSkillFiles(dir) {
  const results = [];
  try {
    const entries = await (0, import_promises4.readdir)(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path4.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await findSkillFiles(fullPath);
        results.push(...sub);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
  }
  return results;
}
async function loadSkills(force = false) {
  if (!force && _cache && Date.now() - _lastLoad < 3e4) {
    return _cache;
  }
  try {
    const filePaths = await findSkillFiles(_skillsDir);
    const skills = [];
    for (const filePath of filePaths) {
      const raw = await (0, import_promises4.readFile)(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(raw);
      const relPath = path4.relative(_skillsDir, filePath).replace(/\\/g, "/");
      const id = frontmatter.id ?? relPath.replace(/\.md$/, "");
      skills.push({
        id,
        name: frontmatter.name ?? id,
        description: frontmatter.description ?? "",
        triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
        content: body,
        filePath
      });
    }
    _cache = skills;
    _lastLoad = Date.now();
    return skills;
  } catch {
    _cache = [];
    _lastLoad = Date.now();
    return [];
  }
}
async function getSkillById(id) {
  const skills = await loadSkills();
  return skills.find((s) => s.id === id);
}

// src/server/tools/skill.ts
async function executeSkillList() {
  const skills = await loadSkills();
  const list = skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers }));
  return { success: true, output: JSON.stringify(list, null, 2) };
}
async function executeSkillRead(params) {
  const skillId = String(params.id);
  const skill = await getSkillById(skillId);
  if (!skill) {
    return { success: false, output: "", error: `Skill not found: ${skillId}` };
  }
  return { success: true, output: `## ${skill.name}
${skill.description}

${skill.content}` };
}
async function executeSkillRun(params) {
  const runId = String(params.id);
  const runSkill = await getSkillById(runId);
  if (!runSkill) {
    return { success: false, output: "", error: `Skill not found: ${runId}` };
  }
  return { success: true, output: `Skill "${runSkill.name}" loaded. Follow the instructions in the skill content.` };
}

// src/server/ragEngine.ts
var path5 = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var _dbPath = path5.resolve(process.cwd(), ".opencode-infinite", "rag.db");
var _db = null;
var _useFallback = false;
var _chunks = [];
var _jsonPath = "";
var _nextId = 1;
function loadJson() {
  try {
    if (fs.existsSync(_jsonPath)) {
      const raw = fs.readFileSync(_jsonPath, "utf-8");
      const data = JSON.parse(raw);
      _chunks = data.chunks || [];
      _nextId = data.nextId || 1;
    }
  } catch {
  }
}
function saveJson() {
  try {
    fs.mkdirSync(path5.dirname(_jsonPath), { recursive: true });
    const data = { chunks: _chunks, nextId: _nextId };
    fs.writeFileSync(_jsonPath, JSON.stringify(data, null, 2));
  } catch {
  }
}
function fallbackGetDb() {
  if (!_jsonPath) {
    _jsonPath = _dbPath.replace(/\.db$/, "") + "-fallback.json";
    loadJson();
  }
  return {
    prepare: (sql) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("insert into chunks")) {
        const stmt2 = {
          run: (source, content, embedding) => {
            _chunks.push({
              id: _nextId++,
              source: String(source),
              content: String(content),
              embedding: String(embedding)
            });
            saveJson();
            return { lastInsertRowid: _nextId - 1, changes: 1 };
          }
        };
        return stmt2;
      }
      if (trimmed.startsWith("select") && trimmed.includes("from chunks")) {
        const stmt2 = {
          all: () => [..._chunks],
          get: () => void 0
        };
        return stmt2;
      }
      if (trimmed.startsWith("delete from chunks where source =")) {
        const stmt2 = {
          run: (source) => {
            _chunks = _chunks.filter((c) => c.source !== String(source));
            saveJson();
            return { lastInsertRowid: 0, changes: 1 };
          }
        };
        return stmt2;
      }
      const stmt = {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => void 0,
        all: () => []
      };
      return stmt;
    },
    exec: () => {
    },
    pragma: () => {
    }
  };
}
function setRagDbPath(dir) {
  _dbPath = path5.join(dir, "rag.db");
  _db = null;
  if (_useFallback) {
    _jsonPath = path5.join(dir, "rag-fallback.json");
    loadJson();
  }
}
function getDb() {
  if (!_db) {
    try {
      const DatabaseClass = require("better-sqlite3");
      const db = new DatabaseClass(_dbPath);
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
function initSchema(db) {
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
function chunkText(text, maxChars = 500) {
  const chunks = [];
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
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
async function ingestDocument(source, content, embedFn) {
  const db = getDb();
  const chunks = chunkText(content);
  const embeddings = await embedFn(chunks);
  const insert = db.prepare("INSERT INTO chunks (source, content, embedding) VALUES (?, ?, ?)");
  for (let i = 0; i < chunks.length; i++) {
    insert.run(source, chunks[i], JSON.stringify(embeddings[i]));
  }
  if (_useFallback) saveJson();
}
async function searchRAG(query, embedFn, topK = 3) {
  const db = getDb();
  const [queryEmbedding] = await embedFn([query]);
  if (!queryEmbedding) return [];
  const rows = db.prepare("SELECT source, content, embedding FROM chunks").all();
  const scored = rows.map((r) => ({
    source: r.source,
    content: r.content,
    score: cosineSimilarity(queryEmbedding, JSON.parse(r.embedding))
  })).filter((r) => r.score > 0.5).sort((a, b) => b.score - a.score).slice(0, topK);
  return scored;
}
function listSources() {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT source FROM chunks").all();
  return rows.map((r) => r.source);
}
function clearSource(source) {
  const db = getDb();
  db.prepare("DELETE FROM chunks WHERE source = ?").run(source);
  if (_useFallback) saveJson();
}

// src/server/tools/rag.ts
var ragEmbedFn = null;
function setRagEmbedFn(fn) {
  ragEmbedFn = fn;
}
async function executeRagSearch(params) {
  const query = String(params.query);
  const topK = params.limit ? Number(params.limit) : 3;
  if (!ragEmbedFn) {
    return { success: false, output: "", error: "RAG embeddings not initialized" };
  }
  const results = await searchRAG(query, ragEmbedFn, topK);
  return { success: true, output: JSON.stringify(results, null, 2) };
}

// src/server/gitTools.ts
var import_child_process3 = require("child_process");
var import_util2 = require("util");
init_errors();
var execFileAsync2 = (0, import_util2.promisify)(import_child_process3.execFile);
var PROJECT_ROOT3 = process.cwd();
async function runGit(args) {
  const { stdout, stderr } = await execFileAsync2("git", args, { cwd: PROJECT_ROOT3, timeout: 3e4 });
  if (stderr && !stderr.includes("warning")) {
    throw new Error(stderr);
  }
  return stdout.trim();
}
async function getGitStatus() {
  try {
    await runGit(["rev-parse", "--git-dir"]);
  } catch {
    return {
      branch: "",
      ahead: 0,
      behind: 0,
      modified: [],
      staged: [],
      untracked: [],
      deleted: [],
      renamed: [],
      clean: true
    };
  }
  const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "");
  const statusOutput = await runGit(["status", "--porcelain", "-b"]).catch(() => "");
  const lines = statusOutput.split("\n").filter((l) => l.length > 0);
  const branchLine = lines[0] || "";
  const fileLines = lines.slice(1);
  let ahead = 0;
  let behind = 0;
  const branchMatch = branchLine.match(/\[ahead (\d+).*behind (\d+)\]/);
  if (branchMatch) {
    ahead = parseInt(branchMatch[1], 10);
    behind = parseInt(branchMatch[2], 10);
  } else {
    const aheadMatch = branchLine.match(/\[ahead (\d+)\]/);
    if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
    const behindMatch = branchLine.match(/\[behind (\d+)\]/);
    if (behindMatch) behind = parseInt(behindMatch[1], 10);
  }
  const modified = [];
  const staged = [];
  const untracked = [];
  const deleted = [];
  const renamed = [];
  for (const line of fileLines) {
    if (!line.trim()) continue;
    const status = line.substring(0, 2);
    const file = line.substring(3);
    if (status[0] === "M" || status[0] === "A") staged.push(file);
    if (status[0] === "D") staged.push(file);
    if (status[0] === "R") renamed.push(file);
    if (status[1] === "M") modified.push(file);
    if (status[1] === "D") deleted.push(file);
    if (status === "??") untracked.push(file);
  }
  return {
    branch,
    ahead,
    behind,
    modified,
    staged: [...new Set(staged)],
    untracked,
    deleted,
    renamed: [...new Set(renamed)],
    clean: modified.length === 0 && staged.length === 0 && untracked.length === 0 && deleted.length === 0 && renamed.length === 0
  };
}
async function getGitDiff(stagedOnly = false) {
  try {
    await runGit(["rev-parse", "--git-dir"]);
  } catch {
    return [];
  }
  const args = stagedOnly ? ["diff", "--cached"] : ["diff"];
  const diffOutput = await runGit(args).catch(() => "");
  if (!diffOutput) return [];
  const diffs = [];
  const diffBlocks = diffOutput.split("diff --git ");
  for (const block of diffBlocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const firstLine = lines[0] || "";
    const match = firstLine.match(/a\/(.*?) b\/(.*)/);
    if (match) {
      const file = match[2] || "";
      let status = "modified";
      if (block.includes("new file mode")) status = "added";
      if (block.includes("deleted file mode")) status = "deleted";
      if (block.includes("rename from")) status = "renamed";
      diffs.push({ file, status, diff: "diff --git " + block });
    }
  }
  return diffs;
}
async function gitCommit(message) {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    await runGit(["add", "-A"]);
    const output = await runGit(["commit", "-m", message]);
    return { success: true, output };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function gitPush() {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    const output = await runGit(["push"]);
    return { success: true, output };
  } catch (err) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}
async function getGitLog(limit = 10) {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    const output = await runGit(["log", "-n", String(limit), "--pretty=format:%H|%h|%s|%an|%ad"]);
    if (!output) return [];
    return output.split("\n").map((line) => {
      const parts = line.split("|");
      return {
        hash: parts[0] || "",
        shortHash: parts[1] || "",
        message: parts[2] || "",
        author: parts[3] || "",
        date: parts[4] || ""
      };
    });
  } catch {
    return [];
  }
}
async function hasGitRepo() {
  try {
    await runGit(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

// src/server/prAgent.ts
var import_child_process4 = require("child_process");
var import_util3 = require("util");
var execFileAsync3 = (0, import_util3.promisify)(import_child_process4.execFile);
var PROJECT_ROOT4 = process.cwd();
async function runGit2(args) {
  const { stdout, stderr } = await execFileAsync3("git", args, {
    cwd: PROJECT_ROOT4,
    timeout: 3e4
  });
  if (stderr && !stderr.startsWith("warning:")) throw new Error(stderr);
  return stdout.trim();
}
async function gatherPRContext() {
  if (!await hasGitRepo()) throw new Error("Not a git repository");
  const status = await getGitStatus();
  const diff = (await getGitDiff(false)).map((d) => d.diff).join("\n\n");
  const commits = (await getGitLog(10)).map((c) => `- ${c.shortHash}: ${c.message}`).join("\n");
  const changedFiles = status.modified.concat(status.staged).concat(status.deleted);
  let baseBranch = "main";
  try {
    baseBranch = await runGit2(["rev-parse", "--abbrev-ref", "origin/HEAD"]);
    baseBranch = baseBranch.replace("origin/", "");
  } catch {
    try {
      await runGit2(["rev-parse", "--verify", "main"]);
      baseBranch = "main";
    } catch {
      try {
        await runGit2(["rev-parse", "--verify", "master"]);
        baseBranch = "master";
      } catch {
        baseBranch = "main";
      }
    }
  }
  return {
    branch: status.branch,
    baseBranch,
    diff,
    commits,
    changedFiles,
    ahead: status.ahead,
    behind: status.behind
  };
}
async function generatePRDescription(ctx, thinkFn) {
  const prompt = `Generate a pull request title and description for the following changes.

BRANCH: ${ctx.branch} \u2192 ${ctx.baseBranch}
CHANGED FILES: ${ctx.changedFiles.join(", ")}
COMMITS AHEAD: ${ctx.ahead}
COMMITS BEHIND: ${ctx.behind}

RECENT COMMITS:
${ctx.commits.slice(0, 1500)}

GIT DIFF (first 4000 chars):
\`\`\`diff
${ctx.diff.slice(0, 4e3)}
\`\`\`

Output ONLY a JSON object (no markdown, no code fences):
{
  "title": "Brief, conventional-commit style title (max 72 chars)",
  "description": "Detailed PR description with ## Summary, ## Changes, ## Testing sections"
}`;
  const response = await thinkFn(prompt);
  const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      title: parsed.title || `Update: ${ctx.changedFiles.slice(0, 3).join(", ")}`,
      description: parsed.description || "Automated PR by CVRCoder"
    };
  } catch {
    return {
      title: `Update: ${ctx.changedFiles.slice(0, 3).join(", ")}`,
      description: response.slice(0, 4e3) || "Automated PR by CVRCoder"
    };
  }
}
async function createGitHubPR(title, description, baseBranch, draft = false) {
  const args = draft ? ["pr", "create", "--draft", "--title", title, "--body", description, "--base", baseBranch] : ["pr", "create", "--title", title, "--body", description, "--base", baseBranch];
  try {
    const stdout = await runGit2(args);
    const urlMatch = stdout.match(/(https:\/\/github\.com\/\S+)/);
    return {
      title,
      description,
      branch: (await getGitStatus()).branch,
      baseBranch,
      prUrl: urlMatch?.[1] || stdout
    };
  } catch (e) {
    return {
      title,
      description,
      branch: (await getGitStatus()).branch,
      baseBranch,
      error: e.message
    };
  }
}
async function listOpenPRs() {
  try {
    return await runGit2(["pr", "list", "--state", "open", "--json", "number,title,headRefName,baseRefName,url"]);
  } catch {
    throw new Error("gh CLI not available. Install GitHub CLI for PR management.");
  }
}
async function createBranch(branchName) {
  return await runGit2(["checkout", "-b", branchName]);
}
async function switchBranch(branchName) {
  return await runGit2(["checkout", branchName]);
}
async function listBranches() {
  return await runGit2(["branch", "-a"]);
}

// src/server/tools/git.ts
async function executeGitStatus() {
  const status = await getGitStatus();
  return { success: true, output: JSON.stringify(status, null, 2) };
}
async function executeGitDiff(params) {
  const diffs = await getGitDiff(Boolean(params.staged));
  return { success: true, output: JSON.stringify(diffs, null, 2) };
}
async function executeGitCommit(params) {
  const commitResult = await gitCommit(String(params.message));
  return {
    success: commitResult.success,
    output: commitResult.output,
    ...commitResult.error ? { error: commitResult.error } : {}
  };
}
async function executeGitPush() {
  const pushResult = await gitPush();
  return {
    success: pushResult.success,
    output: pushResult.output,
    ...pushResult.error ? { error: pushResult.error } : {}
  };
}
async function executeGitLog(params) {
  const commits = await getGitLog(typeof params.limit === "number" ? params.limit : 10);
  return { success: true, output: JSON.stringify(commits, null, 2) };
}
async function executeGitBranch(params) {
  const output = await createBranch(params.name);
  return { success: true, output: `Created and switched to branch: ${output}` };
}
async function executeGitBranches() {
  const branches = await listBranches();
  return { success: true, output: branches };
}
async function executeGitSwitchBranch(params) {
  const output = await switchBranch(params.name);
  return { success: true, output: `Switched to branch: ${output}` };
}
async function executeGitPRContext() {
  const ctx = await gatherPRContext();
  return { success: true, output: JSON.stringify(ctx, null, 2) };
}
async function executeGitListPRs() {
  const prs = await listOpenPRs();
  return { success: true, output: prs };
}
async function executeGitCreatePR(params) {
  const ctx = await gatherPRContext();
  if (params.title && params.description) {
    const pr = await createGitHubPR(
      params.title,
      params.description,
      ctx.baseBranch,
      !!params.draft
    );
    return { success: true, output: JSON.stringify(pr, null, 2) };
  }
  return {
    success: true,
    output: `To create a PR, provide title and description.

PR Context:
${JSON.stringify(ctx, null, 2)}`
  };
}

// src/server/tools/browser.ts
var browserTools = null;
async function getBrowserTools() {
  if (!browserTools) {
    try {
      browserTools = await Promise.resolve().then(() => (init_browserTools(), browserTools_exports));
    } catch {
      return null;
    }
  }
  return browserTools;
}
async function executeBrowserNavigate(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const navResult = await bt.browserNavigate(sessionId, String(params.url), Boolean(params.headless ?? true));
  return {
    success: navResult.success,
    output: navResult.output ?? "",
    ...navResult.error ? { error: navResult.error } : {}
  };
}
async function executeBrowserClick(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const clickResult = await bt.browserClick(sessionId, String(params.selector), Boolean(params.headless ?? true));
  return {
    success: clickResult.success,
    output: clickResult.output ?? "",
    ...clickResult.error ? { error: clickResult.error } : {}
  };
}
async function executeBrowserType(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const typeResult = await bt.browserType(sessionId, String(params.selector), String(params.text), Boolean(params.headless ?? true));
  return {
    success: typeResult.success,
    output: typeResult.output ?? "",
    ...typeResult.error ? { error: typeResult.error } : {}
  };
}
async function executeBrowserScreenshot(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const ssResult = await bt.browserScreenshot(sessionId, Boolean(params.headless ?? true));
  return {
    success: ssResult.success,
    output: ssResult.output ?? "",
    ...ssResult.error ? { error: ssResult.error } : {},
    ...ssResult.base64 ? { base64: ssResult.base64 } : {}
  };
}
async function executeBrowserEvaluate(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const evalResult = await bt.browserEvaluate(sessionId, String(params.script), Boolean(params.headless ?? true));
  return {
    success: evalResult.success,
    output: evalResult.output ?? "",
    ...evalResult.error ? { error: evalResult.error } : {}
  };
}
async function executeBrowserGetHtml(params, sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const htmlResult = await bt.browserGetHtml(sessionId, Boolean(params.headless ?? true));
  return {
    success: htmlResult.success,
    output: htmlResult.output ?? "",
    ...htmlResult.error ? { error: htmlResult.error } : {}
  };
}
async function executeBrowserClose(sessionId) {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const closeResult = await bt.browserClose(sessionId);
  return {
    success: closeResult.success,
    output: closeResult.output ?? "",
    ...closeResult.error ? { error: closeResult.error } : {}
  };
}

// src/server/tools.ts
async function executeTool(toolCall, mode = "build", permissionEngine2, sessionId = "default") {
  const { name, params } = toolCall;
  await hookRegistry.execute("tool.before", { tool: name, params }, sessionId);
  let result;
  const isReadOnlyBuiltIn = READ_ONLY_TOOLS.has(name);
  let isReadOnlyCustom = false;
  if (!isReadOnlyBuiltIn) {
    const customTools = await loadCustomTools();
    const customTool = customTools.find((t) => t.id === name);
    isReadOnlyCustom = customTool ? customTool.readOnly : false;
  }
  if (mode === "plan" && !isReadOnlyBuiltIn && !isReadOnlyCustom) {
    result = {
      success: false,
      output: "",
      error: `Tool "${name}" is disabled in PLAN mode. Switch to BUILD mode to make changes.`
    };
    await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
    return result;
  }
  if (permissionEngine2) {
    const permissionRequest = {
      tool: name,
      params
    };
    if (params.path) permissionRequest.filePath = String(params.path);
    if (params.command) permissionRequest.command = String(params.command);
    const checkResult = permissionEngine2.check(permissionRequest);
    if (checkResult.action === "deny") {
      result = {
        success: false,
        output: "",
        error: `Permission denied: ${checkResult.reason || checkResult.rule?.pattern || "default policy"}`
      };
      await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
      return result;
    }
    if (checkResult.action === "ask") {
      const pending = permissionEngine2.createPending(permissionRequest);
      const approved = await permissionEngine2.waitForResolution(pending.id, 5 * 60 * 1e3);
      if (!approved) {
        result = {
          success: false,
          output: "",
          error: `Permission denied or timed out: ${name}`
        };
        await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: false }, sessionId);
        return result;
      }
    }
  }
  try {
    switch (name) {
      case "read_file":
        result = await executeReadFile(params);
        break;
      case "list_directory":
        result = await executeListDirectory(params);
        break;
      case "search_files":
        result = await executeSearchFiles(params);
        break;
      case "write_file":
        result = await executeWriteFile(params, sessionId);
        break;
      case "edit_file":
        result = await executeEditFile(params, sessionId);
        break;
      case "execute_command":
        result = await executeCommand(params);
        break;
      case "memory_read":
        result = await executeMemoryRead(params);
        break;
      case "memory_write":
        result = await executeMemoryWrite(params);
        break;
      case "skill_list":
        result = await executeSkillList();
        break;
      case "skill_read":
        result = await executeSkillRead(params);
        break;
      case "skill_run":
        result = await executeSkillRun(params);
        break;
      case "rag_search":
        result = await executeRagSearch(params);
        break;
      case "git_status":
        result = await executeGitStatus();
        break;
      case "git_diff":
        result = await executeGitDiff(params);
        break;
      case "git_commit":
        result = await executeGitCommit(params);
        break;
      case "git_push":
        result = await executeGitPush();
        break;
      case "git_log":
        result = await executeGitLog(params);
        break;
      case "git_branch":
        result = await executeGitBranch(params);
        break;
      case "git_branches":
        result = await executeGitBranches();
        break;
      case "git_switch_branch":
        result = await executeGitSwitchBranch(params);
        break;
      case "git_pr_context":
        result = await executeGitPRContext();
        break;
      case "git_list_prs":
        result = await executeGitListPRs();
        break;
      case "git_create_pr":
        result = await executeGitCreatePR(params);
        break;
      case "issue_create": {
        const issueInput = {
          title: String(params.title),
          ...params.description !== void 0 ? { description: String(params.description) } : {},
          ...params.priority !== void 0 ? { priority: String(params.priority) } : {},
          ...params.labels !== void 0 ? { labels: Array.isArray(params.labels) ? params.labels : [params.labels] } : {}
        };
        const issue = await createIssue(issueInput);
        result = { success: true, output: JSON.stringify(issue, null, 2) };
        break;
      }
      case "issue_list":
        result = { success: true, output: JSON.stringify(await listIssues(
          params.status,
          typeof params.limit === "number" ? params.limit : 20
        ), null, 2) };
        break;
      case "issue_view":
        result = { success: true, output: JSON.stringify(await getIssue(params.key), null, 2) };
        break;
      case "issue_comment": {
        await addComment(params.key, params.body);
        result = { success: true, output: `Comment added to ${params.key}` };
        break;
      }
      case "browser_navigate":
        result = await executeBrowserNavigate(params, sessionId);
        break;
      case "browser_click":
        result = await executeBrowserClick(params, sessionId);
        break;
      case "browser_type":
        result = await executeBrowserType(params, sessionId);
        break;
      case "browser_screenshot":
        result = await executeBrowserScreenshot(params, sessionId);
        break;
      case "browser_evaluate":
        result = await executeBrowserEvaluate(params, sessionId);
        break;
      case "browser_get_html":
        result = await executeBrowserGetHtml(params, sessionId);
        break;
      case "browser_close":
        result = await executeBrowserClose(sessionId);
        break;
      default: {
        const customTools = await loadCustomTools();
        const customTool = customTools.find((t) => t.id === name);
        if (customTool) {
          result = await executeCustomTool(customTool, params);
        } else {
          result = { success: false, output: "", error: `Unknown tool: ${name}` };
        }
        break;
      }
    }
  } catch (err) {
    result = { success: false, output: "", error: getErrorMessage(err) };
  }
  await hookRegistry.execute("tool.after", { tool: name, params, result: result.output, success: result.success }, sessionId);
  return result;
}

// src/server/agentLoader.ts
var fs2 = __toESM(require("fs"), 1);
var path6 = __toESM(require("path"), 1);
var cachedAgents = [];
var agentsDir = ".cvr/agents";
async function loadAgents(dir) {
  const targetDir = dir || agentsDir;
  const agents = [];
  try {
    const files = await fs2.promises.readdir(targetDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    for (const file of mdFiles) {
      const content = await fs2.promises.readFile(path6.join(targetDir, file), "utf-8");
      const agent = parseAgentMarkdown(content);
      if (agent) agents.push(agent);
    }
  } catch (e) {
    console.error("Failed to load agents:", e);
  }
  cachedAgents = agents;
  return agents;
}
function getAgents() {
  return cachedAgents;
}
function getAgentById(id) {
  return cachedAgents.find((a) => a.id === id);
}
function parseAgentMarkdown(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return null;
  const frontmatter = match[1];
  const body = match[2];
  const config = {};
  for (const line of frontmatter.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (key && rest.length > 0) {
      const value = rest.join(":").trim();
      const trimmedKey = key.trim();
      if (trimmedKey === "id" || trimmedKey === "name" || trimmedKey === "description" || trimmedKey === "model" || trimmedKey === "provider") {
        config[trimmedKey] = value;
      } else if (trimmedKey === "temperature" || trimmedKey === "maxTokens") {
        const num = Number(value);
        if (!isNaN(num)) {
          config[trimmedKey] = num;
        }
      } else if (trimmedKey === "tools") {
        if (value.startsWith("[") && value.endsWith("]")) {
          config.tools = value.slice(1, -1).split(",").map((s) => s.trim());
        }
      }
    }
  }
  return {
    id: config.id || "unknown",
    name: config.name || config.id || "Unknown Agent",
    description: config.description ?? void 0,
    model: config.model || "",
    provider: config.provider || "",
    temperature: config.temperature ?? void 0,
    maxTokens: config.maxTokens ?? void 0,
    tools: config.tools ?? [],
    systemPrompt: body.trim()
  };
}

// server.ts
init_sessionStore();

// src/server/skillCreator.ts
var import_promises5 = require("fs/promises");
var path8 = __toESM(require("path"), 1);
init_errors();
var _skillsDir2 = path8.resolve(process.cwd(), ".cvr", "skills");
function setSkillCreatorDir(dir) {
  _skillsDir2 = dir;
}
async function maybeCreateSkill(input) {
  const MIN_STEPS = 3;
  const MIN_UNIQUE_TOOLS = 2;
  if (!input.success) {
    return { created: false, reason: "Task failed \u2014 not creating skill." };
  }
  if (input.steps.length < MIN_STEPS) {
    return { created: false, reason: "Too few steps \u2014 not a repeatable workflow." };
  }
  const uniqueTools = new Set(input.toolNames.filter((t) => t && t !== "read_file" && t !== "list_directory"));
  if (uniqueTools.size < MIN_UNIQUE_TOOLS) {
    return { created: false, reason: "Not enough diverse tools \u2014 trivial task." };
  }
  const id = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const title = summarizeGoal(input.goal);
  const description = `Auto-generated skill from completed task: ${input.goal}`;
  const triggers = extractTriggers(input.goal);
  const content = buildSkillContent(input);
  const frontmatter = `---
id: ${id}
name: ${title}
description: ${description}
triggers: ${JSON.stringify(triggers)}
---

${content}`;
  const filePath = path8.join(_skillsDir2, `${id}.md`);
  try {
    await (0, import_promises5.mkdir)(_skillsDir2, { recursive: true });
    await (0, import_promises5.writeFile)(filePath, frontmatter, "utf-8");
    return { created: true, path: filePath, reason: "Skill created successfully." };
  } catch (e) {
    return { created: false, reason: `Write failed: ${getErrorMessage(e)}` };
  }
}
function summarizeGoal(goal) {
  const words = goal.split(/\s+/).slice(0, 5);
  let title = words.join(" ");
  if (title.length > 40) title = title.slice(0, 40) + "...";
  return title;
}
function extractTriggers(goal) {
  const lower = goal.toLowerCase();
  const keywords = ["refactor", "implement", "fix", "create", "build", "optimize", "debug", "migrate", "setup", "configure"];
  return keywords.filter((k) => lower.includes(k));
}
function buildSkillContent(input) {
  const lines = ["# Auto-Generated Skill", ""];
  lines.push(`## Goal`);
  lines.push(input.goal);
  lines.push("");
  lines.push(`## Steps`);
  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    if (!step) continue;
    lines.push(`${i + 1}. ${step.thought.substring(0, 200)}${step.thought.length > 200 ? "..." : ""}`);
    if (step.action) {
      lines.push(`   - Action: ${step.action.tool || "N/A"}`);
    }
  }
  lines.push("");
  lines.push(`## Tools Used`);
  lines.push(input.toolNames.filter(Boolean).join(", "));
  lines.push("");
  lines.push(`## Notes`);
  lines.push(`- Duration: ${(input.durationMs / 1e3).toFixed(1)}s`);
  lines.push(`- Generated automatically from agent execution.`);
  return lines.join("\n");
}

// src/server/goalSessionStore.ts
var import_promises6 = require("fs/promises");
var import_path = require("path");
var storageDir = "";
function setGoalStorageDir(dir) {
  storageDir = dir;
}
function getPath(id) {
  if (!storageDir) throw new Error("GoalSessionStore: storage dir not set");
  return (0, import_path.join)(storageDir, `goal-${id}.json`);
}
async function saveGoalState(state) {
  await (0, import_promises6.writeFile)(getPath(state.id), JSON.stringify(state, null, 2), "utf-8");
}
function isValidGoalState(obj) {
  if (typeof obj !== "object" || obj === null) return false;
  const g = obj;
  return typeof g.id === "string" && typeof g.goal === "string" && typeof g.status === "string";
}
async function loadGoalState(id) {
  try {
    const raw = await (0, import_promises6.readFile)(getPath(id), "utf-8");
    const parsed = JSON.parse(raw);
    if (!isValidGoalState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
async function listGoalStates() {
  try {
    const files = await (0, import_promises6.readdir)(storageDir);
    const states = [];
    for (const f of files) {
      if (f.startsWith("goal-") && f.endsWith(".json")) {
        const raw = await (0, import_promises6.readFile)((0, import_path.join)(storageDir, f), "utf-8");
        const parsed = JSON.parse(raw);
        if (isValidGoalState(parsed)) {
          states.push(parsed);
        }
      }
    }
    return states;
  } catch {
    return [];
  }
}

// src/server/cache.ts
var import_crypto3 = require("crypto");
var path9 = __toESM(require("path"), 1);
var fs4 = __toESM(require("fs"), 1);

// src/server/logger.ts
var Logger = class {
  context;
  level;
  constructor(context, level = "info") {
    this.context = context;
    this.level = level;
  }
  shouldLog(level) {
    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  format(entry) {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const dur = entry.duration ? ` [${entry.duration}ms]` : "";
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${this.context}] ${entry.message}${ctx}${dur}`;
  }
  debug(message, context) {
    if (!this.shouldLog("debug")) return;
    const entry = { timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "debug", message, context };
    console.debug(this.format(entry));
  }
  info(message, context) {
    if (!this.shouldLog("info")) return;
    const entry = { timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "info", message, context };
    console.info(this.format(entry));
  }
  warn(message, context) {
    if (!this.shouldLog("warn")) return;
    const entry = { timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: "warn", message, context };
    console.warn(this.format(entry));
  }
  error(message, error, context) {
    if (!this.shouldLog("error")) return;
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      message,
      context: { ...context, error: error?.message, stack: error?.stack }
    };
    console.error(this.format(entry));
  }
  time(label) {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration });
      return duration;
    };
  }
};
var createLogger = (context, level) => new Logger(context, level);
var log = createLogger("cvr", process.env.LOG_LEVEL || "info");

// src/server/cache.ts
var _dbPath3 = path9.resolve(process.cwd(), ".opencode-infinite", "cache.db");
var _db3 = null;
var _useFallback3 = false;
var _jsonEntries = [];
var _jsonPath3 = "";
function loadJson3() {
  try {
    if (fs4.existsSync(_jsonPath3)) {
      const raw = fs4.readFileSync(_jsonPath3, "utf-8");
      _jsonEntries = JSON.parse(raw);
    }
  } catch {
  }
}
function saveJson3() {
  try {
    fs4.mkdirSync(path9.dirname(_jsonPath3), { recursive: true });
    fs4.writeFileSync(_jsonPath3, JSON.stringify(_jsonEntries, null, 2));
  } catch {
  }
}
function fallbackGetDb3() {
  if (!_jsonPath3) {
    _jsonPath3 = _dbPath3.replace(/\.db$/, "") + "-fallback.json";
    loadJson3();
  }
  return {
    prepare: (sql) => {
      const trimmed = sql.trim().toLowerCase();
      if (trimmed.startsWith("insert into cache_entries")) {
        return {
          run: (key, value, timestamp, ttl, hits) => {
            const idx = _jsonEntries.findIndex((e) => e.key === String(key));
            if (idx !== -1) _jsonEntries.splice(idx, 1);
            _jsonEntries.push({
              key: String(key),
              value: String(value),
              timestamp: Number(timestamp),
              ttl: Number(ttl),
              hits: Number(hits)
            });
            saveJson3();
            return { lastInsertRowid: _jsonEntries.length, changes: 1 };
          }
        };
      }
      if (trimmed.startsWith("select * from cache_entries where key =")) {
        return {
          get: (key) => _jsonEntries.find((e) => e.key === String(key))
        };
      }
      if (trimmed.startsWith("select * from cache_entries")) {
        return {
          all: () => _jsonEntries
        };
      }
      if (trimmed.startsWith("delete from cache_entries")) {
        return {
          run: () => {
            _jsonEntries = [];
            saveJson3();
            return { lastInsertRowid: 0, changes: 0 };
          }
        };
      }
      return {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => void 0,
        all: () => []
      };
    },
    exec: () => {
    },
    pragma: () => {
    }
  };
}
function setCacheDbPath(dir) {
  _dbPath3 = path9.join(dir, "cache.db");
  _db3 = null;
  _jsonEntries = [];
  if (_useFallback3) {
    _jsonPath3 = _dbPath3.replace(/\.db$/, "") + "-fallback.json";
    loadJson3();
  }
}
function getDb3() {
  if (!_db3) {
    try {
      const DatabaseClass = require("better-sqlite3");
      const db = new DatabaseClass(_dbPath3);
      db.pragma("journal_mode = WAL");
      initSchema3(db);
      _db3 = db;
    } catch {
      _useFallback3 = true;
      _db3 = fallbackGetDb3();
    }
  }
  return _db3;
}
function initSchema3(db) {
  if (_useFallback3) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      ttl INTEGER NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cache_timestamp ON cache_entries(timestamp);
  `);
}
var AIResponseCache = class {
  cache = /* @__PURE__ */ new Map();
  _keys = [];
  defaultTTL;
  maxSize;
  stats = { hits: 0, misses: 0 };
  _warmed = false;
  _pendingRequests = /* @__PURE__ */ new Map();
  _pruneInterval = null;
  constructor(defaultTTL = 3e5, maxSize = 500) {
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    this._pruneInterval = setInterval(() => {
      const pruned = this.prune();
      if (pruned > 0) log.debug("Background cache prune", { count: pruned });
    }, 3e5);
  }
  hashKey(prompt, contents, provider, model) {
    return (0, import_crypto3.createHash)("sha256").update(JSON.stringify({ prompt, contents, provider, model })).digest("hex").slice(0, 32);
  }
  warmFromDb() {
    if (this._warmed) return;
    this._warmed = true;
    try {
      const db = getDb3();
      const rows = db.prepare("SELECT * FROM cache_entries").all();
      const now = Date.now();
      let loaded = 0;
      let expired = 0;
      for (const row of rows) {
        if (now - row.timestamp > row.ttl) {
          expired++;
          continue;
        }
        if (this.cache.size >= this.maxSize) break;
        this.cache.set(row.key, {
          value: row.value,
          timestamp: row.timestamp,
          ttl: row.ttl,
          hits: row.hits
        });
        this._keys.push(row.key);
        loaded++;
      }
      if (loaded > 0 || expired > 0) {
        log.info("Cache warmed from DB", { loaded, expired, size: this.cache.size });
      }
    } catch {
    }
  }
  get(prompt, contents, provider, model) {
    this.warmFromDb();
    const key = this.hashKey(prompt, contents, provider, model);
    const entry = this.cache.get(key);
    if (!entry) {
      const dbEntry = this.getFromDb(key);
      if (dbEntry) {
        if (this.cache.size >= this.maxSize) {
          this.evictOldest();
        }
        this.cache.set(key, dbEntry);
        this._keys.push(key);
        dbEntry.hits++;
        this.stats.hits++;
        return dbEntry.value;
      }
      this.stats.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this._keys = this._keys.filter((k) => k !== key);
      this.deleteFromDb(key);
      this.stats.misses++;
      return null;
    }
    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }
  set(prompt, contents, provider, response, model, ttl) {
    this.warmFromDb();
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    const key = this.hashKey(prompt, contents, provider, model);
    const entry = {
      value: response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0
    };
    this.cache.set(key, entry);
    this._keys.push(key);
    this.saveToDb(key, entry);
  }
  coalesce(prompt, contents, provider, model, factory) {
    const key = this.hashKey(prompt, contents, provider, model);
    const cached = this.get(prompt, contents, provider, model);
    if (cached) return Promise.resolve(cached);
    const pending = this._pendingRequests.get(key);
    if (pending) return pending;
    const promise = factory().then((result) => {
      this._pendingRequests.delete(key);
      this.set(prompt, contents, provider, result, model);
      return result;
    }).catch((err) => {
      this._pendingRequests.delete(key);
      throw err;
    });
    this._pendingRequests.set(key, promise);
    return promise;
  }
  getFromDb(key) {
    try {
      const db = getDb3();
      const row = db.prepare("SELECT * FROM cache_entries WHERE key = ?").get(key);
      if (!row) return null;
      if (Date.now() - row.timestamp > row.ttl) {
        this.deleteFromDb(key);
        return null;
      }
      return {
        value: row.value,
        timestamp: row.timestamp,
        ttl: row.ttl,
        hits: row.hits
      };
    } catch {
      return null;
    }
  }
  saveToDb(key, entry) {
    try {
      const db = getDb3();
      db.prepare(
        "INSERT OR REPLACE INTO cache_entries (key, value, timestamp, ttl, hits) VALUES (?, ?, ?, ?, ?)"
      ).run(key, entry.value, entry.timestamp, entry.ttl, entry.hits);
      if (_useFallback3) saveJson3();
    } catch {
    }
  }
  deleteFromDb(key) {
    try {
      const db = getDb3();
      db.prepare("DELETE FROM cache_entries WHERE key = ?").run(key);
      if (_useFallback3) {
        _jsonEntries = _jsonEntries.filter((e) => e.key !== key);
        saveJson3();
      }
    } catch {
    }
  }
  evictOldest() {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }
    if (oldest) {
      this.cache.delete(oldest);
      this._keys = this._keys.filter((k) => k !== oldest);
    }
  }
  clear() {
    this.cache.clear();
    this._keys = [];
    this._pendingRequests.clear();
    this.stats = { hits: 0, misses: 0 };
    try {
      const db = getDb3();
      db.prepare("DELETE FROM cache_entries").run();
      if (_useFallback3) {
        _jsonEntries = [];
        saveJson3();
      }
    } catch {
    }
    log.info("Cache cleared");
  }
  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0 ? this.stats.hits / (this.stats.hits + this.stats.misses) : 0
    };
  }
  prune() {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.deleteFromDb(key);
        pruned++;
      }
    }
    this._keys = this._keys.filter((k) => this.cache.has(k));
    try {
      const db = getDb3();
      const result = db.prepare("DELETE FROM cache_entries WHERE timestamp + ttl < ?").run(now);
      const dbPruned = result.changes;
      if (dbPruned > 0) {
        pruned += dbPruned;
        if (_useFallback3) saveJson3();
      }
    } catch {
    }
    if (pruned > 0) {
      log.debug("Cache pruned", { count: pruned });
    }
    return pruned;
  }
  dispose() {
    if (this._pruneInterval) {
      clearInterval(this._pruneInterval);
      this._pruneInterval = null;
    }
  }
};
var aiCache = new AIResponseCache();

// src/server/projectOracle.ts
var fs5 = __toESM(require("fs"), 1);
var path10 = __toESM(require("path"), 1);
var MAX_FILE_SIZE = 100 * 1024;
var ORACLE_SOURCE_PREFIX = "oracle:";
var SKIP_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".opencode-infinite",
  "dist",
  "build",
  ".next",
  "__pycache__",
  ".venv",
  "target",
  ".turbo",
  ".cache",
  "coverage",
  ".nyc_output",
  "tmp",
  ".DS_Store"
]);
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".htm",
  ".xml",
  ".svg",
  ".py",
  ".pyi",
  ".pyx",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".java",
  ".kt",
  ".kts",
  ".swift",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cc",
  ".cxx",
  ".sql",
  ".graphql",
  ".gql",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".env",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".dockerfile",
  "dockerfile",
  ".prisma",
  ".proto",
  ".txt",
  ".log"
]);
async function indexProject(rootDir, embedFn) {
  clearSource(ORACLE_SOURCE_PREFIX + "*");
  const oracleDirs = getAllOracleDirs(rootDir);
  let fileCount = 0;
  for (const dir of oracleDirs) {
    const indexed = await indexDirectory(dir, rootDir, embedFn);
    fileCount += indexed;
  }
  log.info("Project Oracle indexed", { files: fileCount });
  return fileCount;
}
function getAllOracleDirs(root) {
  const dirs = [root];
  try {
    const entries = fs5.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
        const fullPath = path10.join(root, entry.name);
        dirs.push(...getAllOracleDirs(fullPath));
      }
    }
  } catch {
  }
  return dirs;
}
async function indexDirectory(dir, rootDir, embedFn) {
  let count = 0;
  try {
    const entries = fs5.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path10.extname(entry.name).toLowerCase();
      const baseName = entry.name.toLowerCase();
      const isText = TEXT_EXTENSIONS.has(ext) || baseName === "dockerfile" || baseName === "makefile";
      if (!isText) continue;
      const filePath = path10.join(dir, entry.name);
      try {
        const stat5 = fs5.statSync(filePath);
        if (stat5.size > MAX_FILE_SIZE) continue;
        const content = fs5.readFileSync(filePath, "utf-8");
        if (!content.trim()) continue;
        const relativePath = path10.relative(rootDir, filePath).replace(/\\/g, "/");
        const source = ORACLE_SOURCE_PREFIX + relativePath;
        await ingestDocument(source, content, embedFn);
        count++;
      } catch {
      }
    }
  } catch {
  }
  return count;
}

// src/server/instructionLoader.ts
var import_promises7 = require("fs/promises");
var path11 = __toESM(require("path"), 1);
var RULES_DIR = path11.resolve(process.cwd(), ".cvr", "rules");
var _rulesDir = RULES_DIR;
function setRulesDir(dir) {
  _rulesDir = dir;
}
async function loadInstructions() {
  try {
    await (0, import_promises7.access)(_rulesDir);
  } catch {
    return [];
  }
  const entries = await (0, import_promises7.readdir)(_rulesDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const filePath = path11.join(_rulesDir, entry.name);
    const raw = await (0, import_promises7.readFile)(filePath, "utf-8");
    let priority = 0;
    const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontmatterMatch && frontmatterMatch[1] !== void 0) {
      const priorityMatch = frontmatterMatch[1].match(/priority:\s*(\d+)/);
      if (priorityMatch && priorityMatch[1] !== void 0) priority = parseInt(priorityMatch[1], 10);
    }
    const content = frontmatterMatch ? raw.slice(frontmatterMatch[0].length).trim() : raw.trim();
    files.push({
      name: entry.name.replace(/\.md$/, ""),
      content,
      priority
    });
  }
  return files.sort((a, b) => b.priority - a.priority);
}
async function getInstructionsContext() {
  const instructions = await loadInstructions();
  if (instructions.length === 0) return "";
  const parts = instructions.map((f) => `## ${f.name}
${f.content}`);
  return `## USER RULES
${parts.join("\n\n")}`;
}
async function saveInstruction(name, content, priority = 0) {
  try {
    await (0, import_promises7.access)(_rulesDir);
  } catch {
    await (0, import_promises7.mkdir)(_rulesDir, { recursive: true });
  }
  const frontmatter = `---
priority: ${priority}
---
`;
  const filePath = path11.join(_rulesDir, `${name}.md`);
  await (0, import_promises7.writeFile)(filePath, frontmatter + content, "utf-8");
}
async function deleteInstruction(name) {
  try {
    const filePath = path11.join(_rulesDir, `${name}.md`);
    await (0, import_promises7.unlink)(filePath);
  } catch {
  }
}

// src/server/pluginManager.ts
var import_promises8 = require("fs/promises");
var path12 = __toESM(require("path"), 1);
var PLUGINS_DIR = path12.resolve(process.cwd(), ".cvr", "plugins");
var _pluginsDir = PLUGINS_DIR;
var _plugins = [];
function setPluginsDir(dir) {
  _pluginsDir = dir;
}
async function loadPlugins() {
  try {
    await (0, import_promises8.access)(_pluginsDir);
  } catch {
    _plugins = [];
    return [];
  }
  const entries = await (0, import_promises8.readdir)(_pluginsDir, { withFileTypes: true });
  const plugins = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginPath = path12.join(_pluginsDir, entry.name);
    const manifestPath = path12.join(pluginPath, "manifest.json");
    try {
      const raw = await (0, import_promises8.readFile)(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);
      if (manifest.id) {
        plugins.push({ manifest, enabled: true, dir: pluginPath });
      }
    } catch {
    }
  }
  _plugins = plugins;
  return plugins;
}
async function registerPlugins() {
  const plugins = await loadPlugins();
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    await registerPlugin(plugin);
  }
}
async function registerPlugin(plugin) {
  if (plugin.manifest.hooks) {
    console.warn(
      `Plugin ${plugin.manifest.id}: hooks declared in manifest.json are ignored for security. Use a signed JS module instead.`
    );
  }
}
function getPlugins() {
  return [..._plugins];
}
function disablePlugin(id) {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = false;
}
function enablePlugin(id) {
  const plugin = _plugins.find((p) => p.manifest.id === id);
  if (plugin) plugin.enabled = true;
}

// src/server/mcpServer.ts
var import_server = require("@modelcontextprotocol/sdk/server/index.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_sse = require("@modelcontextprotocol/sdk/server/sse.js");
var import_types = require("@modelcontextprotocol/sdk/types.js");
var import_promises9 = require("fs/promises");
var path13 = __toESM(require("path"), 1);
init_errors();

// src/server/agentLoop.ts
init_errors();
var AgentLoop = class {
  state;
  permissionEngine;
  thinkFn;
  executeToolFn;
  onStep;
  onStatus;
  _abort = false;
  sessionId;
  additionalContext = "";
  constructor(goal, options) {
    this.sessionId = options.sessionId || crypto.randomUUID();
    this.state = {
      goal,
      steps: [],
      status: "planning",
      currentStep: 0,
      maxSteps: options.maxSteps || 20
    };
    this.permissionEngine = options.permissionEngine;
    this.thinkFn = options.thinkFn;
    this.executeToolFn = options.executeToolFn || ((toolCall, mode) => executeTool(toolCall, mode || "build", this.permissionEngine, this.sessionId));
    this.onStep = options.onStep;
    this.onStatus = options.onStatus;
  }
  async run() {
    try {
      await hookRegistry.execute("loop.start", { goal: this.state.goal }, this.sessionId);
      while (this.state.status !== "completed" && this.state.status !== "error") {
        if (this.state.currentStep >= this.state.maxSteps || this._abort) {
          if (this._abort) {
            this.state.steps.push({
              id: this.state.currentStep,
              thought: "Loop aborted by user",
              timestamp: Date.now()
            });
          }
          this.state.status = "error";
          break;
        }
        const step = await this.runSingleStep();
        if (!step.action) {
          break;
        }
      }
      if (this.state.status !== "error") {
        this.state.status = "completed";
      }
      this.onStatus?.(this.state.status);
      await hookRegistry.execute("loop.complete", { state: this.state }, this.sessionId);
      if (this.state.status === "completed" && this.state.steps.length >= 3) {
        const toolNames = this.state.steps.map((s) => s.action?.tool || "");
        maybeCreateSkill({
          goal: this.state.goal,
          steps: this.state.steps.map((s) => ({ thought: s.thought, action: s.action, observation: s.observation })),
          toolNames,
          durationMs: this.state.steps[this.state.steps.length - 1].timestamp - this.state.steps[0].timestamp,
          success: true
        }).catch(() => {
        });
      }
      return this.state;
    } catch (err) {
      this.state.status = "error";
      await hookRegistry.execute("loop.error", { error: getErrorMessage(err) }, this.sessionId);
      throw err;
    }
  }
  abort() {
    this._abort = true;
  }
  setAdditionalContext(ctx) {
    this.additionalContext = ctx;
  }
  async runSingleStep() {
    if (this._abort) {
      throw new Error("Loop aborted by user");
    }
    const thought = await this.think();
    const step = {
      id: this.state.currentStep,
      thought,
      timestamp: Date.now()
    };
    const action = this.parseAction(thought);
    if (action) {
      step.action = action;
      this.state.status = "executing";
      this.onStatus?.("executing");
      try {
        const result = await this.executeToolFn(
          { name: action.tool, params: action.params },
          "build"
        );
        step.observation = JSON.stringify(result);
      } catch (err) {
        step.observation = `Error: ${getErrorMessage(err)}`;
      }
    }
    this.state.steps.push(step);
    this.onStep?.(step);
    this.state.currentStep++;
    await hookRegistry.execute("loop.step", { step }, this.sessionId);
    this.state.status = "observing";
    this.onStatus?.("observing");
    return step;
  }
  async think() {
    const context = this.buildContext();
    const prompt = `You are an autonomous coding agent working on this goal:
${this.state.goal}

Previous steps:
${context}
${this.additionalContext ? `
Additional context:
${this.additionalContext}
` : ""}

Think about what to do next. If you need to use a tool, respond in this format:
ACTION: tool_name
PARAMS: {"param": "value"}

If the task is complete, respond with:
COMPLETE: brief summary

Your thought:`;
    return (await this.thinkFn(prompt)).trim();
  }
  buildContext() {
    return this.state.steps.slice(-5).map(
      (s) => `Step ${s.id}: ${s.thought.substring(0, 200)}${s.thought.length > 200 ? "..." : ""} Observation: ${s.observation?.substring(0, 200)}${s.observation && s.observation.length > 200 ? "..." : ""}`
    ).join("\n");
  }
  parseAction(thought) {
    const actionMatch = thought.match(/ACTION:\s*(\w+)/);
    const paramsMatch = thought.match(/PARAMS:\s*(\{[\s\S]*?\})/);
    if (actionMatch && actionMatch[1]) {
      try {
        return {
          tool: actionMatch[1],
          params: paramsMatch && paramsMatch[1] ? JSON.parse(paramsMatch[1]) : {}
        };
      } catch {
        return { tool: actionMatch[1], params: {} };
      }
    }
    return null;
  }
  getState() {
    return { ...this.state };
  }
};

// src/server/subagentManager.ts
init_errors();
var SubagentManager = class {
  tasks = /* @__PURE__ */ new Map();
  queue = [];
  maxConcurrent = 3;
  async spawn(parentId, goal, agentConfig, thinkFn) {
    const id = crypto.randomUUID();
    const task = {
      id,
      parentId,
      goal,
      agentConfig,
      status: "pending"
    };
    this.tasks.set(id, task);
    const running = this.getRunningCount();
    if (running >= this.maxConcurrent) {
      this.queue.push(id);
      return task;
    }
    await this.executeTask(task, thinkFn);
    return task;
  }
  async executeTask(task, thinkFn) {
    task.status = "running";
    task.startTime = Date.now();
    try {
      const loop = new AgentLoop(task.goal, {
        maxSteps: task.agentConfig.maxSteps || 10,
        onStep: (step) => {
          console.log(`[Subagent ${task.id}] Step ${step.id}: ${step.thought.substring(0, 100)}`);
        },
        thinkFn
      });
      const state = await loop.run();
      task.status = "completed";
      task.result = state.steps.map((s) => s.observation || s.thought).join("\n\n");
    } catch (err) {
      task.status = "failed";
      task.error = getErrorMessage(err);
    } finally {
      task.endTime = Date.now();
      this.processQueue(thinkFn);
    }
  }
  processQueue(thinkFn) {
    const running = this.getRunningCount();
    if (running >= this.maxConcurrent) return;
    const nextId = this.queue.shift();
    if (!nextId) return;
    const nextTask = this.tasks.get(nextId);
    if (nextTask) {
      this.executeTask(nextTask, thinkFn).catch((err) => {
        console.error(`Queued subagent ${nextId} failed:`, getErrorMessage(err));
      });
    }
  }
  getRunningCount() {
    return Array.from(this.tasks.values()).filter((t) => t.status === "running").length;
  }
  getTask(id) {
    return this.tasks.get(id);
  }
  listTasks(parentId) {
    const all = Array.from(this.tasks.values());
    return parentId ? all.filter((t) => t.parentId === parentId) : all;
  }
  async abort(id) {
    const task = this.tasks.get(id);
    if (task && task.status === "running") {
      task.status = "failed";
      task.error = "Aborted by user";
      task.endTime = Date.now();
    } else if (task && task.status === "pending") {
      this.queue = this.queue.filter((qid) => qid !== id);
      task.status = "failed";
      task.error = "Aborted before start";
    }
  }
};

// src/server/serverState.ts
var permissionEngine;
var agentLoopMap = /* @__PURE__ */ new Map();
var subagentManager = new SubagentManager();
function setPermissionEngine(pe) {
  permissionEngine = pe;
}

// src/server/mcpServer.ts
var PROJECT_ROOT5 = process.cwd();
async function loadMcpConfig() {
  try {
    const configPath = path13.join(PROJECT_ROOT5, ".cvr", "mcp.json");
    const data = await (0, import_promises9.readFile)(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { enabled: false, transport: "stdio" };
  }
}
function customParamsToSchema(params) {
  if (!params || params.length === 0) {
    return { type: "object", properties: {}, required: [] };
  }
  const properties = {};
  const required = [];
  for (const p of params) {
    properties[p.name] = { type: p.type, description: p.description };
    if (p.default !== void 0) {
      const prop = properties[p.name];
      if (prop) prop.default = p.default;
    }
    if (p.required) {
      required.push(p.name);
    }
  }
  return { type: "object", properties, required };
}
async function createMcpServer() {
  const server = new import_server.Server(
    { name: "cvr-name-coder", version: "1.3.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    }
  );
  server.setRequestHandler(import_types.ListToolsRequestSchema, async () => {
    const tools = TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.parameters
    }));
    try {
      const customTools = await loadCustomTools();
      for (const ct of customTools) {
        tools.push({
          name: ct.id,
          description: ct.description || ct.name,
          inputSchema: customParamsToSchema(ct.parameters)
        });
      }
    } catch (e) {
      console.error("Failed to load custom tools for MCP:", e);
    }
    return { tools };
  });
  server.setRequestHandler(import_types.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(
        { name, params: args || {} },
        "build",
        permissionEngine,
        "mcp-session"
      );
      return {
        content: [
          {
            type: "text",
            text: result.success ? result.output : result.error || "Unknown error"
          }
        ],
        isError: !result.success
      };
    } catch (err) {
      throw new import_types.McpError(
        import_types.ErrorCode.InternalError,
        `Tool execution failed: ${getErrorMessage(err)}`
      );
    }
  });
  server.setRequestHandler(import_types.ListResourcesRequestSchema, async () => {
    try {
      const entries = await (0, import_promises9.readdir)(PROJECT_ROOT5, { withFileTypes: true });
      const resources = entries.filter(
        (e) => !e.name.startsWith(".") && !e.name.startsWith("node_modules") && e.isFile()
      ).map((e) => ({
        uri: `file://${path13.join(PROJECT_ROOT5, e.name)}`,
        name: e.name,
        mimeType: "text/plain"
      }));
      return { resources };
    } catch (e) {
      throw new import_types.McpError(
        import_types.ErrorCode.InternalError,
        `Failed to list resources: ${getErrorMessage(e)}`
      );
    }
  });
  server.setRequestHandler(import_types.ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (!uri.startsWith("file://")) {
      throw new import_types.McpError(
        import_types.ErrorCode.InvalidRequest,
        "Only file:// URIs are supported"
      );
    }
    const filePath = uri.slice(7);
    const resolved = path13.resolve(filePath);
    if (!resolved.startsWith(PROJECT_ROOT5)) {
      throw new import_types.McpError(
        import_types.ErrorCode.InvalidRequest,
        "Path escapes project root"
      );
    }
    try {
      const content = await (0, import_promises9.readFile)(filePath, "utf-8");
      return {
        contents: [{ uri, mimeType: "text/plain", text: content }]
      };
    } catch (e) {
      throw new import_types.McpError(
        import_types.ErrorCode.InternalError,
        `Failed to read resource: ${getErrorMessage(e)}`
      );
    }
  });
  server.setRequestHandler(import_types.ListPromptsRequestSchema, async () => {
    await loadAgents();
    const agents = getAgents();
    return {
      prompts: agents.map((a) => ({
        name: a.id,
        description: a.description || a.name,
        arguments: [
          { name: "task", description: "Task or goal for the agent", required: true }
        ]
      }))
    };
  });
  server.setRequestHandler(import_types.GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const agent = getAgentById(name);
    if (!agent) {
      throw new import_types.McpError(import_types.ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
    }
    const task = String(args?.task || "");
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${agent.systemPrompt}

Task: ${task}`
          }
        }
      ]
    };
  });
  return server;
}
async function startMcpStdio() {
  const server = await createMcpServer();
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}
var sseTransports = /* @__PURE__ */ new Map();
function mountMcpSseRoutes(app2, basePath = "/mcp") {
  app2.get(`${basePath}/sse`, async (_req, res) => {
    const server = await createMcpServer();
    const transport = new import_sse.SSEServerTransport(`${basePath}/messages`, res);
    const sessionId = transport.sessionId;
    sseTransports.set(sessionId, transport);
    res.on("close", () => {
      sseTransports.delete(sessionId);
    });
    await server.connect(transport);
  });
  app2.post(`${basePath}/messages`, async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = sessionId ? sseTransports.get(sessionId) : void 0;
    if (!transport) {
      res.status(503).json({ error: "SSE transport not initialized" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });
}

// server.ts
init_browserTools();

// src/server/teamSync.ts
var import_promises10 = require("fs/promises");
var path14 = __toESM(require("path"), 1);
var import_child_process5 = require("child_process");
var import_util4 = require("util");
var import_crypto4 = require("crypto");
init_errors();
var execFileAsync4 = (0, import_util4.promisify)(import_child_process5.execFile);
var _config = null;
var _status = {
  lastSyncAt: null,
  status: "idle",
  message: "Sync not configured",
  provider: "none"
};
var _intervalId = null;
var SYNC_DIR = path14.join(process.cwd(), ".cvr");
var CONFIG_PATH = path14.join(SYNC_DIR, "sync.json");
var SYNC_STORAGE_DIR = path14.join(process.cwd(), ".opencode-infinite");
var SYNC_FILES = ["MEMORY.md", "USER.md", "history.json", "memory.json", "sessions.db"];
function getSyncDir() {
  if (_config?.provider === "git" && _config.repo) {
    return path14.join(process.cwd(), ".sync-clone");
  }
  if (_config?.provider === "file" && _config.path) {
    return _config.path;
  }
  return path14.join(SYNC_DIR, "sync-data");
}
function getKey() {
  const keyStr = _config?.encryptionKey || process.env.SYNC_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error("Sync encryption key is not configured. Set encryptionKey in .cvr/sync.json or SYNC_ENCRYPTION_KEY env var.");
  }
  return (0, import_crypto4.scryptSync)(keyStr, "salt", 32);
}
function encrypt(data) {
  const iv = (0, import_crypto4.randomBytes)(16);
  const salt = (0, import_crypto4.randomBytes)(16);
  const key = (0, import_crypto4.scryptSync)(_config?.encryptionKey || process.env.SYNC_ENCRYPTION_KEY || "", salt, 32);
  const cipher = (0, import_crypto4.createCipheriv)("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]);
}
function decrypt(data) {
  const salt = data.subarray(0, 16);
  const iv = data.subarray(16, 32);
  const tag = data.subarray(32, 48);
  const encrypted = data.subarray(48);
  const key = (0, import_crypto4.scryptSync)(_config?.encryptionKey || process.env.SYNC_ENCRYPTION_KEY || "", salt, 32);
  const decipher = (0, import_crypto4.createDecipheriv)("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
function tryDecrypt(data) {
  try {
    return decrypt(data);
  } catch {
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const key = getKey();
    const decipher = (0, import_crypto4.createDecipheriv)("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
async function loadSyncConfig() {
  try {
    await (0, import_promises10.access)(CONFIG_PATH);
    const raw = await (0, import_promises10.readFile)(CONFIG_PATH, "utf-8");
    _config = JSON.parse(raw);
    _status.provider = _config.provider;
    return _config;
  } catch {
    _config = null;
    return null;
  }
}
function getSyncConfig() {
  return _config;
}
async function saveSyncConfig(config) {
  await (0, import_promises10.mkdir)(SYNC_DIR, { recursive: true });
  const safeConfig = { ...config };
  delete safeConfig.encryptionKey;
  await (0, import_promises10.writeFile)(CONFIG_PATH, JSON.stringify(safeConfig, null, 2), "utf-8");
  _config = config;
  _status.provider = config.provider;
  restartAutoSync();
}
async function gitInit(syncDir) {
  await (0, import_promises10.mkdir)(syncDir, { recursive: true });
  try {
    await execFileAsync4("git", ["init"], { cwd: syncDir });
    await execFileAsync4("git", ["config", "user.email", "sync@cvr.name"], { cwd: syncDir });
    await execFileAsync4("git", ["config", "user.name", "CVR Sync"], { cwd: syncDir });
  } catch {
  }
}
async function gitSetRemote(syncDir, repoUrl) {
  try {
    await execFileAsync4("git", ["remote", "remove", "origin"], { cwd: syncDir });
  } catch {
  }
  await execFileAsync4("git", ["remote", "add", "origin", repoUrl], { cwd: syncDir });
}
async function gitPull(syncDir) {
  try {
    await execFileAsync4("git", ["pull", "origin", "main", "--no-rebase"], { cwd: syncDir });
  } catch {
    try {
      await execFileAsync4("git", ["pull", "origin", "master", "--no-rebase"], { cwd: syncDir });
    } catch {
    }
  }
}
async function gitCommitAndPush(syncDir) {
  try {
    await execFileAsync4("git", ["add", "-A"], { cwd: syncDir });
    await execFileAsync4("git", ["commit", "-m", `sync: ${(/* @__PURE__ */ new Date()).toISOString()}`], { cwd: syncDir });
    try {
      await execFileAsync4("git", ["push", "origin", "HEAD:main"], { cwd: syncDir });
    } catch {
      await execFileAsync4("git", ["push", "origin", "HEAD:master"], { cwd: syncDir });
    }
  } catch {
  }
}
function resolveSyncPath(fileName, syncDir) {
  if (_config?.encrypt) {
    return path14.join(syncDir, `${fileName}.enc`);
  }
  return path14.join(syncDir, fileName);
}
async function exportFile(fileName, syncDir) {
  const sourcePath = path14.join(SYNC_STORAGE_DIR, fileName);
  let data;
  try {
    data = await (0, import_promises10.readFile)(sourcePath);
  } catch {
    return;
  }
  const destPath = resolveSyncPath(fileName, syncDir);
  if (_config?.encrypt) {
    data = encrypt(data);
  }
  await (0, import_promises10.writeFile)(destPath, data);
}
async function importFile(fileName, syncDir) {
  const sourcePath = resolveSyncPath(fileName, syncDir);
  let data;
  try {
    data = await (0, import_promises10.readFile)(sourcePath);
  } catch {
    return;
  }
  if (_config?.encrypt) {
    try {
      data = tryDecrypt(data);
    } catch {
      throw new Error(`Failed to decrypt ${fileName}. Check encryption key.`);
    }
  }
  const destPath = path14.join(SYNC_STORAGE_DIR, fileName);
  await (0, import_promises10.writeFile)(destPath, data);
}
async function exportAll(syncDir) {
  await (0, import_promises10.mkdir)(syncDir, { recursive: true });
  for (const file of SYNC_FILES) {
    await exportFile(file, syncDir);
  }
}
async function resolveConflict(sourcePath, destPath) {
  if (_config?.conflictResolution === "manual") {
    return false;
  }
  try {
    const [srcStat, destStat] = await Promise.all([
      (0, import_promises10.stat)(sourcePath).catch(() => null),
      (0, import_promises10.stat)(destPath).catch(() => null)
    ]);
    if (!destStat) return true;
    if (!srcStat) return false;
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true;
  }
}
async function importWithConflictCheck(syncDir) {
  const conflicts = [];
  for (const file of SYNC_FILES) {
    const sourcePath = resolveSyncPath(file, syncDir);
    const destPath = path14.join(SYNC_STORAGE_DIR, file);
    const shouldOverwrite = await resolveConflict(sourcePath, destPath);
    if (!shouldOverwrite) {
      conflicts.push(file);
      continue;
    }
    try {
      await importFile(file, syncDir);
    } catch (e) {
      conflicts.push(file);
    }
  }
  return conflicts;
}
async function exportSync() {
  if (!_config?.enabled) {
    return { success: false, message: "Sync is not enabled" };
  }
  _status = { ..._status, status: "syncing", message: "Exporting..." };
  try {
    const syncDir = getSyncDir();
    if (_config.provider === "git") {
      if (!_config.repo) throw new Error("Git repo URL not configured");
      await gitInit(syncDir);
      await gitSetRemote(syncDir, _config.repo);
      await gitPull(syncDir);
    }
    await exportAll(syncDir);
    if (_config.provider === "git") {
      await gitCommitAndPush(syncDir);
    }
    _status = {
      lastSyncAt: Date.now(),
      status: "idle",
      message: "Export successful",
      provider: _config.provider
    };
    return { success: true, message: "Export successful" };
  } catch (e) {
    _status = { ..._status, status: "error", message: getErrorMessage(e) };
    return { success: false, message: getErrorMessage(e) };
  }
}
async function importSync() {
  if (!_config?.enabled) {
    return { success: false, message: "Sync is not enabled" };
  }
  _status = { ..._status, status: "syncing", message: "Importing..." };
  try {
    const syncDir = getSyncDir();
    if (_config.provider === "git") {
      if (!_config.repo) throw new Error("Git repo URL not configured");
      await gitInit(syncDir);
      await gitSetRemote(syncDir, _config.repo);
      await gitPull(syncDir);
    }
    const conflicts = await importWithConflictCheck(syncDir);
    if (conflicts.length > 0) {
      _status = {
        lastSyncAt: Date.now(),
        status: "conflict",
        message: `Conflicts: ${conflicts.join(", ")}`,
        provider: _config.provider
      };
      return { success: true, message: `Imported with conflicts: ${conflicts.join(", ")}`, conflicts };
    }
    _status = {
      lastSyncAt: Date.now(),
      status: "idle",
      message: "Import successful",
      provider: _config.provider
    };
    return { success: true, message: "Import successful" };
  } catch (e) {
    _status = { ..._status, status: "error", message: getErrorMessage(e) };
    return { success: false, message: getErrorMessage(e) };
  }
}
function getSyncStatus() {
  return { ..._status };
}
function restartAutoSync() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  if (!_config?.enabled || !_config.interval) return;
  const intervalMs = _config.interval * 1e3;
  _intervalId = setInterval(() => {
    exportSync().catch((err) => {
      console.error("Auto-sync export failed:", getErrorMessage(err));
    });
  }, intervalMs);
}
async function initSync() {
  await loadSyncConfig();
  if (_config?.enabled) {
    restartAutoSync();
  }
}
async function resolveConflictsManually(resolutions) {
  if (!_config) throw new Error("Sync not configured");
  const syncDir = getSyncDir();
  for (const [file, choice] of Object.entries(resolutions)) {
    if (choice === "remote") {
      await importFile(file, syncDir);
    }
  }
}

// src/server/standalone/middleware.ts
var import_helmet = __toESM(require("helmet"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
function setupSecurityMiddleware(app2) {
  app2.use((0, import_helmet.default)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    }
  }));
  const limiter = (0, import_express_rate_limit.default)({
    windowMs: 1 * 60 * 1e3,
    max: process.env.NODE_ENV === "production" ? 120 : 1e4,
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app2.use(limiter);
}
function createApiKeyMiddleware() {
  const API_KEY = process.env.CVR_API_KEY;
  return (req, res, next) => {
    if (!API_KEY) {
      if (process.env.NODE_ENV !== "production") {
        return next();
      }
      return res.status(500).json({ error: "CVR_API_KEY not configured" });
    }
    const headerKey = req.headers["x-api-key"];
    if (headerKey !== API_KEY) {
      return res.status(401).json({ error: "Unauthorized: invalid or missing x-api-key header" });
    }
    next();
  };
}

// src/server/standalone/health.ts
var _requestCount = 0;
var _cacheHits = 0;
var _cacheMisses = 0;
var _toolCalls = 0;
var _errors = 0;
var _activeLoops = 0;
function incrementRequestCount() {
  _requestCount++;
}
function incrementToolCall() {
  _toolCalls++;
}
function incrementError() {
  _errors++;
}
function setActiveLoops(count) {
  _activeLoops = count;
}
function setupHealthRoute(app2) {
  app2.get("/api/health", (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      stats: {
        uptime: Math.round(process.uptime()),
        requests: _requestCount,
        cacheHits: _cacheHits,
        cacheMisses: _cacheMisses,
        activeLoops: _activeLoops,
        toolCalls: _toolCalls,
        errors: _errors,
        memorySize: mem.heapUsed
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        memory: {
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          rss: mem.rss
        },
        startTime: new Date(Date.now() - process.uptime() * 1e3).toISOString()
      }
    });
  });
}

// src/server/providers.ts
var import_genai = require("@google/genai");

// src/utils/constants.ts
var TIMEOUT_PERMISSION = 5 * 60 * 1e3;
var RATE_LIMIT_WINDOW_MS = 1 * 60 * 1e3;
var PROVIDER_DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1",
  anthropic: "claude-sonnet-4-20250514",
  deepseek: "deepseek-chat",
  grok: "grok-3",
  groq: "meta-llama/llama-4-maverick-17b-128e-instruct",
  baseten: "deepseek-ai/DeepSeek-V4-Pro",
  openrouter: "google/gemini-2.5-flash",
  together: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
  mistral: "mistral-large-latest",
  local: "local-model",
  custom: "custom-model"
};
var PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  grok: "https://api.x.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  baseten: "https://inference.baseten.co/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  mistral: "https://api.mistral.ai/v1"
};

// src/server/costTracker.ts
var path15 = __toESM(require("path"), 1);
var import_promises11 = require("fs/promises");
var RATE_CARDS = {
  gemini: { input: 0.075, output: 0.3 },
  openai: { input: 2.5, output: 10 },
  anthropic: { input: 3, output: 15 },
  deepseek: { input: 0.14, output: 0.28 }
};
var GENERIC_RATE = { input: 1, output: 1 };
var STORAGE_DIR = path15.join(process.cwd(), ".opencode-infinite");
var COSTS_FILE = path15.join(STORAGE_DIR, "costs.json");
function getRateCard(provider) {
  const key = provider.toLowerCase();
  return RATE_CARDS[key] || GENERIC_RATE;
}
function calculateCost(provider, inputTokens, outputTokens) {
  const rates = getRateCard(provider);
  const inputCost = inputTokens / 1e6 * rates.input;
  const outputCost = outputTokens / 1e6 * rates.output;
  return Number((inputCost + outputCost).toFixed(6));
}
async function loadCosts() {
  try {
    await (0, import_promises11.access)(COSTS_FILE);
    const data = await (0, import_promises11.readFile)(COSTS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
async function saveCosts(entries) {
  await (0, import_promises11.writeFile)(COSTS_FILE, JSON.stringify(entries, null, 2));
}
async function trackCost(provider, model, inputTokens, outputTokens) {
  const entry = {
    provider: provider.toLowerCase(),
    model: model || "unknown",
    inputTokens,
    outputTokens,
    cost: calculateCost(provider, inputTokens, outputTokens),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const entries = await loadCosts();
  entries.push(entry);
  await saveCosts(entries);
  return entry;
}
async function getCosts() {
  const entries = await loadCosts();
  const summary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    byProvider: {},
    entries
  };
  for (const entry of entries) {
    summary.totalCost += entry.cost;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;
    const existing = summary.byProvider[entry.provider];
    if (existing) {
      existing.cost += entry.cost;
      existing.inputTokens += entry.inputTokens;
      existing.outputTokens += entry.outputTokens;
      existing.calls += 1;
    } else {
      summary.byProvider[entry.provider] = {
        cost: entry.cost,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        calls: 1
      };
    }
  }
  summary.totalCost = Number(summary.totalCost.toFixed(6));
  return summary;
}
async function resetCosts() {
  await saveCosts([]);
}
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// src/server/providers.ts
var AIProvider = class {
  resolveApiKey(envVar, override) {
    return override || process.env[envVar] || "";
  }
};
var GeminiProvider = class extends AIProvider {
  cachedClient = null;
  cachedKey = void 0;
  getClient(apiKey) {
    const key = this.resolveApiKey("GEMINI_API_KEY", apiKey);
    if (!apiKey && this.cachedClient && this.cachedKey === key) return this.cachedClient;
    const client = new import_genai.GoogleGenAI({ apiKey: key });
    if (!apiKey) {
      this.cachedClient = client;
      this.cachedKey = key;
    }
    return client;
  }
  async generate(options) {
    const { prompt, contents, modelName, apiKey } = options;
    const client = this.getClient(apiKey);
    const model = modelName || PROVIDER_DEFAULT_MODELS.gemini;
    const result = await client.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        ...contents
      ]
    });
    const text = result.text || "";
    return {
      text,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(text)
    };
  }
  async embed(texts) {
    const client = this.getClient();
    const result = await client.models.embedContent({
      model: "text-embedding-004",
      contents: texts.map((t) => ({ role: "user", parts: [{ text: t }] }))
    });
    if (Array.isArray(result.embeddings)) {
      return result.embeddings.map((e) => e.values);
    }
    if (result.embeddings && Array.isArray(result.embeddings.values)) {
      return [result.embeddings.values];
    }
    throw new Error("Unexpected embedding response format");
  }
};
function buildOpenAICompatibleBody(options, providerName) {
  const { prompt, contents, modelName, temperature, maxTokens } = options;
  const defaultModel = PROVIDER_DEFAULT_MODELS[providerName] ?? "local-model";
  const body = {
    model: modelName || defaultModel,
    messages: [
      { role: "system", content: prompt },
      ...contents.map((c) => {
        const hasImages = c.parts.some((p) => p.inlineData);
        if (hasImages) {
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts.map((p) => {
              if (p.text) return { type: "text", text: p.text };
              if (p.inlineData) return { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } };
              return null;
            }).filter((x) => x !== null)
          };
        }
        return {
          role: c.role === "model" ? "assistant" : c.role,
          content: c.parts[0]?.text ?? ""
        };
      })
    ]
  };
  if (temperature !== void 0) body.temperature = temperature;
  if (maxTokens !== void 0) body.max_tokens = maxTokens;
  return body;
}
function getEnvVarForProvider(provider) {
  const map = {
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    grok: "XAI_API_KEY",
    groq: "GROQ_API_KEY",
    baseten: "BASETEN_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    together: "TOGETHER_API_KEY",
    mistral: "MISTRAL_API_KEY",
    custom: "CUSTOM_API_KEY"
  };
  return map[provider] || "";
}
var ALLOWED_LOCAL_URLS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://localhost",
  "https://127.0.0.1",
  "http://0.0.0.0"
];
function validateLocalUrl(localUrl, provider) {
  if (!localUrl) return null;
  try {
    const parsed = new URL(localUrl);
    const origin = parsed.origin.toLowerCase();
    if (provider === "local" || provider === "custom") {
      return null;
    }
    if (ALLOWED_LOCAL_URLS.some((u) => origin.startsWith(u))) {
      return null;
    }
    return "localUrl is only allowed for 'local' or 'custom' providers";
  } catch {
    return "Invalid localUrl";
  }
}
var OpenAICompatibleProvider = class extends AIProvider {
  constructor(provider) {
    super();
    this.provider = provider;
  }
  async generate(options) {
    const { prompt, contents, localUrl, apiKey, modelName, temperature, maxTokens } = options;
    const urlError = validateLocalUrl(localUrl, this.provider);
    if (urlError) throw new Error(urlError);
    if ((this.provider === "openai" || this.provider === "groq") && modelName?.toLowerCase().includes("claude")) {
      throw new Error(`Model "${modelName}" is an Anthropic Claude model, but provider is ${this.provider}. To use Claude models, select provider "anthropic" instead.`);
    }
    const baseUrl = localUrl || PROVIDER_BASE_URLS[this.provider] || "";
    const key = this.resolveApiKey(getEnvVarForProvider(this.provider), apiKey);
    const body = buildOpenAICompatibleBody({ prompt, contents, modelName, temperature, maxTokens }, this.provider);
    const authHeader = this.provider === "baseten" ? `Api-Key ${key}` : `Bearer ${key}`;
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text2 = await response.text();
      let message;
      try {
        const e = JSON.parse(text2);
        message = e.error?.message || `${this.provider} API error: HTTP ${response.status}`;
      } catch {
        message = `${this.provider} API error: HTTP ${response.status} \u2014 ${text2.slice(0, 200)}`;
      }
      throw new Error(message);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens || estimateTokens(prompt + contents.map((c) => c.parts?.[0]?.text || "").join(" "));
    const outputTokens = data.usage?.completion_tokens || estimateTokens(text);
    return { text, inputTokens, outputTokens };
  }
};
var AnthropicProvider = class extends AIProvider {
  async generate(options) {
    const { prompt, contents, apiKey, modelName, maxTokens } = options;
    const key = this.resolveApiKey("ANTHROPIC_API_KEY", apiKey);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelName || "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 4096,
        system: prompt,
        messages: contents.map((c) => {
          const hasImages = c.parts.some((p) => p.inlineData);
          if (hasImages) {
            return {
              role: c.role === "model" ? "assistant" : c.role,
              content: c.parts.map((p) => {
                if (p.text) return { type: "text", text: p.text };
                if (p.inlineData) return { type: "image", source: { type: "base64", media_type: p.inlineData.mimeType, data: p.inlineData.data } };
                return null;
              }).filter((x) => x !== null)
            };
          }
          return {
            role: c.role === "model" ? "assistant" : c.role,
            content: c.parts[0]?.text ?? ""
          };
        })
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Anthropic error");
    const text = data.content?.[0]?.text ?? "";
    const inputTokens = data.usage?.input_tokens || estimateTokens(prompt);
    const outputTokens = data.usage?.output_tokens || estimateTokens(text);
    return { text, inputTokens, outputTokens };
  }
};
var providers = {
  gemini: new GeminiProvider(),
  openai: new OpenAICompatibleProvider("openai"),
  deepseek: new OpenAICompatibleProvider("deepseek"),
  grok: new OpenAICompatibleProvider("grok"),
  groq: new OpenAICompatibleProvider("groq"),
  baseten: new OpenAICompatibleProvider("baseten"),
  openrouter: new OpenAICompatibleProvider("openrouter"),
  together: new OpenAICompatibleProvider("together"),
  mistral: new OpenAICompatibleProvider("mistral"),
  local: new OpenAICompatibleProvider("local"),
  custom: new OpenAICompatibleProvider("custom"),
  anthropic: new AnthropicProvider()
};
async function generateAIContent(prompt, contents = [], provider, localUrl, modelName, apiKey, temperature, maxTokens, useCache) {
  if (!provider) {
    throw new Error("AI provider not configured.");
  }
  if (useCache) {
    const cached = aiCache.get(prompt, contents, provider, modelName);
    if (cached) return cached;
  }
  const p = providers[provider];
  if (!p) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  const result = await p.generate({ prompt, contents, localUrl, modelName, apiKey, temperature, maxTokens });
  if (useCache) {
    aiCache.set(prompt, contents, provider, result.text, modelName);
  }
  return result.text;
}
async function generateWithDualModel(prompt, contents = [], config, purpose = "auto") {
  const useThinking = purpose === "think" || purpose === "auto" && config.thinkingProvider && config.thinkingModel;
  if (useThinking && config.thinkingProvider && config.thinkingModel) {
    return generateAIContent(
      prompt,
      contents,
      config.thinkingProvider,
      config.thinkingLocalUrl || config.primaryLocalUrl,
      config.thinkingModel,
      config.apiKey,
      config.temperature,
      config.maxTokens
    );
  }
  return generateAIContent(
    prompt,
    contents,
    config.primaryProvider,
    config.primaryLocalUrl,
    config.primaryModel,
    config.apiKey,
    config.temperature,
    config.maxTokens
  );
}
async function generateEmbeddings(texts) {
  const gemini = providers.gemini;
  return gemini.embed(texts);
}

// src/server/agentMarketplace.ts
var import_promises12 = require("fs/promises");
var path16 = __toESM(require("path"), 1);
var import_crypto5 = require("crypto");
var MARKET_DIR = path16.join(process.cwd(), ".cvr", "marketplace");
var INDEX_FILE = path16.join(MARKET_DIR, "index.json");
var REVIEWS_FILE = path16.join(MARKET_DIR, "reviews.json");
var items = [];
var reviews = [];
async function ensureMarketDir() {
  await (0, import_promises12.mkdir)(MARKET_DIR, { recursive: true });
  await (0, import_promises12.mkdir)(path16.join(MARKET_DIR, "packages"), { recursive: true });
}
async function loadIndex() {
  try {
    const raw = await (0, import_promises12.readFile)(INDEX_FILE, "utf-8");
    items = JSON.parse(raw);
  } catch {
    items = [];
  }
}
async function saveIndex() {
  await ensureMarketDir();
  await (0, import_promises12.writeFile)(INDEX_FILE, JSON.stringify(items, null, 2), "utf-8");
}
async function loadReviews() {
  try {
    const raw = await (0, import_promises12.readFile)(REVIEWS_FILE, "utf-8");
    reviews = JSON.parse(raw);
  } catch {
    reviews = [];
  }
}
async function saveReviews() {
  await ensureMarketDir();
  await (0, import_promises12.writeFile)(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
}
async function initMarketplace() {
  await loadIndex();
  await loadReviews();
}
function getMarketItems(type, tag, search) {
  let result = [...items];
  if (type) result = result.filter((i) => i.type === type);
  if (tag) result = result.filter((i) => i.tags.includes(tag));
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return result.sort((a, b) => b.downloads - a.downloads);
}
async function publishItem(type, name, description, content, author = "unknown", version = "1.0.0", tags = []) {
  await ensureMarketDir();
  const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(0, import_crypto5.randomBytes)(4).toString("hex")}`;
  const pkgPath = path16.join(MARKET_DIR, "packages", `${id}.json`);
  const pkg = { type, name, description, content, author, version, tags };
  await (0, import_promises12.writeFile)(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
  const existing = items.find((i) => i.name === name && i.type === type);
  if (existing) {
    existing.version = version;
    existing.description = description;
    existing.tags = tags;
    existing.updatedAt = Date.now();
    existing.packagePath = pkgPath;
    existing.content = content;
  } else {
    const item = {
      id,
      type,
      name,
      description,
      author,
      version,
      tags,
      downloads: 0,
      rating: 0,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
      packagePath: pkgPath,
      content
    };
    items.push(item);
  }
  await saveIndex();
  return existing ?? items[items.length - 1];
}
async function downloadItem(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.downloads++;
  await saveIndex();
  return item;
}
async function removeItem(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  const item = items[idx];
  if (item) {
    try {
      await import("fs/promises").then((m) => m.unlink(item.packagePath));
    } catch {
    }
  }
  items.splice(idx, 1);
  reviews = reviews.filter((r) => r.itemId !== id);
  await saveIndex();
  await saveReviews();
  return true;
}
async function addReview(itemId, rating, text, author = "anonymous") {
  const review = {
    itemId,
    author,
    rating: Math.min(5, Math.max(1, rating)),
    text,
    timestamp: Date.now()
  };
  reviews.push(review);
  const itemReviews = reviews.filter((r) => r.itemId === itemId);
  const avg = itemReviews.reduce((s, r) => s + r.rating, 0) / itemReviews.length;
  const item = items.find((i) => i.id === itemId);
  if (item) {
    item.rating = Math.round(avg * 10) / 10;
    await saveIndex();
  }
  await saveReviews();
  return review;
}
function getReviews(itemId) {
  return reviews.filter((r) => r.itemId === itemId);
}
function getTags(type) {
  const tagSet = /* @__PURE__ */ new Set();
  const pool = type ? items.filter((i) => i.type === type) : items;
  for (const item of pool) {
    for (const tag of item.tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort();
}
function getStats() {
  const byType = {};
  let totalDownloads = 0;
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    totalDownloads += item.downloads;
  }
  return { total: items.length, byType, totalDownloads };
}

// server.ts
init_p2pSync();

// src/server/validation.ts
var import_zod = require("zod");
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.format()
      });
      return;
    }
    next();
  };
}
var ChatRequestSchema = import_zod.z.object({
  message: import_zod.z.string().min(1).max(1e5),
  images: import_zod.z.array(import_zod.z.string()).optional(),
  config: import_zod.z.object({
    aiProvider: import_zod.z.string(),
    aiModel: import_zod.z.string().optional(),
    localUrl: import_zod.z.string().optional(),
    localModelName: import_zod.z.string().optional(),
    customUrl: import_zod.z.string().optional(),
    temperature: import_zod.z.number().optional(),
    maxTokens: import_zod.z.number().optional(),
    systemPrompt: import_zod.z.string().optional(),
    agent: import_zod.z.string().optional(),
    mode: import_zod.z.union([import_zod.z.literal("plan"), import_zod.z.literal("build"), import_zod.z.literal("review")]).optional(),
    visionEnabled: import_zod.z.boolean().optional(),
    maxImageSize: import_zod.z.number().optional(),
    apiKey: import_zod.z.string().optional()
  }).optional(),
  kernelConfig: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).optional(),
  agent: import_zod.z.string().optional()
});
var ToolExecuteSchema = import_zod.z.object({
  toolCall: import_zod.z.object({
    name: import_zod.z.string(),
    params: import_zod.z.record(import_zod.z.string(), import_zod.z.any())
  }),
  mode: import_zod.z.union([import_zod.z.literal("plan"), import_zod.z.literal("build"), import_zod.z.literal("review")]).optional(),
  sessionId: import_zod.z.string().optional()
});
var ReviewRequestSchema = import_zod.z.object({
  diff: import_zod.z.string().optional(),
  config: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).optional()
});
var AgentLoopSchema = import_zod.z.object({
  goal: import_zod.z.string().min(1),
  provider: import_zod.z.string().optional(),
  model: import_zod.z.string().optional()
});
var CronTaskSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  schedule: import_zod.z.string().min(1),
  command: import_zod.z.string().min(1),
  enabled: import_zod.z.boolean().optional()
});
var GitCommitSchema = import_zod.z.object({
  message: import_zod.z.string().min(1)
});
var BrowserNavigateSchema = import_zod.z.object({
  url: import_zod.z.string().url(),
  headless: import_zod.z.boolean().optional(),
  sessionId: import_zod.z.string().optional()
});
var BrowserActionSchema = import_zod.z.object({
  selector: import_zod.z.string().min(1),
  text: import_zod.z.string().optional(),
  headless: import_zod.z.boolean().optional(),
  sessionId: import_zod.z.string().optional()
});
var SettingsSchema = import_zod.z.object({
  aiProvider: import_zod.z.string().optional(),
  aiModel: import_zod.z.string().optional(),
  localUrl: import_zod.z.string().optional(),
  customUrl: import_zod.z.string().optional(),
  temperature: import_zod.z.number().optional(),
  maxTokens: import_zod.z.number().optional(),
  systemPrompt: import_zod.z.string().optional(),
  agent: import_zod.z.string().optional(),
  mode: import_zod.z.union([import_zod.z.literal("plan"), import_zod.z.literal("build"), import_zod.z.literal("review")]).optional(),
  visionEnabled: import_zod.z.boolean().optional(),
  maxImageSize: import_zod.z.number().optional(),
  apiKey: import_zod.z.string().optional(),
  geminiApiKey: import_zod.z.string().optional(),
  openaiApiKey: import_zod.z.string().optional(),
  anthropicApiKey: import_zod.z.string().optional(),
  deepseekApiKey: import_zod.z.string().optional(),
  groqApiKey: import_zod.z.string().optional(),
  xaiApiKey: import_zod.z.string().optional(),
  basetenApiKey: import_zod.z.string().optional(),
  openrouterApiKey: import_zod.z.string().optional(),
  togetherApiKey: import_zod.z.string().optional(),
  mistralApiKey: import_zod.z.string().optional(),
  customApiKey: import_zod.z.string().optional(),
  localModelName: import_zod.z.string().optional(),
  thinkingProvider: import_zod.z.string().optional(),
  thinkingModel: import_zod.z.string().optional(),
  thinkingLocalUrl: import_zod.z.string().optional()
}).passthrough();

// src/server/routes/chat.ts
var path18 = __toESM(require("path"), 1);
var import_promises15 = require("fs/promises");

// src/server/prompts.ts
var import_promises14 = require("fs/promises");
var AGENT_PROMPTS = {
  build: `[ROLE: BUILD] - DEFAULT DEVELOPER AGENT. You have full access to developer tools (read/write files, execute bash). Focus on iterative coding, bug fixing, and implementation.`,
  general: `[ROLE: GENERAL] - UNIVERSAL ASSISTANT. Help with complex, multi-stage tasks. You can modify files, run parallel processes, and coordinate broad workflows.`,
  explore: `[ROLE: EXPLORE] - CODEBASE EXPLORER. Read-only specialist. Efficiently search patterns, find keywords, and explain codebase structure. Use fast search tools. You CANNOT write files.`,
  scout: `[ROLE: SCOUT] - ANALYST. Read-only. Specialized in external documentation research and dependency analysis. Focus on architectural auditing and research.`,
  prometheus: `[ROLE: PROMETHEUS] - STRATEGIC PLANNER. You are a strategic architect. Before any code is written, you must clarify requirements, define architecture, and scope the work. You create comprehensive plans.`,
  hephaestus: `[ROLE: HEPHAESTUS] - DEEP EXECUTOR. Autonomous specialist. Given a goal, independently research patterns, write code, and finish the task without requiring step-by-step guidance.`
};
var _promptCache = /* @__PURE__ */ new Map();
var PROMPT_CACHE_TTL = 6e4;
async function getMemoryMtime() {
  let memory = 0;
  let user = 0;
  try {
    const memStat = await (0, import_promises14.stat)(".opencode-infinite/MEMORY.md");
    memory = memStat.mtimeMs;
  } catch {
  }
  try {
    const userStat = await (0, import_promises14.stat)(".opencode-infinite/USER.md");
    user = userStat.mtimeMs;
  } catch {
  }
  return { memory, user };
}
function getCacheKey(agent, mode, contextParts, customSystemPrompt) {
  return `${agent}|${mode}|${contextParts?.slice(0, 50) || ""}|${customSystemPrompt ? "1" : "0"}`;
}
async function buildSystemPrompt(options) {
  const { agent, mode, contextParts, customSystemPrompt } = options;
  const cacheKey = getCacheKey(agent, mode, contextParts, customSystemPrompt);
  const { memory: memoryMtime, user: userMtime } = await getMemoryMtime();
  const cached = _promptCache.get(cacheKey);
  if (cached && cached.memoryMtime === memoryMtime && cached.userMtime === userMtime && Date.now() - cached.timestamp < PROMPT_CACHE_TTL) {
    return cached.prompt;
  }
  const customAgent = getAgentById(agent);
  const agentIdentity = customAgent?.systemPrompt || AGENT_PROMPTS[agent] || AGENT_PROMPTS.build;
  const modeDirective = mode === "plan" ? `[PLANNING MODE ACTIVE]
You are in PLANNING mode. You may ONLY use read_file, list_directory, and search_files.
Do NOT write files, edit files, or execute commands. Provide a detailed implementation plan with specific file paths and changes.` : mode === "review" ? `[REVIEW MODE ACTIVE]
You are in CODE REVIEW mode. You are a senior code reviewer.
Analyze code changes thoroughly. Be constructive and specific. Suggest fixes with code examples.
Do NOT write files or execute commands. Provide structured review comments with categories and severity.` : `[BUILD MODE ACTIVE]
You are in BUILD mode. You have full access to all tools including write_file, edit_file, and execute_command.
Implement the plan directly and efficiently.`;
  const customTools = await loadCustomTools();
  const customToolDescriptions = customTools.map(
    (t) => `- ${t.id}${t.readOnly ? " (read-only)" : ""}: ${t.description}
  params: ${JSON.stringify(t.parameters.map((p) => p.name))}`
  ).join("\n");
  const toolDescriptions = TOOL_DEFINITIONS.map(
    (t) => `- ${t.name}${t.isReadOnly ? " (read-only)" : ""}: ${t.description}
  params: ${JSON.stringify(t.parameters.properties)}`
  ).join("\n") + (customToolDescriptions ? "\n" + customToolDescriptions : "");
  const memoryContext = await getMemoryContext();
  const instructionsContext = await getInstructionsContext();
  const persistentContext = contextParts || memoryContext || "No previous knowledge clusters found. Kernel is in cold-start mode.";
  const basePrompt = `You are "cvr.name", the world's most advanced autonomous coding kernel.

CURRENT_AGENT_IDENTITY:
${agentIdentity}

${modeDirective}

AVAILABLE TOOLS:
${toolDescriptions}

TOOL CALL FORMAT:
When you need to use a tool, wrap it like this:
<tool_call>
<name>TOOL_NAME</name>
<params>
{"path": "relative/path", ...}
</params>
</tool_call>

INTEGRATED PROTOCOLS:
- [COMPLEXITY_OPTIMIZER]: When analyzing or refactoring, apply Algorithmic Complexity Evaluation.
- [AGENT_BEST_PRACTICES]: Maintain a proactive, provider-neutral stance.
- [SUPERPOWERS]: Active plugin from OpenCode. Enables high-level brainstorming and advanced task decomposition.

SYSTEM ARCHITECTURE:
- Local Persistent Memory (.opencode-infinite)
- Recursive Task Execution Pipeline
- Dreamer Semantic Compression Engine
- Change History with Undo/Redo
- Browser Automation (Playwright) for web testing, scraping, and interaction

AUTONOMY PROTOCOLS:
1. OBJECTIVE: Absolute task completion.
2. ITERATION: For multi-vector tasks, solve sequentially.
3. TERMINATION: "CONTINUE_NEEDED" for next cycles. "TASK_COMPLETE" for final success.

PERSISTENT CONTEXT CLUSTERS:
${persistentContext}
${instructionsContext ? "\n" + instructionsContext : ""}
`;
  let resultPrompt;
  if (customSystemPrompt && customSystemPrompt.trim()) {
    resultPrompt = `${customSystemPrompt.trim()}

${modeDirective}

AVAILABLE TOOLS:
${toolDescriptions}

PERSISTENT CONTEXT CLUSTERS:
${persistentContext}${instructionsContext ? "\n" + instructionsContext : ""}`;
  } else {
    resultPrompt = basePrompt;
  }
  _promptCache.set(cacheKey, {
    prompt: resultPrompt,
    memoryMtime,
    userMtime,
    timestamp: Date.now()
  });
  return resultPrompt;
}

// src/server/contextWindow.ts
var ContextWindow = class {
  messages = [];
  maxTokens;
  tokenBuffer;
  nextId = 0;
  constructor(options = {}) {
    this.maxTokens = options.maxTokens ?? 128e3;
    this.tokenBuffer = options.tokenBuffer ?? 16e3;
  }
  add(role, content, priority = 1 /* NORMAL */) {
    this.messages.push({
      role,
      content,
      priority,
      timestamp: Date.now(),
      id: String(this.nextId++)
    });
  }
  addMany(msgs) {
    for (const m of msgs) {
      this.add(m.role, m.content, m.priority ?? 1 /* NORMAL */);
    }
  }
  clear() {
    this.messages = [];
  }
  size() {
    return this.messages.length;
  }
  totalTokens() {
    return this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  }
  getMessages() {
    const effectiveBudget = this.maxTokens - this.tokenBuffer;
    const systemMsgs = this.messages.filter((m) => m.priority === 5 /* CRITICAL */);
    const rest = this.messages.filter((m) => m.priority !== 5 /* CRITICAL */);
    const systemTokens = systemMsgs.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    let remainingBudget = effectiveBudget - systemTokens;
    if (remainingBudget <= 0) {
      log.warn("Context window: system messages exceed budget");
      return systemMsgs;
    }
    const sorted = [...rest].sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
    const result = [...systemMsgs];
    let usedTokens = 0;
    for (const msg of sorted) {
      const msgTokens = estimateTokens(msg.content);
      if (usedTokens + msgTokens <= remainingBudget) {
        result.push(msg);
        usedTokens += msgTokens;
      }
    }
    const trimmed = this.messages.length - result.length;
    if (trimmed > 0) {
      log.debug("Context window trimmed", {
        total: this.messages.length,
        kept: result.length,
        trimmed,
        budget: effectiveBudget,
        used: systemTokens + usedTokens
      });
    }
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }
  getStats() {
    const kept = this.getMessages();
    return {
      total: this.messages.length,
      kept: kept.length,
      trimmed: this.messages.length - kept.length,
      budget: this.maxTokens - this.tokenBuffer,
      used: kept.reduce((s, m) => s + estimateTokens(m.content), 0)
    };
  }
};
var globalContextWindow = new ContextWindow();

// src/server/imageProcessor.ts
var import_sharp = __toESM(require("sharp"), 1);
init_errors();
var DEFAULT_MAX_DIMENSION = 1024;
var MAX_FILE_SIZE_MB = 5;
var MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
var SUPPORTED_INPUT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
];
function detectMimeTypeFromBase64(base64) {
  const clean = base64.replace(/^data:image\/\w+;base64,/, "");
  const header = clean.slice(0, 8);
  const headerHex = Buffer.from(header, "base64").toString("hex");
  if (headerHex.startsWith("89504e47")) return "image/png";
  if (headerHex.startsWith("ffd8")) return "image/jpeg";
  if (headerHex.startsWith("52494646") || headerHex.startsWith("57454250")) return "image/webp";
  if (headerHex.startsWith("47494638")) return "image/gif";
  return "image/png";
}
function stripDataUrl(base64) {
  return base64.replace(/^data:image\/\w+;base64,/, "");
}
function validateImage(base64) {
  const stripped = stripDataUrl(base64);
  const buffer = Buffer.from(stripped, "base64");
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Image exceeds ${MAX_FILE_SIZE_MB}MB limit` };
  }
  if (buffer.byteLength === 0) {
    return { valid: false, error: "Invalid image data" };
  }
  return { valid: true };
}
async function processImage(base64, options = {}) {
  const { maxDimension = DEFAULT_MAX_DIMENSION } = options;
  const stripped = stripDataUrl(base64);
  const buffer = Buffer.from(stripped, "base64");
  const mimeType = detectMimeTypeFromBase64(base64);
  if (!SUPPORTED_INPUT_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported image format: ${mimeType}`);
  }
  const image = (0, import_sharp.default)(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  let pipeline = image;
  if (width > maxDimension || height > maxDimension) {
    pipeline = pipeline.resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true
    });
  }
  const outputFormat = mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpeg" : "png";
  const outputMimeType = outputFormat === "jpeg" ? "image/jpeg" : "image/png";
  if (outputFormat === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }
  const processedBuffer = await pipeline.toBuffer();
  const processedBase64 = processedBuffer.toString("base64");
  const finalMetadata = await (0, import_sharp.default)(processedBuffer).metadata();
  return {
    base64: processedBase64,
    mimeType: outputMimeType,
    width: finalMetadata.width || width,
    height: finalMetadata.height || height
  };
}
async function processImages(base64Images, options = {}) {
  const results = [];
  for (const img of base64Images) {
    const validation = validateImage(img);
    if (!validation.valid) {
      console.warn("Image validation failed:", validation.error);
      continue;
    }
    try {
      const processed = await processImage(img, options);
      results.push(processed);
    } catch (e) {
      console.warn("Image processing failed:", getErrorMessage(e));
    }
  }
  return results;
}

// src/server/routes/chat.ts
init_errors();
function buildDualConfig(cfg) {
  const result = {
    primaryProvider: cfg.aiProvider || ""
  };
  if (cfg.aiModel !== void 0) result.primaryModel = cfg.aiModel;
  if (cfg.localUrl !== void 0) result.primaryLocalUrl = cfg.localUrl;
  if (cfg.multiModelEnabled && cfg.thinkingProvider !== void 0) result.thinkingProvider = cfg.thinkingProvider;
  if (cfg.multiModelEnabled && cfg.thinkingModel !== void 0) result.thinkingModel = cfg.thinkingModel;
  if (cfg.thinkingLocalUrl !== void 0) result.thinkingLocalUrl = cfg.thinkingLocalUrl;
  const providerKey = cfg.providerKeys?.[cfg.aiProvider || ""] || cfg.apiKey;
  if (providerKey !== void 0) result.apiKey = providerKey;
  if (cfg.temperature !== void 0) result.temperature = cfg.temperature;
  if (cfg.maxTokens !== void 0) result.maxTokens = cfg.maxTokens;
  return result;
}
var STORAGE_DIR2 = path18.join(process.cwd(), ".opencode-infinite");
var HISTORY_FILE = path18.join(STORAGE_DIR2, "history.json");
var MEMORY_FILE = path18.join(STORAGE_DIR2, "memory.json");
async function ensureStorage() {
  try {
    await (0, import_promises15.mkdir)(STORAGE_DIR2, { recursive: true });
    try {
      await (0, import_promises15.access)(HISTORY_FILE);
    } catch {
      await (0, import_promises15.writeFile)(HISTORY_FILE, JSON.stringify([]));
    }
    try {
      await (0, import_promises15.access)(MEMORY_FILE);
    } catch {
      await (0, import_promises15.writeFile)(MEMORY_FILE, JSON.stringify([]));
    }
  } catch (e) {
    console.error("Storage init error:", e);
  }
}
var _historyCache = null;
var _historyCacheTime = 0;
var _memoryCache = null;
var _memoryCacheTime = 0;
async function getHistoryCached() {
  if (_historyCache && Date.now() - _historyCacheTime < 5e3) return _historyCache;
  try {
    _historyCache = JSON.parse(await (0, import_promises15.readFile)(HISTORY_FILE, "utf-8"));
    _historyCacheTime = Date.now();
    return _historyCache;
  } catch {
    return [];
  }
}
async function getMemoriesCached() {
  if (_memoryCache && Date.now() - _memoryCacheTime < 5e3) return _memoryCache;
  try {
    _memoryCache = JSON.parse(await (0, import_promises15.readFile)(MEMORY_FILE, "utf-8"));
    _memoryCacheTime = Date.now();
    return _memoryCache;
  } catch {
    return [];
  }
}
function invalidateHistoryCache() {
  _historyCache = null;
  _historyCacheTime = 0;
}
function invalidateMemoryCache() {
  _memoryCache = null;
  _memoryCacheTime = 0;
}
async function summarizeLongHistory(messages, provider, localUrl, modelName, apiKey, dualConfig) {
  if (messages.length < 5) return null;
  const instruction = `You are the "cvr.name Dreamer Engine". Examine the conversation below and extract:
  1. KEY_FACTS: Fundamental project decisions or requirements.
  2. INVARIANT_RULES: Coding standards or logic that MUST not change.
  3. PROGRESS_STATE: What was just finished.
  4. PENDING_GOALS: What the agent is currently working towards.
  
  Format as a strict technical manifest (max 150 words). Focus on architectural integrity.
  
  Conversation:
  ${messages.slice(-10).map((m) => `${m.role}: ${m.content}`).join("\n")}`;
  try {
    if (dualConfig?.thinkingProvider && dualConfig?.thinkingModel) {
      return await generateWithDualModel(instruction, [], dualConfig, "think");
    }
    return await generateAIContent(instruction, [], provider, localUrl, modelName, apiKey);
  } catch (error) {
    console.error("Summarization failed:", error);
    return null;
  }
}
function registerRoutes(app2) {
  app2.post("/api/chat", async (req, res) => {
    incrementRequestCount();
    try {
      const body = req.body;
      const { message, config = {}, kernelConfig = {}, agent: bodyAgent } = body;
      const { aiProvider, localUrl, aiModel, localModelName, apiKey, providerKeys, temperature, maxTokens, systemPrompt: customSystemPrompt, agent: configAgent, maxImageSize } = config;
      const resolvedApiKey = providerKeys?.[aiProvider || ""] || apiKey;
      if (!aiProvider) {
        res.status(400).json({ error: "AI provider not configured. Please select a provider in Settings." });
        return;
      }
      const resolvedModel = aiProvider === "local" ? localModelName || aiModel : aiModel;
      const kConfig = kernelConfig?.aiProvider ? kernelConfig : config;
      const history = await getHistoryCached();
      const memories = await getMemoriesCached();
      const agent = bodyAgent || configAgent || "build";
      const mode = config.mode || "build";
      const contextParts = memories.slice(-5).map((m) => `[CLUSTER_DATA]: ${m.content}`).join("\n");
      const systemPrompt = await buildSystemPrompt({
        agent,
        mode,
        contextParts,
        customSystemPrompt: customSystemPrompt && customSystemPrompt.trim() ? customSystemPrompt : void 0
      });
      const rawImages = body.images ?? [];
      let processedImages = [];
      if (Array.isArray(rawImages) && rawImages.length > 0) {
        processedImages = await processImages(rawImages, { maxDimension: maxImageSize || 1024 });
      }
      const buildParts = (text, imgs) => {
        const parts = [{ text }];
        if (imgs && imgs.length > 0) {
          for (const img of imgs) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
          }
        }
        return parts;
      };
      const ctxWindow = new ContextWindow({ maxTokens: 128e3, tokenBuffer: 16e3 });
      for (const m of history.slice(-20)) {
        const priority = m.role === "user" && m.content.startsWith("/") ? 3 /* HIGH */ : 1 /* NORMAL */;
        ctxWindow.add(m.role, m.content, priority);
      }
      const visibleHistory = ctxWindow.getMessages();
      const historyLookup = /* @__PURE__ */ new Map();
      for (const h of history) {
        historyLookup.set(`${h.role}:${h.content}`, h);
      }
      const historyContents = visibleHistory.map((m) => {
        const hEntry = historyLookup.get(`${m.role}:${m.content}`);
        const parts = [{ text: m.content }];
        if (hEntry?.images && Array.isArray(hEntry.images)) {
          for (const img of hEntry.images) {
            const match = typeof img === "string" ? img.match(/^data:([^;]+);base64,(.+)$/) : null;
            if (match && match[1] && match[2]) {
              parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            }
          }
        }
        return { role: m.role, parts };
      });
      const responseText = await generateAIContent(systemPrompt, [
        ...historyContents,
        { role: "user", parts: buildParts(message, processedImages) }
      ], aiProvider, localUrl, resolvedModel, resolvedApiKey, temperature, maxTokens, true);
      const estimatedInputTokens = Math.ceil((systemPrompt + message).length / 4);
      const estimatedOutputTokens = Math.ceil(responseText.length / 4);
      const userHistoryEntry = { role: "user", content: message, createdAt: /* @__PURE__ */ new Date() };
      if (processedImages.length > 0) {
        userHistoryEntry.images = processedImages.map((img) => `data:${img.mimeType};base64,${img.base64}`);
      }
      const updatedHistory = [...history, userHistoryEntry, { role: "assistant", content: responseText, createdAt: /* @__PURE__ */ new Date() }];
      await (0, import_promises15.writeFile)(HISTORY_FILE, JSON.stringify(updatedHistory));
      invalidateHistoryCache();
      if (updatedHistory.length % 5 === 0) {
        const kConfigTyped = kConfig;
        const dualCfg = buildDualConfig(kConfigTyped);
        const summaryKey = kConfigTyped.providerKeys?.[kConfigTyped.aiProvider || ""] || kConfigTyped.apiKey;
        summarizeLongHistory(updatedHistory, kConfigTyped.aiProvider, kConfigTyped.localUrl, kConfigTyped.aiProvider === "local" ? kConfigTyped.localModelName || kConfigTyped.aiModel : kConfigTyped.aiModel, summaryKey, dualCfg).then(async (summary) => {
          if (summary) {
            const currentMemories = JSON.parse(await (0, import_promises15.readFile)(MEMORY_FILE, "utf-8"));
            await (0, import_promises15.writeFile)(MEMORY_FILE, JSON.stringify([...currentMemories, { content: summary, createdAt: /* @__PURE__ */ new Date() }]));
            invalidateMemoryCache();
          }
        });
      }
      res.json({
        content: responseText,
        continueNeeded: responseText.includes("CONTINUE_NEEDED"),
        tokenUsage: { input: estimatedInputTokens, output: estimatedOutputTokens }
      });
      trackCost(aiProvider, resolvedModel || "unknown", estimatedInputTokens, estimatedOutputTokens).catch(() => {
      });
    } catch (error) {
      console.error("API Error:", getErrorMessage(error));
      res.status(500).json({ error: getErrorMessage(error) });
    }
  });
  app2.get("/api/models", async (req, res) => {
    try {
      const provider = req.query.provider || "";
      const apiKey = req.query.apiKey || void 0;
      const baseUrls = {
        openai: "https://api.openai.com/v1",
        deepseek: "https://api.deepseek.com/v1",
        grok: "https://api.x.ai/v1",
        groq: "https://api.groq.com/openai/v1",
        baseten: "https://api.baseten.co/v1",
        openrouter: "https://openrouter.ai/api/v1",
        together: "https://api.together.xyz/v1",
        mistral: "https://api.mistral.ai/v1"
      };
      if (provider === "gemini") {
        const key2 = apiKey || process.env.GEMINI_API_KEY || "";
        if (!key2) {
          res.status(400).json({ error: "API key required" });
          return;
        }
        const resp2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key2}`);
        const data2 = await resp2.json();
        const models2 = (data2.models || []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).sort((a, b) => (b.name || "").localeCompare(a.name || "")).slice(0, 30).map((m) => ({ id: m.name?.replace("models/", "") || "", name: m.displayName || m.name || "" }));
        res.json({ models: models2 });
        return;
      }
      if (provider === "anthropic") {
        const key2 = apiKey || process.env.ANTHROPIC_API_KEY || "";
        if (!key2) {
          res.status(400).json({ error: "API key required" });
          return;
        }
        const resp2 = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": key2, "anthropic-version": "2023-06-01" }
        });
        const data2 = await resp2.json();
        const models2 = (data2.data || []).sort((a, b) => (b.id || "").localeCompare(a.id || "")).slice(0, 20).map((m) => ({ id: m.id || "", name: m.display_name || m.id || "" }));
        res.json({ models: models2 });
        return;
      }
      if (provider === "baseten") {
        const key2 = apiKey || process.env.BASETEN_API_KEY || "";
        if (!key2) {
          res.status(400).json({ error: "API key required \u2014 set BASETEN_API_KEY env var" });
          return;
        }
        const resp2 = await fetch("https://api.baseten.co/v1/models", {
          headers: { Authorization: `Api-Key ${key2}`, "Content-Type": "application/json" }
        });
        if (!resp2.ok) {
          res.status(resp2.status).json({ error: `Baseten API: ${resp2.status} \u2014 deploy models at baseten.co/library` });
          return;
        }
        const data2 = await resp2.json();
        const models2 = (data2.models || []).filter((m) => m.status === "ACTIVE" || m.status === "READY").sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((m) => ({ id: m.id || m.model_id || "", name: m.name || m.id || m.model_id || "" }));
        res.json({ models: models2, note: "Only deployed models shown. Deploy from baseten.co/library" });
        return;
      }
      const baseUrl = baseUrls[provider] || "";
      if (!baseUrl) {
        res.status(400).json({ error: "Unknown provider" });
        return;
      }
      const envKeyMap = {
        openai: "OPENAI_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
        grok: "XAI_API_KEY",
        groq: "GROQ_API_KEY",
        baseten: "BASETEN_API_KEY",
        openrouter: "OPENROUTER_API_KEY",
        together: "TOGETHER_API_KEY",
        mistral: "MISTRAL_API_KEY"
      };
      const key = apiKey || process.env[envKeyMap[provider] || ""] || "";
      if (!key) {
        res.status(400).json({ error: "API key required \u2014 set via env var or enter in settings" });
        return;
      }
      const authPrefix = provider === "baseten" ? "Api-Key" : "Bearer";
      const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `${authPrefix} ${key}`, "Content-Type": "application/json" }
      });
      if (!resp.ok) {
        const err = await resp.text().catch(() => "");
        res.status(resp.status).json({ error: `API error: ${resp.status} ${err.slice(0, 200)}` });
        return;
      }
      const data = await resp.json();
      const rawModels = data.data || data.models || [];
      const models = rawModels.filter((m) => m.id && !m.id.includes("embed") && !m.id.includes("tts") && !m.id.includes("whisper") && !m.id.includes("dall")).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 40).map((m) => ({ id: m.id || "", name: m.id || "" }));
      res.json({ models });
    } catch (err) {
      res.status(500).json({ error: getErrorMessage(err) });
    }
  });
  app2.get("/api/history", async (_req, res) => {
    try {
      const history = await getHistoryCached();
      const memories = await getMemoriesCached();
      res.json({ history, memories });
    } catch {
      res.json({ history: [], memories: [] });
    }
  });
  app2.post("/api/clear", async (_req, res) => {
    await (0, import_promises15.writeFile)(HISTORY_FILE, JSON.stringify([]));
    await (0, import_promises15.writeFile)(MEMORY_FILE, JSON.stringify([]));
    invalidateHistoryCache();
    invalidateMemoryCache();
    res.json({ status: "cleared" });
  });
}

// src/server/routes/memory.ts
init_errors();
function registerRoutes2(app2) {
  app2.get("/api/memory", async (_req, res) => {
    try {
      const data = await readMemory();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.post("/api/memory", async (req, res) => {
    try {
      const { content, section } = req.body;
      await writeMemory(content ?? "", section);
      res.json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.put("/api/memory", async (req, res) => {
    try {
      const { content, section } = req.body;
      await replaceMemorySection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.delete("/api/memory", async (req, res) => {
    try {
      const { section } = req.body;
      await deleteMemorySection(section);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.get("/api/user", async (_req, res) => {
    try {
      const data = await readUser();
      res.json({ raw: data.raw, sections: data.sections });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.post("/api/user", async (req, res) => {
    try {
      const { content, section } = req.body;
      await writeUser(content ?? "", section);
      res.json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.put("/api/user", async (req, res) => {
    try {
      const { content, section } = req.body;
      await replaceUserSection(section, content.split("\n"));
      res.json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.delete("/api/user", async (req, res) => {
    try {
      const { section } = req.body;
      await deleteUserSection(section);
      res.json({ deleted: true });
    } catch (e) {
      res.status(500).json({ error: getErrorMessage(e) });
    }
  });
}

// src/server/routes/sessions.ts
init_sessionStore();
init_errors();
function registerRoutes3(app2) {
  app2.post("/api/sessions", async (req, res) => {
    try {
      const { title } = req.body;
      const session = createSession(title || "New Session");
      return res.json(session);
    } catch (e) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = listSessions();
      return res.json({ sessions });
    } catch (e) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.get("/api/sessions/:id", async (req, res) => {
    try {
      const result = getSession(req.params.id);
      if (!result) return res.status(404).json({ error: "Session not found" });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: getErrorMessage(e) });
    }
  });
  app2.post("/api/sessions/:id/messages", async (req, res) => {
    try {
      const { role, content } = req.body;
      const message = addMessage(req.params.id, role ?? "user", content ?? "");
      return res.json(message);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/sessions/search", async (req, res) => {
    try {
      const { q, limit } = req.query;
      const results = searchSessions(String(q || ""), limit ? parseInt(String(limit), 10) : 20);
      return res.json({ results });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/sessions/:id", async (req, res) => {
    try {
      deleteSession(req.params.id);
      return res.json({ deleted: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}

// src/server/routes/knowledge.ts
function registerRoutes4(app2) {
  app2.get("/api/skills", async (_req, res) => {
    try {
      const skills = await loadSkills();
      return res.json({ skills: skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers })) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/skills/:id", async (req, res) => {
    try {
      const skill = await getSkillById(req.params.id);
      if (!skill) return res.status(404).json({ error: "Skill not found" });
      return res.json({ id: skill.id, name: skill.name, description: skill.description, triggers: skill.triggers, content: skill.content });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/rag/ingest", async (req, res) => {
    try {
      const { source, content } = req.body;
      await ingestDocument(source || "unknown", content || "", generateEmbeddings);
      return res.json({ ingested: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/rag/search", async (req, res) => {
    try {
      const { q, topK } = req.query;
      const results = await searchRAG(String(q || ""), generateEmbeddings, topK ? parseInt(String(topK), 10) : 3);
      return res.json({ results });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/rag/sources", async (_req, res) => {
    try {
      return res.json({ sources: listSources() });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/rag/sources/:source", async (req, res) => {
    try {
      clearSource(req.params.source);
      return res.json({ cleared: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/rules", async (_req, res) => {
    try {
      const instructions = await loadInstructions();
      return res.json({ rules: instructions.map((r) => ({ name: r.name, priority: r.priority })) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/rules/:name", async (req, res) => {
    try {
      const instructions = await loadInstructions();
      const rule = instructions.find((r) => r.name === req.params.name);
      if (!rule) return res.status(404).json({ error: "Rule not found" });
      return res.json({ name: rule.name, content: rule.content, priority: rule.priority });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/rules/context", async (_req, res) => {
    try {
      const ctx = await getInstructionsContext();
      return res.json({ context: ctx });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/rules/:name", async (req, res) => {
    try {
      const { content, priority } = req.body;
      await saveInstruction(req.params.name, content, priority ?? 0);
      return res.json({ saved: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/rules/:name", async (req, res) => {
    try {
      await deleteInstruction(req.params.name);
      return res.json({ deleted: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/custom-tools", async (_req, res) => {
    try {
      const tools = await loadCustomTools();
      return res.json({ tools: tools.map((t) => ({ id: t.id, name: t.name, description: t.description, readOnly: t.readOnly })) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/custom-tools/:id", async (req, res) => {
    try {
      const tools = await loadCustomTools();
      const tool = tools.find((t) => t.id === req.params.id);
      if (!tool) return res.status(404).json({ error: "Tool not found" });
      return res.json({ id: tool.id, name: tool.name, description: tool.description, parameters: tool.parameters, readOnly: tool.readOnly });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}

// src/server/cronScheduler.ts
var import_crypto7 = require("crypto");
function parseSchedule(schedule) {
  if (schedule.startsWith("every ")) {
    const match = schedule.match(/every (\d+) (minute|minutes|hour|hours|day|days)/);
    if (!match || match[1] === void 0 || match[2] === void 0) return null;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const ms = unit.startsWith("minute") ? num * 60 * 1e3 : unit.startsWith("hour") ? num * 60 * 60 * 1e3 : num * 24 * 60 * 60 * 1e3;
    return ms;
  }
  const parts = schedule.split(" ");
  if (parts.length === 5 && parts[0] !== void 0 && parts[0].startsWith("*/")) {
    const mins = parseInt(parts[0].slice(2), 10);
    if (!isNaN(mins)) return mins * 60 * 1e3;
  }
  return null;
}
var CronScheduler = class {
  tasks = /* @__PURE__ */ new Map();
  timers = /* @__PURE__ */ new Map();
  addTask(task) {
    const id = (0, import_crypto7.randomUUID)();
    const fullTask = { ...task, id };
    this.tasks.set(id, fullTask);
    if (fullTask.enabled) {
      this.startTask(id);
    }
    return fullTask;
  }
  removeTask(id) {
    this.stopTask(id);
    this.tasks.delete(id);
  }
  enableTask(id) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = true;
    this.startTask(id);
  }
  disableTask(id) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.enabled = false;
    this.stopTask(id);
  }
  getTasks() {
    return Array.from(this.tasks.values());
  }
  getTask(id) {
    return this.tasks.get(id);
  }
  startTask(id) {
    const task = this.tasks.get(id);
    if (!task || !task.enabled) return;
    const interval = parseSchedule(task.schedule);
    if (!interval) return;
    task.nextRun = Date.now() + interval;
    const timer = setInterval(() => {
      this.runTask(id);
    }, interval);
    this.timers.set(id, timer);
  }
  stopTask(id) {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
  }
  runTask(id) {
    const task = this.tasks.get(id);
    if (!task) return;
    task.lastRun = Date.now();
    task.nextRun = Date.now() + (parseSchedule(task.schedule) || 0);
    console.log(`[CRON] Running task ${task.name}: ${task.command}`);
  }
  onTaskRun(id, callback) {
    const task = this.tasks.get(id);
    if (!task) return;
    this.stopTask(id);
    const interval = parseSchedule(task.schedule);
    if (!interval) return;
    const timer = setInterval(() => {
      task.lastRun = Date.now();
      task.nextRun = Date.now() + interval;
      callback(task);
    }, interval);
    this.timers.set(id, timer);
  }
  dispose() {
    for (const [id] of this.timers) {
      this.stopTask(id);
    }
    this.tasks.clear();
  }
};
var cronScheduler = new CronScheduler();

// src/server/promptTester.ts
async function runPromptTest(req) {
  const variantResults = [];
  for (const variant of req.variants) {
    const start = Date.now();
    try {
      const contents = [
        { role: "user", parts: [{ text: req.task }] }
      ];
      const options = {
        prompt: variant.systemPrompt,
        contents,
        modelName: req.model,
        apiKey: req.apiKey,
        temperature: req.temperature ?? 0.7,
        maxTokens: req.maxTokens ?? 4096
      };
      const response = await generateAIContent(
        options.prompt,
        contents,
        req.provider,
        req.localUrl ?? "",
        req.model ?? "",
        req.apiKey ?? "",
        options.temperature,
        options.maxTokens
      );
      const outputTok = estimateTokens(response);
      variantResults.push({
        variantName: variant.name,
        output: response,
        inputTokens: estimateTokens(variant.systemPrompt + req.task),
        outputTokens: outputTok,
        timeMs: Date.now() - start
      });
    } catch (e) {
      variantResults.push({
        variantName: variant.name,
        output: "",
        inputTokens: 0,
        outputTokens: 0,
        timeMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }
  const result = {
    task: req.task,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    variants: variantResults
  };
  const judgeProvider = req.judgeProvider || req.provider;
  const judgeModel = req.judgeModel || req.model;
  if (variantResults.length >= 2 && variantResults.every((v) => !v.error) && judgeProvider) {
    const comparison = await compareWithJudge(
      req.task,
      variantResults,
      judgeProvider,
      req.localUrl ?? "",
      judgeModel ?? "",
      req.apiKey ?? ""
    );
    result.comparison = comparison;
  }
  return result;
}
async function compareWithJudge(task, results, provider, localUrl, model, apiKey) {
  const comparisonPrompt = `You are an impartial judge evaluating prompt variants for an AI coding assistant.

USER TASK:
${task}

Evaluate these outputs from different prompt variants and determine which is best overall. Consider:
1. Quality: correctness, completeness, code quality
2. Efficiency: conciseness, token usage  
3. Creativity: elegant solutions, novel approaches

Output ONLY a JSON object (no markdown, no code fences):

{
  "winner": "VariantName",
  "reasoning": "Brief explanation of why this variant won.",
  "scores": {
    "VariantA": { "quality": 8, "efficiency": 7, "creativity": 6 },
    "VariantB": { "quality": 7, "efficiency": 9, "creativity": 8 }
  }
}`;
  const variantsText = results.map(
    (r) => `### VARIANT: ${r.variantName} (${r.inputTokens + r.outputTokens} tokens, ${r.timeMs}ms)
${r.output.slice(0, 2e3)}`
  ).join("\n\n---\n\n");
  try {
    const response = await generateAIContent(
      comparisonPrompt + "\n\n" + variantsText,
      [],
      provider,
      localUrl,
      model,
      apiKey,
      0.3,
      2048
    );
    const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const bestTokens = results.reduce(
      (best, r) => r.inputTokens + r.outputTokens < best.inputTokens + best.outputTokens ? r : best
    );
    return {
      winner: bestTokens.variantName,
      reasoning: "Fallback: selected by lowest token count (judge unavailable).",
      scores: Object.fromEntries(
        results.map((r) => [
          r.variantName,
          {
            quality: Math.round((1 - (r.output.length ? 0 : 1)) * 10),
            efficiency: Math.round(
              Math.min(10, 1e4 / Math.max(1, r.inputTokens + r.outputTokens))
            ),
            creativity: 5
          }
        ])
      )
    };
  }
}

// src/server/routes/ecosystem.ts
init_p2pSync();
function registerRoutes5(app2) {
  app2.get("/api/plugins", async (_req, res) => {
    try {
      const plugins = getPlugins();
      return res.json({ plugins: plugins.map((p) => ({ id: p.manifest.id, name: p.manifest.name, version: p.manifest.version, enabled: p.enabled })) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/plugins/:id/enable", (req, res) => {
    enablePlugin(req.params.id);
    return res.json({ enabled: true });
  });
  app2.post("/api/plugins/:id/disable", (req, res) => {
    disablePlugin(req.params.id);
    return res.json({ disabled: true });
  });
  app2.get("/api/cron", (_req, res) => {
    return res.json({ tasks: cronScheduler.getTasks() });
  });
  app2.post("/api/cron", validateBody(CronTaskSchema), (req, res) => {
    try {
      const task = cronScheduler.addTask(req.body);
      return res.json(task);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/cron/:id", (req, res) => {
    cronScheduler.removeTask(req.params.id);
    return res.json({ removed: true });
  });
  app2.post("/api/cron/:id/enable", (req, res) => {
    cronScheduler.enableTask(req.params.id);
    return res.json({ enabled: true });
  });
  app2.post("/api/cron/:id/disable", (req, res) => {
    cronScheduler.disableTask(req.params.id);
    return res.json({ disabled: true });
  });
  app2.get("/api/hooks", (_req, res) => {
    res.json({ hooks: hookRegistry.list() });
  });
  app2.post("/api/hooks/register", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Hook registration disabled in production" });
    }
    try {
      const { id, hookPoint, handler, priority = 0 } = req.body;
      if (!id || !hookPoint || !handler) {
        return res.status(400).json({ error: "Missing id, hookPoint, or handler" });
      }
      hookRegistry.register({ id, hookPoint, handler: () => {
      }, priority });
      return res.json({ registered: true, id, hookPoint });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/hooks/unregister", (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Hook unregistration disabled in production" });
    }
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      hookRegistry.unregister(id);
      return res.json({ unregistered: true, id });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/costs", async (_req, res) => {
    try {
      const costs = await getCosts();
      return res.json(costs);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/costs/reset", async (_req, res) => {
    try {
      await resetCosts();
      return res.json({ reset: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/sync/status", (_req, res) => {
    res.json(getSyncStatus());
  });
  app2.post("/api/sync/export", async (_req, res) => {
    const result = await exportSync();
    res.json(result);
  });
  app2.post("/api/sync/import", async (_req, res) => {
    const result = await importSync();
    res.json(result);
  });
  app2.get("/api/sync/config", (_req, res) => {
    res.json(getSyncConfig());
  });
  app2.post("/api/sync/config", async (req, res) => {
    try {
      await saveSyncConfig(req.body);
      res.json({ saved: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/sync/resolve", async (req, res) => {
    try {
      const { resolutions } = req.body;
      await resolveConflictsManually(resolutions);
      res.json({ resolved: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/prompt-test", async (req, res) => {
    try {
      const { task, variants, provider, model, localUrl, apiKey, temperature, maxTokens, judgeProvider, judgeModel } = req.body;
      if (!task || !variants || !Array.isArray(variants) || variants.length < 2 || !provider) {
        res.status(400).json({ error: "task, variants (min 2), and provider are required" });
        return;
      }
      const result = await runPromptTest({
        task,
        variants,
        provider,
        model,
        localUrl,
        apiKey,
        temperature,
        maxTokens,
        judgeProvider,
        judgeModel
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/p2p/status", (_req, res) => {
    res.json({
      active: isP2PActive(),
      peers: getPeers(),
      shares: getShares().length
    });
  });
  app2.get("/api/p2p/peers", (_req, res) => {
    res.json({ peers: getPeers() });
  });
  app2.get("/api/p2p/shares", (req, res) => {
    const type = req.query.type;
    res.json({ shares: getShares(type) });
  });
  app2.post("/api/p2p/share", (req, res) => {
    try {
      const { type, name, content } = req.body;
      if (!type || !name || !content) {
        res.status(400).json({ error: "type, name, and content are required" });
        return;
      }
      const fragment = publishShare(type, name, content);
      res.json(fragment);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// src/server/changes.ts
var import_promises16 = require("fs/promises");
var path19 = __toESM(require("path"), 1);
var STORAGE_DIR3 = path19.join(process.cwd(), ".opencode-infinite");
var CHANGES_FILE = path19.join(STORAGE_DIR3, "changes.json");
var MAX_CHANGES = 50;
var MAX_SNAPSHOT_SIZE = 1024 * 1024;
async function loadHistory() {
  try {
    const data = await (0, import_promises16.readFile)(CHANGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { changes: [], undoStack: [], redoStack: [] };
  }
}
async function saveHistory(history) {
  await (0, import_promises16.mkdir)(STORAGE_DIR3, { recursive: true });
  await (0, import_promises16.writeFile)(CHANGES_FILE, JSON.stringify(history, null, 2));
}
async function recordChange(filePath, operation, afterContent, description) {
  const history = await loadHistory();
  let beforeContent = null;
  try {
    const fullPath = path19.join(process.cwd(), filePath);
    const fileStats = await (0, import_promises16.stat)(fullPath);
    if (fileStats.size <= MAX_SNAPSHOT_SIZE) {
      beforeContent = await (0, import_promises16.readFile)(fullPath, "utf-8");
    } else {
      beforeContent = "[FILE_TOO_LARGE_FOR_SNAPSHOT]";
    }
  } catch {
  }
  const change = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    filePath,
    operation,
    beforeContent,
    afterContent,
    description
  };
  history.changes.push(change);
  while (history.changes.length > MAX_CHANGES) {
    const removed = history.changes.shift();
    if (removed) {
      history.undoStack = history.undoStack.filter((id) => id !== removed.id);
      history.redoStack = history.redoStack.filter((id) => id !== removed.id);
    }
  }
  history.redoStack = [];
  await saveHistory(history);
  return change;
}
async function undoChange() {
  const history = await loadHistory();
  const activeChanges = history.changes.filter((c) => !history.undoStack.includes(c.id));
  if (activeChanges.length === 0) {
    return { success: false, error: "Nothing to undo" };
  }
  const change = activeChanges[activeChanges.length - 1];
  if (!change) {
    return { success: false, error: "Nothing to undo" };
  }
  history.undoStack.push(change.id);
  const fullPath = path19.join(process.cwd(), change.filePath);
  if (change.beforeContent === null) {
    try {
      await (0, import_promises16.unlink)(fullPath);
    } catch {
    }
  } else if (change.beforeContent === "[FILE_TOO_LARGE_FOR_SNAPSHOT]") {
    await saveHistory(history);
    return { success: false, error: "Cannot undo: file was too large to snapshot" };
  } else {
    await (0, import_promises16.mkdir)(path19.dirname(fullPath), { recursive: true });
    await (0, import_promises16.writeFile)(fullPath, change.beforeContent, "utf-8");
  }
  await saveHistory(history);
  return { success: true, restored: change };
}
async function redoChange() {
  const history = await loadHistory();
  if (history.redoStack.length === 0) {
    return { success: false, error: "Nothing to redo" };
  }
  const changeId = history.redoStack[history.redoStack.length - 1];
  const change = history.changes.find((c) => c.id === changeId);
  if (!change) {
    return { success: false, error: "Change not found in history" };
  }
  history.redoStack.pop();
  history.undoStack = history.undoStack.filter((id) => id !== changeId);
  const fullPath = path19.join(process.cwd(), change.filePath);
  await (0, import_promises16.mkdir)(path19.dirname(fullPath), { recursive: true });
  await (0, import_promises16.writeFile)(fullPath, change.afterContent, "utf-8");
  await saveHistory(history);
  return { success: true, restored: change };
}
async function getChangeState() {
  const history = await loadHistory();
  const activeChanges = history.changes.filter((c) => !history.undoStack.includes(c.id));
  const canUndo = activeChanges.length > 0;
  const canRedo = history.redoStack.length > 0;
  return { changes: history.changes, canUndo, canRedo };
}

// src/server/routes/git.ts
function buildDualConfig2(cfg) {
  const result = {
    primaryProvider: cfg.aiProvider || ""
  };
  if (cfg.aiModel !== void 0) result.primaryModel = cfg.aiModel;
  if (cfg.localUrl !== void 0) result.primaryLocalUrl = cfg.localUrl;
  if (cfg.multiModelEnabled && cfg.thinkingProvider !== void 0) result.thinkingProvider = cfg.thinkingProvider;
  if (cfg.multiModelEnabled && cfg.thinkingModel !== void 0) result.thinkingModel = cfg.thinkingModel;
  if (cfg.thinkingLocalUrl !== void 0) result.thinkingLocalUrl = cfg.thinkingLocalUrl;
  if (cfg.apiKey !== void 0) result.apiKey = cfg.apiKey;
  if (cfg.temperature !== void 0) result.temperature = cfg.temperature;
  if (cfg.maxTokens !== void 0) result.maxTokens = cfg.maxTokens;
  return result;
}
function registerRoutes6(app2) {
  app2.get("/api/git/status", async (_req, res) => {
    try {
      const status = await getGitStatus();
      return res.json(status);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/git/diff", async (req, res) => {
    try {
      const staged = req.query.staged === "true";
      const diffs = await getGitDiff(staged);
      return res.json({ diffs });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/git/commit", validateBody(GitCommitSchema), async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Commit message is required" });
      }
      const result = await gitCommit(message);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/git/push", async (_req, res) => {
    try {
      const result = await gitPush();
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/git/log", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const commits = await getGitLog(limit);
      return res.json({ commits });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/git/pr", async (req, res) => {
    try {
      const { draft, config = {} } = req.body || {};
      const {
        aiProvider,
        localUrl,
        aiModel,
        apiKey,
        temperature,
        maxTokens,
        multiModelEnabled,
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl
      } = config;
      const dualCfg = buildDualConfig2({
        aiProvider,
        aiModel,
        localUrl,
        apiKey,
        temperature,
        maxTokens,
        multiModelEnabled,
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl
      });
      const ctx = await gatherPRContext();
      const thinkFn = (prompt) => generateWithDualModel(prompt, [], dualCfg, "think");
      const { title, description } = await generatePRDescription(ctx, thinkFn);
      const result = await createGitHubPR(title, description, ctx.baseBranch, !!draft);
      res.json({ context: ctx, pr: result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/git/pr/context", async (_req, res) => {
    try {
      const ctx = await gatherPRContext();
      res.json(ctx);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/git/pr/list", async (_req, res) => {
    try {
      const prs = await listOpenPRs();
      res.json({ prs: JSON.parse(prs) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/git/branch", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Branch name required" });
        return;
      }
      const result = await createBranch(name);
      res.json({ branch: result });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/git/branches", async (_req, res) => {
    try {
      const branches = await listBranches();
      res.json({ branches: branches.split("\n").map((b) => b.replace(/^\*?\s+/, "").trim()).filter(Boolean) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/undo", async (_req, res) => {
    const result = await undoChange();
    res.json(result);
  });
  app2.post("/api/redo", async (_req, res) => {
    const result = await redoChange();
    res.json(result);
  });
  app2.get("/api/changes", async (_req, res) => {
    const state = await getChangeState();
    res.json(state);
  });
}

// src/server/routes/agent.ts
var import_crypto8 = require("crypto");

// src/server/planner.ts
async function createPlan(goal, thinkFn) {
  const prompt = `Break down this goal into a sequence of concrete tasks:
Goal: ${goal}

Respond with a JSON array of tasks in this format:
[
  {"description": "task 1", "dependencies": []},
  {"description": "task 2", "dependencies": [1]}
]

Tasks:`;
  try {
    const result = await thinkFn(prompt);
    const tasks = JSON.parse(result);
    return {
      goal,
      tasks: tasks.map((t, i) => ({
        id: i + 1,
        description: t.description,
        dependencies: t.dependencies || [],
        status: "pending"
      }))
    };
  } catch {
    return { goal, tasks: [{ id: 1, description: goal, dependencies: [], status: "pending" }] };
  }
}

// src/server/routes/agent.ts
function registerRoutes7(app2) {
  app2.post("/api/agent/loop", validateBody(AgentLoopSchema), async (req, res) => {
    try {
      const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const id = (0, import_crypto8.randomUUID)();
      const dualCfg = {
        primaryProvider: provider || "",
        primaryModel: model,
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl
      };
      const loop = new AgentLoop(goal, {
        maxSteps: 20,
        permissionEngine,
        thinkFn: (prompt) => generateWithDualModel(prompt, [], dualCfg, "think"),
        sessionId: id
      });
      agentLoopMap.set(id, loop);
      setActiveLoops(agentLoopMap.size);
      loop.run().then(() => {
        agentLoopMap.delete(id);
        setActiveLoops(agentLoopMap.size);
      }).catch((err) => {
        console.error(`Agent loop ${id} error:`, err);
        agentLoopMap.delete(id);
        setActiveLoops(agentLoopMap.size);
        incrementError();
      });
      res.json({ id, state: loop.getState() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/agent/loop/:id", (req, res) => {
    const loop = agentLoopMap.get(req.params.id);
    if (!loop) return res.status(404).json({ error: "Loop not found" });
    return res.json(loop.getState());
  });
  app2.post("/api/agent/loop/:id/abort", (req, res) => {
    const loop = agentLoopMap.get(req.params.id);
    if (!loop) return res.status(404).json({ error: "Loop not found" });
    loop.abort();
    return res.json({ aborted: true });
  });
  app2.post("/api/agent/plan", async (req, res) => {
    try {
      const { goal, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const dualCfg = {
        primaryProvider: provider || "",
        primaryModel: model,
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl
      };
      const plan = await createPlan(
        goal,
        (prompt) => generateWithDualModel(prompt, [], dualCfg, "think")
      );
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/subagents/spawn", async (req, res) => {
    try {
      const { goal, agentConfig, provider, model, thinkingProvider, thinkingModel, thinkingLocalUrl } = req.body;
      const dualCfg = {
        primaryProvider: provider || "",
        primaryModel: model,
        thinkingProvider,
        thinkingModel,
        thinkingLocalUrl
      };
      const task = await subagentManager.spawn(
        req.body.parentId || "main",
        goal,
        agentConfig,
        (prompt) => generateWithDualModel(prompt, [], dualCfg, "think")
      );
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/subagents", (_req, res) => {
    const tasks = subagentManager.listTasks();
    res.json({ tasks });
  });
  app2.post("/api/subagents/:id/abort", async (req, res) => {
    await subagentManager.abort(req.params.id);
    res.json({ aborted: true });
  });
  app2.post("/api/permissions/check", (req, res) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const result = permissionEngine.check(req.body);
    return res.json(result);
  });
  app2.post("/api/permissions/ask", (req, res) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const request = req.body;
    const check = permissionEngine.check(request);
    if (check.action === "allow") {
      return res.json({ action: "allow" });
    }
    if (check.action === "deny") {
      return res.json({ action: "deny" });
    }
    const pending = permissionEngine.createPending(request);
    return res.json({ action: "ask", pending });
  });
  app2.get("/api/permissions/pending", (_req, res) => {
    if (!permissionEngine) return res.json({ pending: [] });
    return res.json({ pending: permissionEngine.listPending() });
  });
  app2.get("/api/permissions/pending/:id", (req, res) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const pending = permissionEngine.getPending(req.params.id);
    if (!pending) return res.status(404).json({ error: "Not found" });
    return res.json(pending);
  });
  app2.post("/api/permissions/resolve/:id", (req, res) => {
    if (!permissionEngine) return res.status(503).json({ error: "Permission engine not initialized" });
    const { approved } = req.body;
    permissionEngine.resolve(req.params.id, approved === true);
    return res.json({ resolved: true });
  });
}

// src/server/codeReview.ts
var pendingReviews = /* @__PURE__ */ new Map();
function getPendingReviews() {
  return Array.from(pendingReviews.values());
}
function acceptComment(reviewId, commentId) {
  const review = pendingReviews.get(reviewId);
  if (!review) return false;
  const comment = review.comments.find((c) => c.id === commentId);
  if (!comment) return false;
  comment.accepted = true;
  return true;
}
function rejectComment(reviewId, commentId) {
  const review = pendingReviews.get(reviewId);
  if (!review) return false;
  const comment = review.comments.find((c) => c.id === commentId);
  if (!comment) return false;
  comment.accepted = false;
  return true;
}
function parseDiffIntoHunks(diffText) {
  const diffHunks = [];
  const diffBlocks = diffText.split("diff --git ");
  for (const block of diffBlocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const firstLine = lines[0] || "";
    const match = firstLine.match(/a\/(.*?) b\/(.*)/);
    if (!match) continue;
    const file = match[2] || "";
    let status = "modified";
    if (block.includes("new file mode")) status = "added";
    if (block.includes("deleted file mode")) status = "deleted";
    if (block.includes("rename from")) status = "renamed";
    const hunks = [];
    let currentHunk = null;
    for (const line of lines) {
      const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkHeader) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(hunkHeader[1], 10),
          oldLines: parseInt(hunkHeader[2] || "1", 10),
          newStart: parseInt(hunkHeader[3], 10),
          newLines: parseInt(hunkHeader[4] || "1", 10),
          lines: []
        };
      } else if (currentHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
        currentHunk.lines.push(line);
      }
    }
    if (currentHunk) hunks.push(currentHunk);
    diffHunks.push({ file, status, diff: "diff --git " + block, hunks });
  }
  return diffHunks;
}
function buildReviewPrompt(diffHunks) {
  const filesSummary = diffHunks.map((h) => {
    const hunksSummary = h.hunks.map((hk) => {
      return `    Lines ${hk.newStart}-${hk.newStart + hk.newLines - 1} (${hk.lines.length} changed lines)`;
    }).join("\n");
    return `  File: ${h.file} (${h.status})
${hunksSummary}`;
  }).join("\n\n");
  const diffText = diffHunks.map((h) => h.diff).join("\n");
  return `You are a senior code reviewer with expertise in software engineering, security, and architecture.

Your task is to review the code diff below and provide structured review comments.

Be constructive and specific. For each issue:
- Explain WHY it's an issue
- Suggest a concrete fix with a code example when possible
- Reference specific lines or sections

Categories: style, bug, security, performance, architecture
Severity levels: info (minor suggestion), warning (should fix), critical (must fix before merge)

Files changed summary:
${filesSummary}

Return ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "summary": "1-2 sentence overall assessment of the changes",
  "comments": [
    {
      "file": "path/to/file.ts",
      "lineStart": 42,
      "lineEnd": 45,
      "category": "bug",
      "severity": "warning",
      "message": "Specific constructive feedback about the issue",
      "suggestion": "How to fix it",
      "codeExample": "const fixed = example;"
    }
  ]
}

If no issues are found, return {"summary": "No issues found. LGTM!", "comments": []}.

DIFF TO REVIEW:
\`\`\`diff
${diffText}
\`\`\`
`;
}
function generateCommentId() {
  return `comment-${Math.random().toString(36).substring(2, 11)}`;
}
function generateReviewId() {
  return `review-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
async function analyzeDiff(generateFn, providedDiff) {
  const diffText = providedDiff ?? (await getGitDiff()).map((d) => d.diff).join("\n");
  if (!diffText.trim()) {
    return { summary: "No diff to review. Working tree is clean.", comments: [] };
  }
  const diffHunks = parseDiffIntoHunks(diffText);
  const prompt = buildReviewPrompt(diffHunks);
  const response = await generateFn(prompt);
  let parsed;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const data = JSON.parse(jsonMatch[0]);
    parsed = {
      summary: data.summary || "Review completed.",
      comments: (data.comments || []).map((c) => ({
        id: generateCommentId(),
        file: c.file || "unknown",
        lineStart: c.lineStart,
        lineEnd: c.lineEnd,
        category: ["style", "bug", "security", "performance", "architecture"].includes(c.category || "") ? c.category : "style",
        severity: ["info", "warning", "critical"].includes(c.severity || "") ? c.severity : "info",
        message: c.message || "No message provided",
        suggestion: c.suggestion,
        codeExample: c.codeExample,
        accepted: null
      }))
    };
  } catch (err) {
    parsed = {
      summary: "AI review response (parse fallback)",
      comments: [
        {
          id: generateCommentId(),
          file: diffHunks[0]?.file || "unknown",
          lineStart: void 0,
          lineEnd: void 0,
          category: "style",
          severity: "info",
          message: response.slice(0, 2e3),
          suggestion: void 0,
          codeExample: void 0,
          accepted: null
        }
      ]
    };
  }
  const reviewId = generateReviewId();
  pendingReviews.set(reviewId, parsed);
  return parsed;
}

// src/server/routes/review.ts
function buildDualConfig3(cfg) {
  const result = {
    primaryProvider: cfg.aiProvider || ""
  };
  if (cfg.aiModel !== void 0) result.primaryModel = cfg.aiModel;
  if (cfg.localUrl !== void 0) result.primaryLocalUrl = cfg.localUrl;
  if (cfg.multiModelEnabled && cfg.thinkingProvider !== void 0) result.thinkingProvider = cfg.thinkingProvider;
  if (cfg.multiModelEnabled && cfg.thinkingModel !== void 0) result.thinkingModel = cfg.thinkingModel;
  if (cfg.thinkingLocalUrl !== void 0) result.thinkingLocalUrl = cfg.thinkingLocalUrl;
  if (cfg.apiKey !== void 0) result.apiKey = cfg.apiKey;
  if (cfg.temperature !== void 0) result.temperature = cfg.temperature;
  if (cfg.maxTokens !== void 0) result.maxTokens = cfg.maxTokens;
  return result;
}
function registerRoutes8(app2) {
  app2.post("/api/review", validateBody(ReviewRequestSchema), async (req, res) => {
    try {
      const { diff, config = {} } = req.body;
      const dualCfg = buildDualConfig3(config);
      const result = await analyzeDiff(
        (prompt) => generateWithDualModel(prompt, [], dualCfg, "think"),
        diff
      );
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/review/pending", async (_req, res) => {
    try {
      const reviews2 = getPendingReviews();
      return res.json({ reviews: reviews2 });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/review/:id/accept", (req, res) => {
    const { commentId } = req.body;
    const success = acceptComment(req.params.id, commentId);
    return res.json({ success });
  });
  app2.post("/api/review/:id/reject", (req, res) => {
    const { commentId } = req.body;
    const success = rejectComment(req.params.id, commentId);
    return res.json({ success });
  });
}

// src/server/routes/browser.ts
var browserTools2 = null;
async function getBrowserTools2() {
  if (!browserTools2) {
    try {
      browserTools2 = await Promise.resolve().then(() => (init_browserTools(), browserTools_exports));
    } catch {
      return null;
    }
  }
  return browserTools2;
}
function registerRoutes9(app2) {
  app2.post("/api/browser/navigate", validateBody(BrowserNavigateSchema), async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { url, headless = true, sessionId = "default" } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "url is required" });
      }
      const result = await bt.browserNavigate(sessionId, url, Boolean(headless));
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.post("/api/browser/click", validateBody(BrowserActionSchema), async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { selector, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string") {
        return res.status(400).json({ error: "selector is required" });
      }
      const result = await bt.browserClick(sessionId, selector, Boolean(headless));
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.post("/api/browser/type", validateBody(BrowserActionSchema), async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { selector, text, headless = true, sessionId = "default" } = req.body;
      if (!selector || typeof selector !== "string" || typeof text !== "string") {
        return res.status(400).json({ error: "selector and text are required" });
      }
      const result = await bt.browserType(sessionId, selector, text, Boolean(headless));
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.get("/api/browser/screenshot", async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await bt.browserScreenshot(sessionId, headless);
      if (result.success && result.base64) {
        return res.json({ success: true, output: result.output, base64: result.base64 });
      }
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.post("/api/browser/evaluate", async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { script, headless = true, sessionId = "default" } = req.body;
      if (!script || typeof script !== "string") {
        return res.status(400).json({ error: "script is required" });
      }
      const result = await bt.browserEvaluate(sessionId, script, Boolean(headless));
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.get("/api/browser/html", async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const sessionId = String(req.query.sessionId || "default");
      const headless = req.query.headless !== "false";
      const result = await bt.browserGetHtml(sessionId, headless);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.post("/api/browser/close", async (req, res) => {
    try {
      const bt = await getBrowserTools2();
      if (!bt) return res.status(503).json({ success: false, output: "", error: "playwright-core not installed" });
      const { sessionId = "default" } = req.body;
      const result = await bt.browserClose(sessionId);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ success: false, output: "", error: e.message });
    }
  });
  app2.get("/api/browser/sessions", async (_req, res) => {
    const bt = await getBrowserTools2();
    if (!bt) return res.json({ sessions: [] });
    return res.json({ sessions: bt.getActiveBrowserSessions() });
  });
}

// src/server/routes/tracker.ts
function registerRoutes10(app2) {
  app2.post("/api/tracker/config", (req, res) => {
    try {
      const { type, token, baseUrl, repo, project } = req.body;
      if (!type || !token) {
        res.status(400).json({ error: "type and token are required" });
        return;
      }
      setTrackerConfig({ type, token, baseUrl, repo, project });
      res.json({ configured: true, type });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/tracker/issues", async (req, res) => {
    try {
      const { title, description, priority, labels } = req.body;
      if (!title) {
        res.status(400).json({ error: "title required" });
        return;
      }
      const issue = await createIssue({ title, description, priority, labels });
      res.json(issue);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/tracker/issues", async (req, res) => {
    try {
      const status = req.query.status;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const issues = await listIssues(status, limit);
      res.json({ issues });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/tracker/issues/:key", async (req, res) => {
    try {
      const issue = await getIssue(req.params.key);
      res.json(issue);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/tracker/issues/:key/comment", async (req, res) => {
    try {
      const { body } = req.body;
      if (!body) {
        res.status(400).json({ error: "body required" });
        return;
      }
      await addComment(req.params.key, body);
      res.json({ commented: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// src/server/ciPipeline.ts
var import_promises17 = require("fs/promises");
var path20 = __toESM(require("path"), 1);
var WORKFLOW_DIR = ".github/workflows";
async function ensureWorkflowDir() {
  const dir = path20.join(process.cwd(), WORKFLOW_DIR);
  await (0, import_promises17.mkdir)(dir, { recursive: true });
  return dir;
}
function generateNodeCIWorkflow(config) {
  const nodeVer = config.nodeVersion || "20";
  const buildCmd = config.buildCommand || "npm run build";
  const testCmd = config.testCommand || "npm test";
  const lintCmd = config.lintCommand || "";
  const typeCmd = config.typeCheckCommand || "";
  return `name: CI - ${config.projectName}

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [${nodeVer}]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci${lintCmd ? `

      - name: Lint
        run: ${lintCmd}` : ""}${typeCmd ? `

      - name: Type Check
        run: ${typeCmd}` : ""}

      - name: Test
        run: ${testCmd}

      - name: Build
        run: ${buildCmd}
`;
}
function generateDockerDeployWorkflow(config) {
  const dockerfile = config.dockerfile || "Dockerfile";
  const target = config.deployTarget || "docker-hub";
  const imageName = config.projectName.toLowerCase().replace(/\s+/g, "-");
  let deploySteps = "";
  switch (target) {
    case "docker-hub":
      deploySteps = `
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}

      - name: Push Docker image
        run: docker push ${imageName}:latest`;
      break;
    case "github-pages":
      deploySteps = `
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist`;
      break;
    case "vercel":
      deploySteps = `
      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}`;
      break;
    case "cloudflare":
      deploySteps = `
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=${imageName}`;
      break;
  }
  return `name: Docker Deploy - ${config.projectName}

on:
  push:
    branches: [main, master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t ${imageName} -f ${dockerfile} .
${deploySteps}
`;
}
function generateCVRAgentWorkflow(config) {
  return `name: CVR Agent - ${config.projectName}

on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]
  pull_request:
    types: [opened, synchronize]

jobs:
  cvr-agent:
    if: |
      (github.event_name == 'issues' && github.event.action == 'opened') ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '/cvr')) ||
      (github.event_name == 'pull_request' && github.event.action == 'opened')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${config.nodeVersion || "20"}
        uses: actions/setup-node@v4
        with:
          node-version: ${config.nodeVersion || "20"}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run CVR Agent
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          CVR_CI_MODE: "true"
        run: |
          npx tsx server.ts &
          sleep 5
          curl -s http://localhost:3000/api/health
${config.customSteps || ""}
`;
}
function generateStaticDeployWorkflow(config) {
  const buildCmd = config.buildCommand || "npm run build";
  const target = config.deployTarget || "github-pages";
  const publishDir = config.projectName.includes("dist") ? config.projectName : "dist";
  let deploySteps = "";
  switch (target) {
    case "github-pages":
      deploySteps = `      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./${publishDir}`;
      break;
    case "vercel":
      deploySteps = `      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}`;
      break;
    case "cloudflare":
      deploySteps = `      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy ${publishDir}`;
      break;
  }
  return `name: Deploy - ${config.projectName}

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${config.nodeVersion || "20"}
        uses: actions/setup-node@v4
        with:
          node-version: ${config.nodeVersion || "20"}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: ${buildCmd}

${deploySteps}
`;
}
async function generateCIPipeline(config) {
  const dir = await ensureWorkflowDir();
  let content;
  let filename;
  switch (config.pipelineType) {
    case "node-ci":
      content = generateNodeCIWorkflow(config);
      filename = "ci.yml";
      break;
    case "docker-deploy":
      content = generateDockerDeployWorkflow(config);
      filename = "docker-deploy.yml";
      break;
    case "cvr-agent":
      content = generateCVRAgentWorkflow(config);
      filename = "cvr-agent.yml";
      break;
    case "static-deploy":
      content = generateStaticDeployWorkflow(config);
      filename = "deploy.yml";
      break;
    default:
      throw new Error(`Unknown pipeline type: ${config.pipelineType}`);
  }
  await (0, import_promises17.writeFile)(path20.join(dir, filename), content, "utf-8");
  return {
    files: [path20.join(WORKFLOW_DIR, filename)],
    pipelineType: config.pipelineType,
    path: dir
  };
}
var PIPELINE_TEMPLATES = [
  { type: "node-ci", name: "Node.js CI", description: "Type-check, lint, test, and build on push/PR" },
  { type: "docker-deploy", name: "Docker Build & Deploy", description: "Build Docker image and push to registry" },
  { type: "cvr-agent", name: "CVR Agent in CI", description: "Run CVR coding agent on issues/PRs" },
  { type: "static-deploy", name: "Static Site Deploy", description: "Build static site and deploy (Pages/Vercel/Cloudflare)" }
];

// src/server/routes/marketplace.ts
function registerRoutes11(app2) {
  app2.get("/api/marketplace", async (req, res) => {
    try {
      const { type, tag, search } = req.query;
      const items2 = getMarketItems(
        type,
        tag,
        search
      );
      res.json({ items: items2, stats: getStats(), tags: getTags() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/marketplace/stats", (_req, res) => {
    res.json(getStats());
  });
  app2.post("/api/marketplace/publish", async (req, res) => {
    try {
      const { type, name, description, content, author, version, tags } = req.body;
      if (!type || !name || !content) {
        res.status(400).json({ error: "type, name, and content are required" });
        return;
      }
      const item = await publishItem(type, name, description || "", content, author, version, tags);
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/marketplace/:id", async (req, res) => {
    try {
      const item = await downloadItem(req.params.id);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/marketplace/:id", async (req, res) => {
    try {
      const ok = await removeItem(req.params.id);
      res.json({ removed: ok });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/marketplace/:id/review", async (req, res) => {
    try {
      const { rating, text, author } = req.body;
      if (!rating) {
        res.status(400).json({ error: "rating required (1-5)" });
        return;
      }
      const review = await addReview(req.params.id, rating, text || "", author);
      res.json(review);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/marketplace/:id/reviews", (req, res) => {
    res.json({ reviews: getReviews(req.params.id) });
  });
  app2.post("/api/ci/generate", async (req, res) => {
    try {
      const { pipelineType, projectName, nodeVersion, buildCommand, testCommand, lintCommand, typeCheckCommand, deployTarget, dockerfile, customSteps } = req.body;
      if (!pipelineType || !projectName) {
        res.status(400).json({ error: "pipelineType and projectName are required" });
        return;
      }
      const result = await generateCIPipeline({
        pipelineType,
        projectName,
        nodeVersion,
        buildCommand,
        testCommand,
        lintCommand,
        typeCheckCommand,
        deployTarget,
        dockerfile,
        customSteps
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/ci/templates", (_req, res) => {
    res.json({ templates: PIPELINE_TEMPLATES });
  });
}

// src/server/routes/tools.ts
var path21 = __toESM(require("path"), 1);
var import_promises18 = require("fs/promises");
var import_crypto9 = require("crypto");
function registerRoutes12(app2) {
  app2.post("/api/tools/execute", validateBody(ToolExecuteSchema), async (req, res) => {
    try {
      const { toolCall, mode = "build", sessionId = (0, import_crypto9.randomUUID)() } = req.body;
      const result = await executeTool(toolCall, mode, permissionEngine, sessionId);
      incrementToolCall();
      if (result.success && (toolCall.name === "write_file" || toolCall.name === "edit_file")) {
        const afterContent = toolCall.name === "write_file" ? toolCall.params.content : await (0, import_promises18.readFile)(path21.join(process.cwd(), toolCall.params.path), "utf-8");
        const change = await recordChange(
          toolCall.params.path,
          toolCall.name === "write_file" ? "write" : "edit",
          afterContent,
          `${toolCall.name}: ${toolCall.params.path}`
        );
        result.changeId = change.id;
      }
      res.json(result);
    } catch (error) {
      console.error("Tool execution error:", error);
      res.status(500).json({ success: false, output: "", error: error.message });
    }
  });
}

// src/server/goalJudge.ts
var JUDGE_PROMPT_TEMPLATE = `You are a strict evaluator. A coding agent is working on this goal:

GOAL: {goal}

SUCCESS CRITERIA (ALL must be demonstrably true to mark COMPLETE):
{successCriteria}

AGENT'S PROGRESS SO FAR:
{history}

AGENT'S LAST ACTION RESULT:
{lastObservation}

RULES:
- Verify EVERY success criterion with concrete evidence. Do not trust the agent's claims.
- If a criterion requires files/tests/commands, confirm they exist and pass.
- If ANY criterion is unmet, respond INCOMPLETE.
- Give ONE concrete next step in nextHint.

Respond ONLY in JSON:
{
  "verdict": "INCOMPLETE" | "COMPLETE",
  "reason": "specific evidence-based explanation",
  "nextHint": "one concrete next action for the agent"
}`;
function formatHistory(steps) {
  return steps.map(
    (s) => `Iteration ${s.iteration}: ${s.thought.substring(0, 150)}${s.thought.length > 150 ? "..." : ""}${s.observation ? ` | Observation: ${s.observation.substring(0, 150)}${s.observation.length > 150 ? "..." : ""}` : ""}`
  ).join("\n");
}
async function evaluateGoal(options, thinkFn) {
  const { goal, successCriteria, steps, lastObservation } = options;
  const prompt = JUDGE_PROMPT_TEMPLATE.replace("{goal}", goal).replace("{successCriteria}", successCriteria || "No explicit criteria. Verify the goal is fully achieved.").replace("{history}", formatHistory(steps)).replace("{lastObservation}", lastObservation || "None");
  const response = await thinkFn(prompt);
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  const cleaned = firstBrace !== -1 && lastBrace > firstBrace ? response.slice(firstBrace, lastBrace + 1) : response.trim();
  try {
    const parsed = JSON.parse(cleaned);
    const verdict = {
      iteration: steps.length + 1,
      verdict: parsed.verdict === "COMPLETE" ? "COMPLETE" : "INCOMPLETE",
      reason: String(parsed.reason || ""),
      timestamp: Date.now()
    };
    if (parsed.nextHint) {
      verdict.nextHint = String(parsed.nextHint);
    }
    return verdict;
  } catch {
    return {
      iteration: steps.length + 1,
      verdict: "INCOMPLETE",
      reason: "Judge returned invalid JSON. Treating as incomplete.",
      nextHint: "Continue working toward the goal.",
      timestamp: Date.now()
    };
  }
}

// src/server/goalEventBroadcaster.ts
var import_events2 = require("events");
var GoalEventBroadcaster = class extends import_events2.EventEmitter {
  broadcast(goalId, type, data) {
    const event = {
      type,
      goalId,
      timestamp: Date.now(),
      data
    };
    this.emit("event", event);
  }
};

// src/server/goalOrchestrator.ts
init_errors();
var GoalOrchestrator = class {
  state;
  loop;
  broadcaster;
  judgeThinkFn;
  _abort = false;
  timeoutTimer;
  totalTokensEstimate = 0;
  saveTimeout;
  constructor(config, options) {
    const id = crypto.randomUUID();
    this.state = {
      id,
      goal: config.goal,
      successCriteria: config.successCriteria || "Goal is fully achieved with concrete evidence.",
      config,
      status: "running",
      currentIteration: 0,
      maxIterations: config.maxIterations || 50,
      steps: [],
      judgeHistory: [],
      totalTokensUsed: 0,
      startedAt: Date.now(),
      updatedAt: Date.now()
    };
    this.judgeThinkFn = options.judgeThinkFn || options.thinkFn;
    this.broadcaster = options.broadcaster || new GoalEventBroadcaster();
    const wrappedThinkFn = async (prompt) => {
      const result = await options.thinkFn(prompt);
      this.totalTokensEstimate += Math.ceil(result.length / 4);
      return result;
    };
    const loopOpts = {
      maxSteps: 999999,
      thinkFn: wrappedThinkFn,
      onStep: (step) => {
        this.broadcaster.broadcast(this.state.id, "goal.step", step);
      },
      sessionId: id
    };
    if (options.permissionEngine) {
      loopOpts.permissionEngine = options.permissionEngine;
    }
    this.loop = new AgentLoop(config.goal, loopOpts);
  }
  getState() {
    return { ...this.state };
  }
  getBroadcaster() {
    return this.broadcaster;
  }
  abort() {
    this._abort = true;
  }
  async run() {
    this.broadcaster.broadcast(this.state.id, "goal.started", { goal: this.state.goal });
    this.debouncedSave();
    const maxDurationMs = (this.state.config.maxDurationMinutes || 120) * 60 * 1e3;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      this._abort = true;
    }, maxDurationMs);
    try {
      while (this.state.status === "running") {
        if (this._abort) {
          this.state.status = "aborted";
          this.state.error = this.state.error || "Aborted by user";
          break;
        }
        if (this.state.currentIteration >= this.state.maxIterations) {
          this.state.status = "error";
          this.state.error = `Max iterations reached (${this.state.maxIterations})`;
          break;
        }
        if (this.totalTokensEstimate >= (this.state.config.maxTokens || 5e5)) {
          this.state.status = "error";
          this.state.error = "Token budget exhausted";
          break;
        }
        const loopStep = await this.loop.runSingleStep();
        const goalStep = this.mapLoopStep(loopStep);
        this.state.steps.push(goalStep);
        this.state.currentIteration++;
        this.state.updatedAt = Date.now();
        this.debouncedSave();
        const verdict = await this.callJudge(goalStep);
        this.broadcaster.broadcast(this.state.id, "goal.judge", verdict);
        if (verdict.verdict === "COMPLETE") {
          this.state.status = "completed";
          this.state.completedAt = Date.now();
          break;
        }
        if (verdict.nextHint) {
          this.loop.setAdditionalContext(`Next step guidance: ${verdict.nextHint}`);
        } else {
          this.loop.setAdditionalContext("");
        }
      }
    } catch (err) {
      this.state.status = "error";
      this.state.error = getErrorMessage(err);
      this.broadcaster.broadcast(this.state.id, "goal.error", { error: this.state.error });
    } finally {
      if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
      this.state.updatedAt = Date.now();
      this.state.totalTokensUsed = this.totalTokensEstimate;
      await this.flushSave();
      if (this.state.status === "completed") {
        this.broadcaster.broadcast(this.state.id, "goal.complete", { state: this.state });
      } else if (this.state.status === "aborted") {
        this.broadcaster.broadcast(this.state.id, "goal.aborted", { state: this.state });
      }
    }
    return this.state;
  }
  debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      saveGoalState(this.state).catch(() => {
      });
    }, 300);
  }
  async flushSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = void 0;
    }
    await saveGoalState(this.state);
  }
  mapLoopStep(loopStep) {
    const goalStep = {
      iteration: this.state.currentIteration + 1,
      thought: loopStep.thought,
      timestamp: loopStep.timestamp
    };
    if (loopStep.action) {
      goalStep.action = loopStep.action;
    }
    if (loopStep.observation) {
      goalStep.observation = loopStep.observation;
    }
    return goalStep;
  }
  async callJudge(step) {
    const wrappedJudgeFn = async (prompt) => {
      const result = await this.judgeThinkFn(prompt);
      this.totalTokensEstimate += Math.ceil(result.length / 4);
      return result;
    };
    const verdict = await evaluateGoal(
      {
        goal: this.state.goal,
        successCriteria: this.state.successCriteria,
        steps: this.state.steps,
        lastObservation: step.observation || ""
      },
      wrappedJudgeFn
    );
    this.state.judgeHistory.push(verdict);
    return verdict;
  }
};

// src/server/routes/goal.ts
function registerRoutes13(app2, options) {
  const { generateFn: generateAIContent2, permissionEngine: permissionEngine2 } = options;
  const activeGoals = /* @__PURE__ */ new Map();
  app2.post("/api/goal", async (req, res) => {
    try {
      const config = req.body;
      if (!config.provider) {
        res.status(400).json({ error: "AI provider not configured. Please select a provider in Settings." });
        return;
      }
      const opts = {
        thinkFn: (prompt) => generateAIContent2(prompt, [], config.provider, void 0, config.model, config.apiKey)
      };
      if (permissionEngine2) opts.permissionEngine = permissionEngine2;
      const orchestrator = new GoalOrchestrator(config, opts);
      const goalId = orchestrator.getState().id;
      activeGoals.set(goalId, orchestrator);
      const cleanup = (event) => {
        if (event.type === "goal.complete" || event.type === "goal.aborted" || event.type === "goal.error") {
          orchestrator.getBroadcaster().off("event", cleanup);
          activeGoals.delete(goalId);
        }
      };
      orchestrator.getBroadcaster().on("event", cleanup);
      orchestrator.run().catch((err) => console.error("Goal orchestrator error:", err));
      res.json({ id: goalId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/goal/:id", async (req, res) => {
    const goalId = req.params.id;
    const orchestrator = activeGoals.get(goalId);
    if (orchestrator) {
      res.json(orchestrator.getState());
      return;
    }
    const fromDisk = await loadGoalState(goalId);
    if (fromDisk) {
      res.json(fromDisk);
      return;
    }
    res.status(404).json({ error: "Goal not found" });
  });
  app2.get("/api/goal/:id/events", (req, res) => {
    const goalId = req.params.id;
    const orchestrator = activeGoals.get(goalId);
    if (!orchestrator) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    const broadcaster = orchestrator.getBroadcaster();
    const handler = (event) => {
      res.write(`data: ${JSON.stringify(event)}

`);
      if (event.type === "goal.complete" || event.type === "goal.aborted" || event.type === "goal.error") {
        broadcaster.off("event", handler);
      }
    };
    broadcaster.on("event", handler);
    req.on("close", () => {
      broadcaster.off("event", handler);
    });
  });
  app2.post("/api/goal/:id/abort", (req, res) => {
    const goalId = req.params.id;
    const orchestrator = activeGoals.get(goalId);
    if (!orchestrator) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    orchestrator.abort();
    res.json({ aborted: true });
  });
  app2.post("/api/goal/:id/resume", async (req, res) => {
    const goalId = req.params.id;
    const state = await loadGoalState(goalId);
    if (!state) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    if (state.status !== "paused" && state.status !== "error") {
      res.status(400).json({ error: "Goal cannot be resumed from status: " + state.status });
      return;
    }
    res.status(501).json({ error: "Resume is not yet implemented. Start a new goal instead." });
  });
  app2.get("/api/goals", async (_req, res) => {
    const states = await listGoalStates();
    res.json({ goals: states });
  });
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
setupHealthRoute(app);
setupSecurityMiddleware(app);
var PROVIDER_VALIDATION_URLS = {
  openai: "https://api.openai.com/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
  grok: "https://api.x.ai/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
  baseten: "https://api.baseten.co/v1/models",
  openrouter: "https://openrouter.ai/api/v1/models",
  together: "https://api.together.xyz/v1/models",
  mistral: "https://api.mistral.ai/v1/models"
};
app.post("/api/validate-key", async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ valid: false, error: "provider and apiKey required" });
  }
  try {
    if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (r.ok) return res.json({ valid: true });
      const d = await r.json().catch(() => ({}));
      return res.json({ valid: false, error: d.error?.message || `HTTP ${r.status}` });
    }
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] })
      });
      if (r.ok) return res.json({ valid: true });
      const d = await r.json().catch(() => ({}));
      const err = d.error?.message || `HTTP ${r.status}`;
      if (d.error?.type === "authentication_error") return res.json({ valid: false, error: err });
      if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: err });
      return res.json({ valid: true });
    }
    const baseUrl = PROVIDER_VALIDATION_URLS[provider];
    if (baseUrl) {
      const authPrefix = provider === "baseten" ? "Api-Key" : "Bearer";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      try {
        const r = await fetch(baseUrl, {
          headers: { Authorization: `${authPrefix} ${apiKey}` },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (r.ok) return res.json({ valid: true });
        if (r.status === 401 || r.status === 403) return res.json({ valid: false, error: `HTTP ${r.status} \u2014 key rejected. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043B\u044E\u0447 \u0438\u043B\u0438 \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u2014 \u043D\u043E\u0432\u044B\u0435 \u043A\u043B\u044E\u0447\u0438 \u043C\u043E\u0433\u0443\u0442 \u0430\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0435 \u0441\u0440\u0430\u0437\u0443.` });
        return res.json({ valid: true, warning: `HTTP ${r.status}` });
      } catch (e) {
        clearTimeout(timeout);
        if (e.name === "AbortError") return res.json({ valid: false, error: "\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u0435\u0442\u044C" });
        throw e;
      }
    }
    return res.json({ valid: false, error: `Unknown provider: ${provider}` });
  } catch (e) {
    return res.json({ valid: false, error: e.message || "Network error" });
  }
});
var requireApiKey = createApiKeyMiddleware();
app.use("/api", requireApiKey);
app.use("/mcp", requireApiKey);
app.get("/api/settings", (_req, res) => {
  try {
    const settingsPath = path22.join(process.cwd(), ".opencode-infinite", "settings.json");
    if ((0, import_fs.existsSync)(settingsPath)) {
      const data = JSON.parse((0, import_fs.readFileSync)(settingsPath, "utf-8"));
      res.json(data);
    } else {
      res.json({});
    }
  } catch {
    res.json({});
  }
});
app.post("/api/settings", (req, res) => {
  try {
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid settings", details: parsed.error.format() });
      return;
    }
    const settingsPath = path22.join(process.cwd(), ".opencode-infinite", "settings.json");
    const dir = path22.dirname(settingsPath);
    if (!(0, import_fs.existsSync)(dir)) (0, import_fs.mkdirSync)(dir, { recursive: true });
    (0, import_fs.writeFileSync)(settingsPath, JSON.stringify(parsed.data, null, 2));
    res.json({ saved: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});
try {
  const configData = (0, import_fs.readFileSync)(".cvr/permissions.json", "utf-8");
  const config = JSON.parse(configData);
  setPermissionEngine(new PermissionEngine(config));
} catch {
  setPermissionEngine(new PermissionEngine({
    rules: [
      { pattern: "read_file", action: "allow" },
      { pattern: "list_directory", action: "allow" },
      { pattern: "search_files", action: "allow" },
      { pattern: "write_file", action: "ask" },
      { pattern: "edit_file", action: "ask" },
      { pattern: "execute_command", action: "ask" },
      { pattern: "*.env*", action: "deny" },
      { pattern: "*/secrets/*", action: "deny" },
      { pattern: "bash:rm -rf *", action: "deny" },
      { pattern: "bash:git push *", action: "ask" }
    ],
    defaultAction: "ask"
  }));
}
setRagEmbedFn(generateEmbeddings);
registerRoutes(app);
registerRoutes2(app);
registerRoutes3(app);
registerRoutes4(app);
registerRoutes5(app);
registerRoutes6(app);
registerRoutes7(app);
registerRoutes8(app);
registerRoutes9(app);
registerRoutes10(app);
registerRoutes11(app);
registerRoutes12(app);
registerRoutes13(app, { generateFn: generateAIContent, ...permissionEngine ? { permissionEngine } : {} });
async function startServer() {
  await ensureStorage();
  await initSync();
  await initMarketplace();
  setSessionDbPath(STORAGE_DIR2);
  setSkillsDir(path22.join(process.cwd(), ".cvr", "skills"));
  setSkillCreatorDir(path22.join(process.cwd(), ".cvr", "skills"));
  setRagDbPath(STORAGE_DIR2);
  setCacheDbPath(STORAGE_DIR2);
  setGoalStorageDir(STORAGE_DIR2);
  setRulesDir(path22.join(process.cwd(), ".cvr", "rules"));
  setCustomToolsDir(path22.join(process.cwd(), ".cvr", "tools"));
  setPluginsDir(path22.join(process.cwd(), ".cvr", "plugins"));
  await loadAgents();
  await registerPlugins();
  registerBuiltinHooks();
  if (process.env.CVR_ORACLE_ENABLED !== "false") {
    setImmediate(() => {
      indexProject(process.cwd(), generateEmbeddings).catch((err) => {
        console.error("Project Oracle indexing failed:", err);
      });
    });
  }
  const mcpConfig = await loadMcpConfig();
  if (mcpConfig.enabled && mcpConfig.transport === "stdio") {
    await startMcpStdio();
    return;
  }
  if (mcpConfig.enabled && (mcpConfig.transport === "http" || mcpConfig.transport === "sse")) {
    mountMcpSseRoutes(app, mcpConfig.basePath || "/mcp");
  }
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path22.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path22.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
  if (process.env.CVR_P2P_ENABLED === "true") {
    const p2pPort = parseInt(process.env.CVR_P2P_PORT || "3001", 10);
    const p2pSecret = process.env.CVR_P2P_SECRET || (() => {
      const crypto2 = require("crypto");
      const key = crypto2.randomBytes(32).toString("hex");
      console.log(`P2P_SECRET not set, generated random key: ${key}`);
      return key;
    })();
    setupP2PSync(server, {
      enabled: true,
      port: p2pPort,
      secret: p2pSecret,
      room: process.env.CVR_P2P_ROOM || "default"
    });
    console.log(`P2P sync enabled (room: ${process.env.CVR_P2P_ROOM || "default"})`);
  }
  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    Promise.resolve().then(() => (init_p2pSync(), p2pSync_exports)).then((m) => m.closeP2PSync()).catch(() => {
    });
    server.close(() => {
      console.log("HTTP server closed");
    });
    await closeAllBrowsers();
    try {
      const { getDb: getDb4 } = await Promise.resolve().then(() => (init_sessionStore(), sessionStore_exports));
      getDb4().close?.();
    } catch {
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
startServer();
//# sourceMappingURL=server.cjs.map
