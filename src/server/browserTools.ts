import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: number;
}

const browserPool = new Map<string, BrowserSession>();

async function getOrCreateSession(sessionId: string, headless = true): Promise<BrowserSession> {
  const existing = browserPool.get(sessionId);
  if (existing) {
    // Verify the session is still alive
    try {
      await existing.page.evaluate(() => document.title);
      return existing;
    } catch {
      // Session is dead, clean up and recreate
      await closeBrowserSession(sessionId);
    }
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const session: BrowserSession = { browser, context, page, createdAt: Date.now() };
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
}

export async function closeAllBrowsers(): Promise<void> {
  for (const [sessionId] of browserPool) {
    await closeBrowserSession(sessionId);
  }
}

function validateBrowserUrl(url: string): string | null {
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

export async function browserNavigate(sessionId: string, url: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  const validationError = validateBrowserUrl(url);
  if (validationError) {
    return { success: false, output: "", error: validationError };
  }
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const title = await page.title();
    return { success: true, output: `Navigated to ${url}. Page title: "${title}"` };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}

export async function browserClick(sessionId: string, selector: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.locator(selector).click({ timeout: 10000 });
    return { success: true, output: `Clicked element: ${selector}` };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}

export async function browserType(sessionId: string, selector: string, text: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    await page.locator(selector).fill(text);
    return { success: true, output: `Typed "${text}" into ${selector}` };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}

export async function browserScreenshot(sessionId: string, headless = true): Promise<{ success: boolean; output: string; error?: string; base64?: string }> {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    const base64 = screenshot.toString("base64");
    return { success: true, output: `Screenshot captured (${screenshot.length} bytes)`, base64 };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}

export async function browserEvaluate(sessionId: string, script: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    // SECURITY: Script is executed in an isolated page context via Playwright's evaluate.
    // We pass it as a string and use a minimal wrapper to return results safely.
    // The page context is separate from Node.js, but we still validate the script.
    if (script.length > 100000) {
      return { success: false, output: "", error: "Script exceeds maximum length" };
    }
    const result = await page.evaluate((code) => {
      try {
        // Use indirect eval (globalThis.eval) which runs in page context, not Node
        // eslint-disable-next-line no-eval
        const retval = (globalThis as any).eval(code);
        return { __ok: true, __value: retval };
      } catch (e: any) {
        return { __ok: false, __error: e.message };
      }
    }, script);
    if (result && typeof result === "object") {
      if (result.__ok === false) {
        return { success: false, output: "", error: result.__error };
      }
      const output = typeof result.__value === "string" ? result.__value : JSON.stringify(result.__value, null, 2);
      return { success: true, output: output || "undefined" };
    }
    const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { success: true, output: output || "undefined" };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
  }
}

export async function browserGetHtml(sessionId: string, headless = true): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const { page } = await getOrCreateSession(sessionId, headless);
    const html = await page.content();
    return { success: true, output: html };
  } catch (err: any) {
    return { success: false, output: "", error: err.message };
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
