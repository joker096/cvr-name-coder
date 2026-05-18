import { readFile, writeFile, access, mkdir, stat } from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const execAsync = promisify(exec);

export interface SyncConfig {
  enabled: boolean;
  provider: "git" | "file" | "api";
  repo?: string;
  path?: string;
  apiUrl?: string;
  apiKey?: string;
  interval: number;
  encrypt: boolean;
  encryptionKey?: string;
  conflictResolution: "last-write-wins" | "manual";
}

interface SyncStatus {
  lastSyncAt: number | null;
  status: "idle" | "syncing" | "error" | "conflict";
  message: string;
  provider: string;
}

let _config: SyncConfig | null = null;
let _status: SyncStatus = {
  lastSyncAt: null,
  status: "idle",
  message: "Sync not configured",
  provider: "none",
};
let _intervalId: ReturnType<typeof setInterval> | null = null;

const SYNC_DIR = path.join(process.cwd(), ".cvr");
const CONFIG_PATH = path.join(SYNC_DIR, "sync.json");
const SYNC_STORAGE_DIR = path.join(process.cwd(), ".opencode-infinite");
const SYNC_FILES = ["MEMORY.md", "USER.md", "history.json", "memory.json", "sessions.db"];

function getSyncDir(): string {
  if (_config?.provider === "git" && _config.repo) {
    // Use a local clone directory for git
    return path.join(process.cwd(), ".sync-clone");
  }
  if (_config?.provider === "file" && _config.path) {
    return _config.path;
  }
  return path.join(SYNC_DIR, "sync-data");
}

// ─── Encryption ───

function getKey(): Buffer {
  const keyStr = _config?.encryptionKey || process.env.SYNC_ENCRYPTION_KEY || "default-key-change-me";
  return scryptSync(keyStr, "salt", 32);
}

function encrypt(data: Buffer): Buffer {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decrypt(data: Buffer): Buffer {
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// ─── Config ───

export async function loadSyncConfig(): Promise<SyncConfig | null> {
  try {
    await access(CONFIG_PATH);
    const raw = await readFile(CONFIG_PATH, "utf-8");
    _config = JSON.parse(raw) as SyncConfig;
    _status.provider = _config.provider;
    return _config;
  } catch {
    _config = null;
    return null;
  }
}

export function getSyncConfig(): SyncConfig | null {
  return _config;
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  await mkdir(SYNC_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  _config = config;
  _status.provider = config.provider;
  restartAutoSync();
}

// ─── Git Provider ───

async function gitInit(syncDir: string): Promise<void> {
  await mkdir(syncDir, { recursive: true });
  try {
    await execAsync("git init", { cwd: syncDir });
    await execAsync("git config user.email \"sync@cvr.name\"", { cwd: syncDir });
    await execAsync("git config user.name \"CVR Sync\"", { cwd: syncDir });
  } catch {
    // may already be initialized
  }
}

async function gitSetRemote(syncDir: string, repoUrl: string): Promise<void> {
  try {
    await execAsync("git remote remove origin", { cwd: syncDir });
  } catch {
    // ignore
  }
  await execAsync(`git remote add origin "${repoUrl}"`, { cwd: syncDir });
}

async function gitPull(syncDir: string): Promise<void> {
  try {
    await execAsync("git pull origin main --no-rebase", { cwd: syncDir });
  } catch {
    try {
      await execAsync("git pull origin master --no-rebase", { cwd: syncDir });
    } catch {
      // branch may not exist yet
    }
  }
}

async function gitCommitAndPush(syncDir: string): Promise<void> {
  try {
    await execAsync("git add -A", { cwd: syncDir });
    await execAsync(`git commit -m "sync: ${new Date().toISOString()}" || true`, { cwd: syncDir });
    await execAsync("git push origin HEAD:main || git push origin HEAD:master || true", { cwd: syncDir });
  } catch {
    // nothing to commit or push failed
  }
}

// ─── Core Export / Import ───

function resolveSyncPath(fileName: string, syncDir: string): string {
  if (_config?.encrypt) {
    return path.join(syncDir, `${fileName}.enc`);
  }
  return path.join(syncDir, fileName);
}

async function exportFile(fileName: string, syncDir: string): Promise<void> {
  const sourcePath = path.join(SYNC_STORAGE_DIR, fileName);
  let data: Buffer;
  try {
    data = await readFile(sourcePath);
  } catch {
    return; // file doesn't exist, skip
  }

  const destPath = resolveSyncPath(fileName, syncDir);
  if (_config?.encrypt) {
    data = encrypt(data);
  }
  await writeFile(destPath, data);
}

async function importFile(fileName: string, syncDir: string): Promise<void> {
  const sourcePath = resolveSyncPath(fileName, syncDir);
  let data: Buffer;
  try {
    data = await readFile(sourcePath);
  } catch {
    return; // file doesn't exist on remote, skip
  }

  if (_config?.encrypt) {
    try {
      data = decrypt(data);
    } catch {
      throw new Error(`Failed to decrypt ${fileName}. Check encryption key.`);
    }
  }

  const destPath = path.join(SYNC_STORAGE_DIR, fileName);
  await writeFile(destPath, data);
}

async function exportAll(syncDir: string): Promise<void> {
  await mkdir(syncDir, { recursive: true });
  for (const file of SYNC_FILES) {
    await exportFile(file, syncDir);
  }
}

// ─── Conflict Resolution ───

async function resolveConflict(sourcePath: string, destPath: string): Promise<boolean> {
  if (_config?.conflictResolution === "manual") {
    // In manual mode, skip overwrite and mark conflict
    return false;
  }
  // last-write-wins: compare mtimes and keep newer
  try {
    const [srcStat, destStat] = await Promise.all([
      stat(sourcePath).catch(() => null),
      stat(destPath).catch(() => null),
    ]);
    if (!destStat) return true;
    if (!srcStat) return false;
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true;
  }
}

async function importWithConflictCheck(syncDir: string): Promise<string[]> {
  const conflicts: string[] = [];
  for (const file of SYNC_FILES) {
    const sourcePath = resolveSyncPath(file, syncDir);
    const destPath = path.join(SYNC_STORAGE_DIR, file);
    const shouldOverwrite = await resolveConflict(sourcePath, destPath);
    if (!shouldOverwrite) {
      conflicts.push(file);
      continue;
    }
    try {
      await importFile(file, syncDir);
    } catch (e: any) {
      conflicts.push(file);
    }
  }
  return conflicts;
}

// ─── Public API ───

export async function exportSync(): Promise<{ success: boolean; message: string }> {
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
      provider: _config.provider,
    };

    return { success: true, message: "Export successful" };
  } catch (e: any) {
    _status = { ..._status, status: "error", message: e.message };
    return { success: false, message: e.message };
  }
}

export async function importSync(): Promise<{ success: boolean; message: string; conflicts?: string[] }> {
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
        provider: _config.provider,
      };
      return { success: true, message: `Imported with conflicts: ${conflicts.join(", ")}`, conflicts };
    }

    _status = {
      lastSyncAt: Date.now(),
      status: "idle",
      message: "Import successful",
      provider: _config.provider,
    };

    return { success: true, message: "Import successful" };
  } catch (e: any) {
    _status = { ..._status, status: "error", message: e.message };
    return { success: false, message: e.message };
  }
}

export function getSyncStatus(): SyncStatus {
  return { ..._status };
}

export async function resetSync(): Promise<void> {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _status = {
    lastSyncAt: null,
    status: "idle",
    message: "Sync not configured",
    provider: "none",
  };
}

export function restartAutoSync(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }

  if (!_config?.enabled || !_config.interval) return;

  const intervalMs = _config.interval * 1000;
  _intervalId = setInterval(() => {
    exportSync().catch((err) => {
      console.error("Auto-sync export failed:", err);
    });
  }, intervalMs);
}

export async function initSync(): Promise<void> {
  await loadSyncConfig();
  if (_config?.enabled) {
    restartAutoSync();
  }
}

// ─── API Provider Helpers (stub for future expansion) ───

export async function apiExport(apiUrl: string, apiKey: string): Promise<void> {
  // Placeholder for API-based sync
  const data = await readFile(CONFIG_PATH, "utf-8");
  const response = await fetch(`${apiUrl}/sync/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ config: data }),
  });
  if (!response.ok) throw new Error(`API export failed: ${response.statusText}`);
}

export async function apiImport(apiUrl: string, apiKey: string): Promise<void> {
  // Placeholder for API-based sync
  const response = await fetch(`${apiUrl}/sync/import`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) throw new Error(`API import failed: ${response.statusText}`);
  const data = await response.json();
  await writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function resolveConflictsManually(resolutions: Record<string, "local" | "remote">): Promise<void> {
  if (!_config) throw new Error("Sync not configured");
  const syncDir = getSyncDir();

  for (const [file, choice] of Object.entries(resolutions)) {
    if (choice === "remote") {
      await importFile(file, syncDir);
    }
    // If local, do nothing (keep local)
  }
}
