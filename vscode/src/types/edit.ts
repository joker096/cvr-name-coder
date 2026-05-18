export interface InlineEditRequest {
  selectedCode: string;
  filePath: string;
  language: string;
  instruction: string;
  wholeFile: string;
  selectionStart: { line: number; character: number };
  selectionEnd: { line: number; character: number };
}

export interface InlineEditResponse {
  replacement: string;
}

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
}
