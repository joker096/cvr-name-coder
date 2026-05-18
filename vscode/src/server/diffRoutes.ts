export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
  newLineNumber?: number;
}

export function generateDiff(
  originalContent: string,
  newContent: string
): DiffLine[] {
  // Handle empty/identical files
  if (!originalContent && !newContent) return [];
  if (originalContent === newContent) return [];

  // Split lines, handling trailing newlines consistently
  const splitLines = (text: string): string[] => {
    if (!text) return [];
    const lines = text.split('\n');
    // Remove trailing empty line from files ending with newline
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      return lines.slice(0, -1);
    }
    return lines;
  };

  const oldLines = splitLines(originalContent);
  const newLines = splitLines(newContent);

  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.push({ type: "unchanged", content: oldLines[i - 1], lineNumber: i, newLineNumber: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: "added", content: newLines[j - 1], lineNumber: i + 1, newLineNumber: j + 1 });
      j--;
    } else {
      temp.push({ type: "removed", content: oldLines[i - 1], lineNumber: i, newLineNumber: j + 1 });
      i--;
    }
  }

  return temp.reverse();
}
