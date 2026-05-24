import type { ToolResult } from "../../types/tools";

/**
 * Interface for browser automation tools provided by playwright-core.
 */
interface BrowserToolsModule {
  browserNavigate: (sessionId: string, url: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClick: (sessionId: string, selector: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserType: (sessionId: string, selector: string, text: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserScreenshot: (sessionId: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string; base64?: string }>;
  browserEvaluate: (sessionId: string, script: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserGetHtml: (sessionId: string, headless: boolean) => Promise<{ success: boolean; output?: string; error?: string }>;
  browserClose: (sessionId: string) => Promise<{ success: boolean; output?: string; error?: string }>;
}

let browserTools: BrowserToolsModule | null = null;

/**
 * Lazily loads the browser tools module.
 * @returns The browser tools module, or null if playwright-core is not installed.
 */
export async function getBrowserTools(): Promise<BrowserToolsModule | null> {
  if (!browserTools) {
    try {
      browserTools = (await import("../browserTools.js")) as BrowserToolsModule;
    } catch {
      return null;
    }
  }
  return browserTools;
}

/**
 * Navigates a browser session to the specified URL.
 * @param params - Contains `url` (the target URL) and `headless` (whether to run headless, defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The navigation result.
 */
export async function executeBrowserNavigate(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const navResult = await bt.browserNavigate(sessionId, String(params.url), Boolean(params.headless ?? true));
  return {
    success: navResult.success,
    output: navResult.output ?? "",
    ...(navResult.error ? { error: navResult.error } : {}),
  };
}

/**
 * Clicks on an element in a browser session by CSS selector.
 * @param params - Contains `selector` (CSS selector string) and `headless` (whether to run headless, defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The click result.
 */
export async function executeBrowserClick(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const clickResult = await bt.browserClick(sessionId, String(params.selector), Boolean(params.headless ?? true));
  return {
    success: clickResult.success,
    output: clickResult.output ?? "",
    ...(clickResult.error ? { error: clickResult.error } : {}),
  };
}

/**
 * Types text into an element in a browser session.
 * @param params - Contains `selector` (CSS selector), `text` (text to type), and `headless` (defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The typing result.
 */
export async function executeBrowserType(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const typeResult = await bt.browserType(sessionId, String(params.selector), String(params.text), Boolean(params.headless ?? true));
  return {
    success: typeResult.success,
    output: typeResult.output ?? "",
    ...(typeResult.error ? { error: typeResult.error } : {}),
  };
}

/**
 * Takes a screenshot of the current browser page.
 * @param params - Contains `headless` (whether to run headless, defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The screenshot result, potentially with a base64-encoded image.
 */
export async function executeBrowserScreenshot(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const ssResult = await bt.browserScreenshot(sessionId, Boolean(params.headless ?? true));
  return {
    success: ssResult.success,
    output: ssResult.output ?? "",
    ...(ssResult.error ? { error: ssResult.error } : {}),
    ...(ssResult.base64 ? { base64: ssResult.base64 } : {}),
  };
}

/**
 * Evaluates a JavaScript script in the browser context.
 * @param params - Contains `script` (JavaScript code to execute) and `headless` (defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The evaluation result.
 */
export async function executeBrowserEvaluate(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const evalResult = await bt.browserEvaluate(sessionId, String(params.script), Boolean(params.headless ?? true));
  return {
    success: evalResult.success,
    output: evalResult.output ?? "",
    ...(evalResult.error ? { error: evalResult.error } : {}),
  };
}

/**
 * Retrieves the full HTML of the current browser page.
 * @param params - Contains `headless` (whether to run headless, defaults to true).
 * @param sessionId - The browser session identifier.
 * @returns The HTML content result.
 */
export async function executeBrowserGetHtml(params: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const htmlResult = await bt.browserGetHtml(sessionId, Boolean(params.headless ?? true));
  return {
    success: htmlResult.success,
    output: htmlResult.output ?? "",
    ...(htmlResult.error ? { error: htmlResult.error } : {}),
  };
}

/**
 * Closes a browser session.
 * @param sessionId - The browser session identifier.
 * @returns The close result.
 */
export async function executeBrowserClose(sessionId: string): Promise<ToolResult> {
  const bt = await getBrowserTools();
  if (!bt) return { success: false, output: "", error: "playwright-core not installed" };
  const closeResult = await bt.browserClose(sessionId);
  return {
    success: closeResult.success,
    output: closeResult.output ?? "",
    ...(closeResult.error ? { error: closeResult.error } : {}),
  };
}
