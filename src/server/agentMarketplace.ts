// Agent Marketplace — registry for publishing and importing agents/skills/plugins
import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { randomBytes } from "crypto";

export interface MarketplaceItem {
  id: string;
  type: "agent" | "skill" | "plugin" | "rule" | "tool";
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
  downloads: number;
  rating: number;
  publishedAt: number;
  updatedAt: number;
  packagePath: string;
  content?: string;
}

export interface MarketplaceReview {
  itemId: string;
  author: string;
  rating: number;
  text: string;
  timestamp: number;
}

const MARKET_DIR = path.join(process.cwd(), ".cvr", "marketplace");
const INDEX_FILE = path.join(MARKET_DIR, "index.json");
const REVIEWS_FILE = path.join(MARKET_DIR, "reviews.json");

let items: MarketplaceItem[] = [];
let reviews: MarketplaceReview[] = [];

async function ensureMarketDir(): Promise<void> {
  await mkdir(MARKET_DIR, { recursive: true });
  await mkdir(path.join(MARKET_DIR, "packages"), { recursive: true });
}

async function loadIndex(): Promise<void> {
  try {
    const raw = await readFile(INDEX_FILE, "utf-8");
    items = JSON.parse(raw) as MarketplaceItem[];
  } catch { items = []; }
}

async function saveIndex(): Promise<void> {
  await ensureMarketDir();
  await writeFile(INDEX_FILE, JSON.stringify(items, null, 2), "utf-8");
}

async function loadReviews(): Promise<void> {
  try {
    const raw = await readFile(REVIEWS_FILE, "utf-8");
    reviews = JSON.parse(raw) as MarketplaceReview[];
  } catch { reviews = []; }
}

async function saveReviews(): Promise<void> {
  await ensureMarketDir();
  await writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
}

// Initialize
export async function initMarketplace(): Promise<void> {
  await loadIndex();
  await loadReviews();
}

export function getMarketItems(type?: string, tag?: string, search?: string): MarketplaceItem[] {
  let result = [...items];
  if (type) result = result.filter((i) => i.type === type);
  if (tag) result = result.filter((i) => i.tags.includes(tag));
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return result.sort((a, b) => b.downloads - a.downloads);
}

export async function publishItem(
  type: MarketplaceItem["type"],
  name: string,
  description: string,
  content: string,
  author: string = "unknown",
  version: string = "1.0.0",
  tags: string[] = [],
): Promise<MarketplaceItem> {
  await ensureMarketDir();

  const id = `${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(4).toString("hex")}`;

  // Save package file
  const pkgPath = path.join(MARKET_DIR, "packages", `${id}.json`);
  const pkg = { type, name, description, content, author, version, tags };
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");

  // Check if already exists (update)
  const existing = items.find((i) => i.name === name && i.type === type);
  if (existing) {
    existing.version = version;
    existing.description = description;
    existing.tags = tags;
    existing.updatedAt = Date.now();
    existing.packagePath = pkgPath;
    existing.content = content;
  } else {
    const item: MarketplaceItem = {
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
      content,
    };
    items.push(item);
  }

  await saveIndex();
  return existing ?? items[items.length - 1]!;
}

export function getItem(id: string): MarketplaceItem | null {
  return items.find((i) => i.id === id) || null;
}

export async function downloadItem(id: string): Promise<MarketplaceItem | null> {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.downloads++;
  await saveIndex();
  return item;
}

export async function removeItem(id: string): Promise<boolean> {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;

  const item = items[idx];
  if (item) {
    try { await import("fs/promises").then((m) => m.unlink(item.packagePath)); } catch { /* already gone */ }
  }
  items.splice(idx, 1);
  reviews = reviews.filter((r) => r.itemId !== id);
  await saveIndex();
  await saveReviews();
  return true;
}

export async function addReview(itemId: string, rating: number, text: string, author: string = "anonymous"): Promise<MarketplaceReview> {
  const review: MarketplaceReview = {
    itemId,
    author,
    rating: Math.min(5, Math.max(1, rating)),
    text,
    timestamp: Date.now(),
  };
  reviews.push(review);

  // Update item rating
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

export function getReviews(itemId: string): MarketplaceReview[] {
  return reviews.filter((r) => r.itemId === itemId);
}

export function getTags(type?: string): string[] {
  const tagSet = new Set<string>();
  const pool = type ? items.filter((i) => i.type === type) : items;
  for (const item of pool) {
    for (const tag of item.tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort();
}

export function getStats(): { total: number; byType: Record<string, number>; totalDownloads: number } {
  const byType: Record<string, number> = {};
  let totalDownloads = 0;
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    totalDownloads += item.downloads;
  }
  return { total: items.length, byType, totalDownloads };
}
