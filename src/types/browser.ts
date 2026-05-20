export interface BrowserNavigateResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface BrowserClickResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface BrowserScreenshotResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface BrowserEvaluateResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface BrowserTools {
  browserNavigate(url: string): Promise<BrowserNavigateResult>;
  browserClick(selector: string): Promise<BrowserClickResult>;
  browserScreenshot(): Promise<BrowserScreenshotResult>;
  browserEvaluate(script: string): Promise<BrowserEvaluateResult>;
}
