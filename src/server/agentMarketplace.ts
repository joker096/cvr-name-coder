// Agent Marketplace — registry for publishing and importing agents/skills/plugins
import { readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { randomBytes } from "crypto";

/**
 * Represents a publishable item in the agent marketplace.
 * Can be an agent, skill, plugin, rule, or tool.
 */
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

/**
 * A user review for a marketplace item.
 */
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

/**
 * Initializes the marketplace by loading the item index and reviews from disk.
 * Must be called once before using other marketplace functions.
 */
export async function initMarketplace(): Promise<void> {
  await loadIndex();
  await loadReviews();
}

/**
 * Queries marketplace items with optional filters and search.
 * Results are sorted by download count (descending).
 * @param type - Optional filter by item type
 * @param tag - Optional filter by tag
 * @param search - Optional case-insensitive search across name, description, and tags
 * @returns Filtered and sorted array of {@link MarketplaceItem} objects
 */
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

/**
 * Publishes a new item or updates an existing one in the marketplace.
 * If an item with the same name and type already exists, it is updated.
 * @param type - The type of item to publish
 * @param name - Display name of the item
 * @param description - Description of the item
 * @param content - Package content string
 * @param author - Author name (default: "unknown")
 * @param version - Semantic version string (default: "1.0.0")
 * @param tags - Array of tag strings (default: empty)
 * @returns The published or updated {@link MarketplaceItem}
 */
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

/**
 * Retrieves a marketplace item by its unique ID.
 * @param id - The item identifier
 * @returns The matching {@link MarketplaceItem} or `null` if not found
 */
export function getItem(id: string): MarketplaceItem | null {
  return items.find((i) => i.id === id) || null;
}

/**
 * Records a download for an item and returns it.
 * Increments the download counter and persists the index.
 * @param id - The item identifier
 * @returns The {@link MarketplaceItem} or `null` if not found
 */
export async function downloadItem(id: string): Promise<MarketplaceItem | null> {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  item.downloads++;
  await saveIndex();
  return item;
}

/**
 * Removes an item from the marketplace, including its package file and reviews.
 * @param id - The item identifier to remove
 * @returns `true` if the item was found and removed, `false` otherwise
 */
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

/**
 * Adds a review to a marketplace item and recalculates its average rating.
 * Rating is clamped to the range 1–5.
 * @param itemId - The ID of the item to review
 * @param rating - Numeric rating (clamped 1–5)
 * @param text - Review text content
 * @param author - Reviewer name (default: "anonymous")
 * @returns The created {@link MarketplaceReview}
 */
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

/**
 * Returns all reviews for a given marketplace item.
 * @param itemId - The item identifier
 * @returns Array of {@link MarketplaceReview} objects
 */
export function getReviews(itemId: string): MarketplaceReview[] {
  return reviews.filter((r) => r.itemId === itemId);
}

/**
 * Collects all unique tags from marketplace items, optionally filtered by type.
 * @param type - Optional item type filter
 * @returns Sorted array of tag strings
 */
export function getTags(type?: string): string[] {
  const tagSet = new Set<string>();
  const pool = type ? items.filter((i) => i.type === type) : items;
  for (const item of pool) {
    for (const tag of item.tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort();
}

/**
 * Returns aggregate statistics about the marketplace.
 * @returns Object containing total item count, breakdown by type, and total downloads
 */
export function getStats(): { total: number; byType: Record<string, number>; totalDownloads: number } {
  const byType: Record<string, number> = {};
  let totalDownloads = 0;
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    totalDownloads += item.downloads;
  }
  return { total: items.length, byType, totalDownloads };
}
