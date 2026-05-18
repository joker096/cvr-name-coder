export interface CompletionRequest {
  textBeforeCursor: string;
  textAfterCursor: string;
  filePath: string;
  language: string;
  maxLines: number;
}

export interface CompletionResponse {
  items: Array<{
    text: string;
    range?: [number, number];
    score?: number;
  }>;
}

export interface CompletionConfig {
  provider: string;
  model: string;
  debounceMs: number;
  maxPrefixLines: number;
  maxSuffixLines: number;
  enabled: boolean;
}
