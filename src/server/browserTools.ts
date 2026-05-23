import { getErrorMessage } from "../types/errors";

interface BrowserSession {
  browser: any;
  context: any;
  page: any;
  createdAt: number;
  lastUsedAt: number;
}

const browserPool = new Map<string, BrowserSession>();
const SESSION_TTL_MS = 15 * 60 * 1000;
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
  }, 60 * 1000);
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
      // Session is dead, clean up and recreate
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
    } catch {}
    route.continue();
  });
  const page = await context.newPage();
  const now = Date.now();
  const session: BrowserSession = { browser, context, page, createdAt: now, lastUsedAt: now };
  browserPool.set(sessionId, session);
  return session;
}

export async function closeBrowserSession(sessionId: string): Promise<void> {
  const session = browserPool.get(sessionId);
  if (!session) return;
  try {
    await session.context.close();
    await session.browser.close();
  } catch {
    // Ignore cleanup errors
  }
  browserPool.delete(sessionId);
  if (browserPool.size === 0 && cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export async function closeAllBrowsers(): Promise<void> {
  for (const [sessionId] of browserPool) {
    await closeBrowserSession(sessionId);
  }
}

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
    return "Invalid URL";
  }
}

export async function cleanupStaleBrowserSessions(now = Date.now()): Promise<string[]> {
  const staleSessionIds = Array.from(browserPool.entries())
    .filter(([, session]) => now - session.lastUsedAt >= SESSION_TTL_MS)
    .map(([sessionId]) => sessionId);

  for (const sessionId of staleSessionIds) {
    await closeBrowserSession(sessionId);
  }

  return staleSessionIds;
}

export async function browserNavigate(sessionId: string, url: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  const validationError = validateBrowserUrl(url);
  if (validationError) {
    return { success: false, output: "", error: validationError };
  }
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const title = await page.title();
    return { success: true, output: `Navigated to ${url}. Page title: "${title}"` };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

export async function browserClick(sessionId: string, selector: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    await page.locator(selector).click({ timeout: 10000 });
    return { success: true, output: `Clicked element: ${selector}` };
  } catch (err: unknown) {
    return { success: false, output: "", error: getErrorMessage(err) };
  }
}

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

export async function browserEvaluate(sessionId: string, script: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const session = await getOrCreateSession(sessionId, headless);
    markSessionUsed(session);
    const { page } = session;
    // SECURITY: Script is executed in an isolated page context via Playwright's evaluate.
    // We pass it as a string and use a minimal wrapper to return results safely.
    // The page context is separate from Node.js, but we still validate the script.
    if (script.length > 100000) {
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

export async function browserClose(sessionId: string): Promise<{ success: boolean; output: string; error?: string }> {
  await closeBrowserSession(sessionId);
  return { success: true, output: "Browser closed for session." };
}

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
