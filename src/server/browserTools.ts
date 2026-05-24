import { getErrorMessage } from "../types/errors";
import { log } from "./logger.js";

/**
 * Configuration options for browser automation tools.
 * Controls session lifecycle, viewport dimensions, and operation timeouts.
 */
export interface BrowserConfig {
  /** Session time-to-live in milliseconds. Default: 15 minutes */
  sessionTtlMs?: number;
  /** Browser viewport width in pixels. Default: 1280 */
  viewportWidth?: number;
  /** Browser viewport height in pixels. Default: 720 */
  viewportHeight?: number;
  /** Navigation timeout in milliseconds. Default: 30000 */
  navigateTimeout?: number;
  /** Click operation timeout in milliseconds. Default: 10000 */
  clickTimeout?: number;
  /** Type operation timeout in milliseconds. Default: 10000 */
  typeTimeout?: number;
  /** Maximum allowed script length for browserEvaluate. Default: 100000 */
  scriptMaxLength?: number;
  /** Interval for cleanup of stale sessions in milliseconds. Default: 60000 */
  cleanupIntervalMs?: number;
}

let _config: BrowserConfig = {
  sessionTtlMs: 15 * 60 * 1000,
  viewportWidth: 1280,
  viewportHeight: 720,
  navigateTimeout: 30000,
  clickTimeout: 10000,
  typeTimeout: 10000,
  scriptMaxLength: 100000,
  cleanupIntervalMs: 60 * 1000,
};

/**
 * Updates the browser configuration with partial values.
 * @param config - Partial configuration to merge with existing config
 */
export function setBrowserConfig(config: Partial<BrowserConfig>): void {
  _config = { ..._config, ...config };
}

/**
 * Returns a copy of the current browser configuration.
 * @returns Current browser configuration
 */
export function getBrowserConfig(): BrowserConfig {
  return { ..._config };
}

/**
 * Internal representation of an active Playwright browser session.
 */
interface BrowserSession {
  browser: any;
  context: any;
  page: any;
  createdAt: number;
  lastUsedAt: number;
}

const browserPool = new Map<string, BrowserSession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

let playwrightChromium: any = null;
let playwrightError: Error | null = null;

async function getPlaywright() {
  if (playwrightChromium) return playwrightChromium;
  if (playwrightError) throw playwrightError;
  
  try {
    const pw = await import("playwright");
    playwrightChromium = pw.chromium;
    return playwrightChromium;
  } catch (err) {
    playwrightError = err as Error;
    throw playwrightError;
  }
}

function markSessionUsed(session: BrowserSession): void {
  session.lastUsedAt = Date.now();
}

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    void cleanupStaleBrowserSessions();
  }, _config.cleanupIntervalMs);
  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

async function getOrCreateSession(sessionId: string, headless = true): Promise<BrowserSession> {
  ensureCleanupTimer();
  const existing = browserPool.get(sessionId);
  if (existing) {
    // Verify the session is still alive
    try {
      await existing.page.evaluate(() => document.title);
      markSessionUsed(existing);
      return existing;
    } catch {
      log.debug("Session is dead, cleaning up and recreating");
      await closeBrowserSession(sessionId);
    }
  }

  const chromium = await getPlaywright();
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: _config.viewportWidth!, height: _config.viewportHeight! },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    permissions: [],
    bypassCSP: false,
    ignoreHTTPSErrors: false,
  });
  await context.route("**/*", (route: any, request: any) => {
    const url = request.url();
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.")
      ) {
        route.abort("blockedbyclient");
        return;
      }
  } catch {
    log.debug("Invalid URL for route blocking");
  }
    route.continue();
  });
  const page = await context.newPage();
  const now = Date.now();
  const session: BrowserSession = { browser, context, page, createdAt: now, lastUsedAt: now };
  browserPool.set(sessionId, session);
  return session;
}

/**
 * Closes a browser session and removes it from the pool.
 * @param sessionId - Unique identifier for the browser session
 */
export async function closeBrowserSession(sessionId: string): Promise<void> {
  const session = browserPool.get(sessionId);
  if (!session) return;
  try {
    await session.context.close();
    await session.browser.close();
  } catch {
    log.debug("Ignoring cleanup errors");
  }
  browserPool.delete(sessionId);
  if (browserPool.size === 0 && cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Closes all active browser sessions.
 */
export async function closeAllBrowsers(): Promise<void> {
  for (const [sessionId] of browserPool) {
    await closeBrowserSession(sessionId);
  }
}

/**
 * Validates a URL for browser navigation.
 * Blocks local/internal addresses for security.
 * @param url - URL to validate
 * @returns Error message if invalid, `null` if valid
 */
export function validateBrowserUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Only HTTP and HTTPS URLs are allowed for security";
    }
    // Block local network / file-system access
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")
    ) {
      return "Navigation to local/internal addresses is blocked for security";
    }
    return null;
  } catch {
    log.debug("Invalid URL");
    return "Invalid URL";
  }
}

/**
 * Cleans up browser sessions that have exceeded their TTL.
 * @param now - Current timestamp (defaults to `Date.now()`)
 * @returns Array of closed session IDs
 */
export async function cleanupStaleBrowserSessions(now = Date.now()): Promise<string[]> {
  const staleSessionIds = Array.from(browserPool.entries())
    .filter(([, session]) => now - session.lastUsedAt >= _config.sessionTtlMs!)
    .map(([sessionId]) => sessionId);

  for (const sessionId of staleSessionIds) {
    await closeBrowserSession(sessionId);
  }

  return staleSessionIds;
}

/**
 * Navigates a browser session to a URL.
 * @param sessionId - Unique identifier for the browser session
 * @param url - URL to navigate to
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status and page title
 */
export async function browserNavigate(sessionId: string, url: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  const validationError = validateBrowserUrl(url);
  if (validationError) {
    return { success: false, output: "", error: validationError };
  }
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    await page.goto(url, { waitUntil: "networkidle", timeout: _config.navigateTimeout });
    const title = await page.title();
    return { success: true, output: `Navigated to ${url}. Page title: "${title}"` };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Clicks an element on the page.
 * @param sessionId - Unique identifier for the browser session
 * @param selector - CSS selector for the element
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status
 */
export async function browserClick(sessionId: string, selector: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    await page.locator(selector).click({ timeout: _config.clickTimeout });
    return { success: true, output: `Clicked element: ${selector}` };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Types text into a form field identified by a CSS selector.
 * @param sessionId - Unique identifier for the browser session
 * @param selector - CSS selector for the input element
 * @param text - Text to type into the field
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status
 */
export async function browserType(sessionId: string, selector: string, text: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    await page.locator(selector).fill(text);
    return { success: true, output: `Typed "${text}" into ${selector}` };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Captures a screenshot of the current page.
 * @param sessionId - Unique identifier for the browser session
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status and optional base64-encoded PNG data
 */
export async function browserScreenshot(sessionId: string, headless = true): Promise<{ success: boolean; output: string; error?: string; base64?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    const base64 = screenshot.toString("base64");
    return { success: true, output: `Screenshot captured (${screenshot.length} bytes)`, base64 };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Evaluates a JavaScript expression in the browser page context.
 * The script is executed in an isolated page context via Playwright's evaluate.
 * Script length is limited by {@link BrowserConfig.scriptMaxLength}.
 * @param sessionId - Unique identifier for the browser session
 * @param script - JavaScript code to evaluate in the page
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status and the evaluation result
 */
export async function browserEvaluate(sessionId: string, script: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    if (script.length > _config.scriptMaxLength!) {
      return { success: false, output: "", error: "Script exceeds maximum length" };
    }
    const result = await page.evaluate((code: string) => {
      try {
        const retval = (globalThis as { eval: (code: string) => unknown }).eval(code);
        return { __ok: true, __value: retval };
      } catch (e: unknown) {
        return { __ok: false, __error: e instanceof Error ? e.message : String(e) };
      }
    }, script);
    if (result && typeof result === "object") {
      if (result.__ok === false) {
        return { success: false, output: "", error: result.__error ?? "Unknown error" };
      }
      const output = typeof result.__value === "string" ? result.__value : JSON.stringify(result.__value, null, 2);
      return { success: true, output: output || "undefined" };
    }
    const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { success: true, output: output || "undefined" };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Retrieves the full HTML content of the current page.
 * @param sessionId - Unique identifier for the browser session
 * @param headless - Whether to run in headless mode (default: `true`)
 * @returns Result object with success status and the page's HTML content
 */
export async function browserGetHtml(sessionId: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    const html = await page.content();
    return { success: true, output: html };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

/**
 * Closes the browser session identified by the given session ID.
 * @param sessionId - Unique identifier for the browser session to close
 * @returns Result object with success status
 */
export async function browserClose(sessionId: string): Promise<{ success: boolean; output: string; error?: string }> {
  await closeBrowserSession(sessionId);
  return { success: true, output: "Browser closed for session." };
}

/**
 * Returns the list of currently active browser session IDs.
 * @returns Array of active session ID strings
 */
export function getActiveBrowserSessions(): string[] {
  return Array.from(browserPool.keys());
}

// Cleanup on process exit
process.on("exit", () => {
  for (const [, session] of browserPool) {
    try { session.browser.close(); } catch {}
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
