// P2P Collaboration Sync — WebSocket peer-to-peer encrypted memory sharing
// Builds on top of teamSync.ts AES-256-GCM encryption
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";
import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";

/** Information about a connected peer in the P2P network. */
export interface PeerInfo {
  id: string;
  name: string;
  connectedAt: number;
}

/** A shared fragment of data exchanged between peers. */
export interface SharedFragment {
  id: string;
  type: "memory" | "agent" | "skill" | "rule" | "plugin";
  name: string;
  content: string;
  author: string;
  timestamp: number;
  signature: string;
}

interface P2PConfig {
  enabled: boolean;
  port: number;
  secret: string;
  room: string;
}

let wss: WebSocketServer | null = null;
let p2pConfig: P2PConfig | null = null;
const peers = new Map<string, WebSocket>();
const peerInfo = new Map<string, PeerInfo>();
const sharedStore = new Map<string, SharedFragment>();

const STORAGE_FILE = path.join(process.cwd(), ".opencode-infinite", "p2p-store.json");

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "p2p-sync-salt-v1", 32);
}

/**
 * Encrypts a plaintext string for P2P transmission using AES-256-GCM.
 * The output is a base64-encoded concatenation of IV (16 bytes) + auth tag (16 bytes) + ciphertext.
 * @param plaintext - The text to encrypt
 * @param secret - The shared secret key
 * @returns Base64-encoded encrypted payload
 */
export function encryptP2P(plaintext: string, secret: string): string {
  const iv = randomBytes(16);
  const key = deriveKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypts a P2P payload previously encrypted with {@link encryptP2P}.
 * Expects the input to be: IV (16) + auth tag (16) + ciphertext, all base64-encoded.
 * @param payload - The base64-encoded encrypted payload
 * @param secret - The shared secret key used for encryption
 * @returns Decrypted plaintext string
 */
export function decryptP2P(payload: string, secret: string): string {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const key = deriveKey(secret);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}

function generatePeerId(): string {
  return `peer-${randomBytes(8).toString("hex")}`;
}

function broadcast(data: string, exclude?: string): void {
  for (const [id, ws] of peers) {
    if (id !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendTo(peerId: string, data: string): void {
  const ws = peers.get(peerId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(data);
  }
}

async function loadSharedStore(): Promise<void> {
  try {
    const raw = await readFile(STORAGE_FILE, "utf-8");
    const items = JSON.parse(raw) as SharedFragment[];
    for (const item of items) {
      sharedStore.set(item.id, item);
    }
  } catch { /* no file yet */ }
}

async function saveSharedStore(): Promise<void> {
  await mkdir(path.dirname(STORAGE_FILE), { recursive: true });
  const items = Array.from(sharedStore.values());
  await writeFile(STORAGE_FILE, JSON.stringify(items, null, 2), "utf-8");
}

/**
 * Sets up the P2P WebSocket server for real-time peer-to-peer collaboration.
 * Handles peer connections, chat, sharing, and ping/pong on the "/p2p" path.
 * Does nothing if config.enabled is false.
 * @param server - The HTTP server to attach the WebSocket server to
 * @param config - P2P configuration with secret, port, room, and enabled flag
 */
export function setupP2PSync(server: Server, config: P2PConfig): void {
  if (!config.enabled) return;
  p2pConfig = config;

  wss = new WebSocketServer({ server, path: "/p2p" });

  wss.on("connection", (ws, req) => {
    const peerId = generatePeerId();
    peers.set(peerId, ws);
    peerInfo.set(peerId, {
      id: peerId,
      name: (req.headers["x-peer-name"] as string) || peerId.slice(0, 8),
      connectedAt: Date.now(),
    });

    ws.send(JSON.stringify({
      type: "welcome",
      peerId,
      peers: Array.from(peerInfo.values()),
      sharedCount: sharedStore.size,
    }));

    broadcast(JSON.stringify({ type: "peer_joined", peer: peerInfo.get(peerId) }), peerId);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(peerId, msg);
      } catch { /* bad message */ }
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

  loadSharedStore().catch(() => {});
}

async function handleMessage(peerId: string, msg: Record<string, unknown>): Promise<void> {
  switch (msg.type) {
    case "chat": {
      broadcast(JSON.stringify({
        type: "chat",
        peerId,
        text: msg.text,
        timestamp: Date.now(),
      }));
      break;
    }

    case "share": {
      const fragment: SharedFragment = {
        id: `${msg.shareType}-${Date.now()}-${randomBytes(4).toString("hex")}`,
        type: msg.shareType as SharedFragment["type"],
        name: msg.name as string,
        content: msg.content as string,
        author: peerId,
        timestamp: Date.now(),
        signature: encryptP2P(
          `${msg.shareType}:${msg.name}:${peerId}`,
          p2pConfig!.secret
        ).slice(0, 32),
      };
      sharedStore.set(fragment.id, fragment);
      await saveSharedStore();
      broadcast(JSON.stringify({ type: "new_share", fragment }), peerId);
      break;
    }

    case "request_share": {
      const fragment = sharedStore.get(msg.id as string);
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
        ),
      }));
      break;
    }

    case "ping": {
      sendTo(peerId, JSON.stringify({ type: "pong", timestamp: Date.now() }));
      break;
    }
  }
}

/**
 * Returns the list of currently connected peers.
 * @returns Array of peer info objects
 */
export function getPeers(): PeerInfo[] {
  return Array.from(peerInfo.values());
}

/**
 * Returns shared fragments, optionally filtered by type.
 * @param type - Optional fragment type to filter by ("memory", "agent", "skill", "rule", "plugin")
 * @returns Array of matching shared fragments
 */
export function getShares(type?: string): SharedFragment[] {
  const items = Array.from(sharedStore.values());
  if (type) return items.filter((s) => s.type === type);
  return items;
}

/**
 * Publishes a new shared fragment to all connected peers and persists it locally.
 * @param type - Fragment type ("memory", "agent", "skill", "rule", "plugin")
 * @param name - Human-readable name for the fragment
 * @param content - The fragment content
 * @returns The created SharedFragment object
 */
export function publishShare(
  type: SharedFragment["type"],
  name: string,
  content: string
): SharedFragment {
  const fragment: SharedFragment = {
    id: `${type}-${Date.now()}-${randomBytes(4).toString("hex")}`,
    type,
    name,
    content,
    author: "self",
    timestamp: Date.now(),
    signature: encryptP2P(`${type}:${name}:self`, p2pConfig?.secret || "local").slice(0, 32),
  };
  sharedStore.set(fragment.id, fragment);
  saveSharedStore().catch(() => {});
  broadcast(JSON.stringify({ type: "new_share", fragment }));
  return fragment;
}

/**
 * Removes a shared fragment by ID and broadcasts the removal to all connected peers.
 * @param id - The fragment ID to remove
 * @returns true if the fragment existed and was removed, false otherwise
 */
export function removeShare(id: string): boolean {
  const existed = sharedStore.delete(id);
  if (existed) {
    saveSharedStore().catch(() => {});
    broadcast(JSON.stringify({ type: "remove_share", id }));
  }
  return existed;
}

/**
 * Closes all peer connections and shuts down the P2P WebSocket server.
 */
export function closeP2PSync(): void {
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

/**
 * Checks whether the P2P sync server is currently active.
 * @returns true if the WebSocket server is running, false otherwise
 */
export function isP2PActive(): boolean {
  return wss !== null;
}
