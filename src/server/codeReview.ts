import { getGitDiff } from "./gitTools.js";

/**
 * A single review comment about a specific issue found in code.
 */
export interface ReviewComment {
  /** Unique identifier for this comment */
  id: string;
  /** File path where the issue was found */
  file: string;
  /** Starting line number of the issue */
  lineStart: number | undefined;
  /** Ending line number of the issue */
  lineEnd: number | undefined;
  /** Category of the issue */
  category: "style" | "bug" | "security" | "performance" | "architecture";
  /** Severity level */
  severity: "info" | "warning" | "critical";
  /** Description of the issue */
  message: string;
  /** Suggested fix for the issue */
  suggestion: string | undefined;
  /** Code example showing the suggested fix */
  codeExample: string | undefined;
  /** Whether the comment has been accepted (null = unaddressed) */
  accepted: boolean | null;
}

/**
 * The result of a code review containing all comments and a summary.
 */
export interface ReviewResult {
  /** Array of review comments */
  comments: ReviewComment[];
  /** Overall assessment of the changes */
  summary: string;
}

interface RawReviewComment {
  file?: string;
  lineStart?: number;
  lineEnd?: number;
  category?: string;
  severity?: string;
  message?: string;
  suggestion?: string;
  codeExample?: string;
}

interface RawReviewData {
  summary?: string;
  comments?: RawReviewComment[];
}

/**
 * A parsed diff hunk representing changes to a single file.
 */
export interface DiffHunk {
  /** File path */
  file: string;
  /** File status: added, modified, deleted, or renamed */
  status: string;
  /** Raw diff text for this file */
  diff: string;
  /** Individual diff hunks with line offsets and content */
  hunks: Array<{
    /** Starting line in the old file */
    oldStart: number;
    /** Number of lines in the old file */
    oldLines: number;
    /** Starting line in the new file */
    newStart: number;
    /** Number of lines in the new file */
    newLines: number;
    /** Diff lines (prefixed with +, -, or space) */
    lines: string[];
  }>;
}

const pendingReviews: Map<string, ReviewResult> = new Map();

/**
 * Returns all pending review results currently in memory.
 * @returns Array of pending review results
 */
export function getPendingReviews(): ReviewResult[] {
  return Array.from(pendingReviews.values());
}

/**
 * Retrieves a specific review result by its ID.
 * @param id - The review ID
 * @returns The review result, or undefined if not found
 */
export function getReviewById(id: string): ReviewResult | undefined {
  return pendingReviews.get(id);
}

/**
 * Clears all pending reviews from memory.
 */
export function clearPendingReviews(): void {
  pendingReviews.clear();
}

/**
 * Marks a review comment as accepted.
 * @param reviewId - ID of the review containing the comment
 * @param commentId - ID of the comment to accept
 * @returns True if the comment was found and marked accepted, false otherwise
 */
export function acceptComment(reviewId: string, commentId: string): boolean {
  const review = pendingReviews.get(reviewId);
  if (!review) return false;
  const comment = review.comments.find((c) => c.id === commentId);
  if (!comment) return false;
  comment.accepted = true;
  return true;
}

/**
 * Marks a review comment as rejected.
 * @param reviewId - ID of the review containing the comment
 * @param commentId - ID of the comment to reject
 * @returns True if the comment was found and marked rejected, false otherwise
 */
export function rejectComment(reviewId: string, commentId: string): boolean {
  const review = pendingReviews.get(reviewId);
  if (!review) return false;
  const comment = review.comments.find((c) => c.id === commentId);
  if (!comment) return false;
  comment.accepted = false;
  return true;
}

/**
 * Parses a raw git diff string into structured hunks for review.
 * Extracts file paths, statuses, and line-level changes from diff headers and content.
 * @param diffText - Raw git diff output text
 * @returns Array of parsed diff hunks, one per changed file
 */
export function parseDiffIntoHunks(diffText: string): DiffHunk[] {
  const diffHunks: DiffHunk[] = [];
  const diffBlocks = diffText.split("diff --git ");

  for (const block of diffBlocks) {
    if (!block.trim()) continue;
    const lines = block.split("\n");
    const firstLine = lines[0] || "";
    const match = firstLine.match(/a\/(.*?) b\/(.*)/);
    if (!match) continue;

    const file = match[2] || "";
    let status = "modified";
    if (block.includes("new file mode")) status = "added";
    if (block.includes("deleted file mode")) status = "deleted";
    if (block.includes("rename from")) status = "renamed";

    const hunks: DiffHunk["hunks"] = [];
    let currentHunk: DiffHunk["hunks"][0] | null = null;

    for (const line of lines) {
      const hunkHeader = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (hunkHeader) {
        if (currentHunk) hunks.push(currentHunk);
        currentHunk = {
          oldStart: parseInt(hunkHeader[1]!, 10),
          oldLines: parseInt(hunkHeader[2] || "1", 10),
          newStart: parseInt(hunkHeader[3]!, 10),
          newLines: parseInt(hunkHeader[4] || "1", 10),
          lines: [],
        };
      } else if (currentHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
        currentHunk.lines.push(line);
      }
    }
    if (currentHunk) hunks.push(currentHunk);

    diffHunks.push({ file, status, diff: "diff --git " + block, hunks });
  }

  return diffHunks;
}

function buildReviewPrompt(diffHunks: DiffHunk[]): string {
  const filesSummary = diffHunks.map((h) => {
    const hunksSummary = h.hunks.map((hk) => {
      return `    Lines ${hk.newStart}-${hk.newStart + hk.newLines - 1} (${hk.lines.length} changed lines)`;
    }).join("\n");
    return `  File: ${h.file} (${h.status})\n${hunksSummary}`;
  }).join("\n\n");

  const diffText = diffHunks.map((h) => h.diff).join("\n");

  return `You are a senior code reviewer with expertise in software engineering, security, and architecture.

Your task is to review the code diff below and provide structured review comments.

Be constructive and specific. For each issue:
- Explain WHY it's an issue
- Suggest a concrete fix with a code example when possible
- Reference specific lines or sections

Categories: style, bug, security, performance, architecture
Severity levels: info (minor suggestion), warning (should fix), critical (must fix before merge)

Files changed summary:
${filesSummary}

Return ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "summary": "1-2 sentence overall assessment of the changes",
  "comments": [
    {
      "file": "path/to/file.ts",
      "lineStart": 42,
      "lineEnd": 45,
      "category": "bug",
      "severity": "warning",
      "message": "Specific constructive feedback about the issue",
      "suggestion": "How to fix it",
      "codeExample": "const fixed = example;"
    }
  ]
}

If no issues are found, return {"summary": "No issues found. LGTM!", "comments": []}.

DIFF TO REVIEW:
\`\`\`diff
${diffText}
\`\`\`
`;
}

function generateCommentId(): string {
  return `comment-${Math.random().toString(36).substring(2, 11)}`;
}

function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Analyzes a git diff using an AI generation function to produce structured review feedback.
 * Falls back to treating the raw response as a single comment if JSON parsing fails.
 * @param generateFn - Async function that takes a prompt string and returns an AI-generated response
 * @param providedDiff - Optional raw diff string (defaults to git diff of the current working tree)
 * @returns Structured review result with comments and summary
 */
export async function analyzeDiff(
  generateFn: (prompt: string) => Promise<string>,
  providedDiff?: string
): Promise<ReviewResult> {
  const diffText = providedDiff ?? (await getGitDiff()).map((d) => d.diff).join("\n");

  if (!diffText.trim()) {
    return { summary: "No diff to review. Working tree is clean.", comments: [] };
  }

  const diffHunks = parseDiffIntoHunks(diffText);
  const prompt = buildReviewPrompt(diffHunks);

  const response = await generateFn(prompt);

  let parsed: ReviewResult;
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const data: RawReviewData = JSON.parse(jsonMatch[0]) as RawReviewData;
    parsed = {
      summary: data.summary || "Review completed.",
      comments: (data.comments || []).map((c) => ({
        id: generateCommentId(),
        file: c.file || "unknown",
        lineStart: c.lineStart,
        lineEnd: c.lineEnd,
        category: ["style", "bug", "security", "performance", "architecture"].includes(c.category || "")
          ? (c.category as ReviewComment["category"])
          : "style",
        severity: ["info", "warning", "critical"].includes(c.severity || "")
          ? (c.severity as ReviewComment["severity"])
          : "info",
        message: c.message || "No message provided",
        suggestion: c.suggestion,
        codeExample: c.codeExample,
        accepted: null,
      })),
    };
  } catch (err) {
    // Fallback: treat the whole response as a single comment
    parsed = {
      summary: "AI review response (parse fallback)",
      comments: [
        {
          id: generateCommentId(),
          file: diffHunks[0]?.file || "unknown",
          lineStart: undefined,
          lineEnd: undefined,
          category: "style",
          severity: "info",
          message: response.slice(0, 2000),
          suggestion: undefined,
          codeExample: undefined,
          accepted: null,
        },
      ],
    };
  }

  const reviewId = generateReviewId();
  pendingReviews.set(reviewId, parsed);

  return parsed;
}
