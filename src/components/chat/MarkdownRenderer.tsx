import React, { lazy, Suspense } from "react";

const ReactMarkdown = lazy(() => import("react-markdown"));

interface MarkdownRendererProps {
  content: string;
}

interface MarkdownBlock {
  type: "markdown";
  text: string;
}

interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface JsonBlock {
  type: "json";
  value: unknown;
  raw: string;
}

type RichBlock = MarkdownBlock | TableBlock | JsonBlock;

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tryParseTable(lines: string[], startIndex: number): { block: TableBlock; nextIndex: number } | null {
  const headerLine = lines[startIndex];
  const dividerLine = lines[startIndex + 1];

  if (!headerLine?.includes("|") || !dividerLine || !isTableDivider(dividerLine)) {
    return null;
  }

  const headers = splitTableRow(headerLine);
  if (headers.length < 2) {
    return null;
  }

  const rows: string[][] = [];
  let nextIndex = startIndex + 2;

  while (nextIndex < lines.length) {
    const line = lines[nextIndex];
    if (!line?.includes("|") || !line.trim()) {
      break;
    }

    const row = splitTableRow(line);
    rows.push(row);
    nextIndex += 1;
  }

  return {
    block: { type: "table", headers, rows },
    nextIndex,
  };
}

function parseRichBlocks(content: string): RichBlock[] {
  const lines = content.split("\n");
  const blocks: RichBlock[] = [];
  let markdownBuffer: string[] = [];

  const flushMarkdown = () => {
    const text = markdownBuffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "markdown", text });
    }
    markdownBuffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] || "";
    const fenceMatch = line.match(/^```(json|JSON)\s*$/);
    if (fenceMatch) {
      const jsonLines: string[] = [];
      let endIndex = i + 1;

      while (endIndex < lines.length && !lines[endIndex]?.startsWith("```")) {
        jsonLines.push(lines[endIndex] || "");
        endIndex += 1;
      }

      if (endIndex < lines.length) {
        const closingFence = lines[endIndex] || "";
        const raw = jsonLines.join("\n").trim();
        try {
          flushMarkdown();
          blocks.push({ type: "json", value: JSON.parse(raw), raw });
          i = endIndex;
          continue;
        } catch {
          markdownBuffer.push(line, ...jsonLines, closingFence);
          i = endIndex;
          continue;
        }
      }
    }

    const table = tryParseTable(lines, i);
    if (table) {
      flushMarkdown();
      blocks.push(table.block);
      i = table.nextIndex - 1;
      continue;
    }

    markdownBuffer.push(line);
  }

  flushMarkdown();
  return blocks;
}

const JsonValue: React.FC<{ value: unknown; level?: number }> = ({ value, level = 0 }) => {
  if (value === null) {
    return <span className="text-dash-text-muted">null</span>;
  }

  if (typeof value === "string") {
    return <span className="text-dash-success">"{value}"</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-dash-warning">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className={level > 0 ? "ml-3" : ""}>
        <span className="text-dash-text-muted">[</span>
        {value.map((item, index) => (
          <div key={index} className="ml-3">
            <JsonValue value={item} level={level + 1} />
            {index < value.length - 1 && <span className="text-dash-text-muted">,</span>}
          </div>
        ))}
        <span className="text-dash-text-muted">]</span>
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div className={level > 0 ? "ml-3" : ""}>
        <span className="text-dash-text-muted">{"{"}</span>
        {entries.map(([key, entryValue], index) => (
          <div key={key} className="ml-3">
            <span className="text-dash-accent">"{key}"</span>
            <span className="text-dash-text-muted">: </span>
            <JsonValue value={entryValue} level={level + 1} />
            {index < entries.length - 1 && <span className="text-dash-text-muted">,</span>}
          </div>
        ))}
        <span className="text-dash-text-muted">{"}"}</span>
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

const RichTable: React.FC<TableBlock> = ({ headers, rows }) => (
  <div className="my-2 overflow-x-auto rounded border border-dash-border bg-dash-bg/40">
    <table className="min-w-full border-collapse text-left text-[11px]">
      <thead className="bg-dash-elevated text-dash-text-primary">
        <tr>
          {headers.map((header, index) => (
            <th key={`${header}-${index}`} className="border-b border-dash-border px-3 py-2 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="odd:bg-dash-surface/25">
            {headers.map((_, cellIndex) => (
              <td key={cellIndex} className="border-t border-dash-border/60 px-3 py-2 text-dash-text-secondary align-top">
                {row[cellIndex] || ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const JsonViewer: React.FC<JsonBlock> = ({ value, raw }) => {
  const [expanded, setExpanded] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="my-2 overflow-hidden rounded border border-dash-border bg-dash-bg/40">
      <div className="flex items-center justify-between border-b border-dash-border bg-dash-elevated px-3 py-1.5">
        <button
          className="text-[9px] font-mono uppercase tracking-wider text-dash-accent hover:text-dash-accent-hover"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "json hide" : "json show"}
        </button>
        <button
          className="text-[9px] font-mono uppercase tracking-wider text-dash-text-muted hover:text-dash-accent"
          onClick={() => {
            navigator.clipboard.writeText(raw);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      {expanded && (
        <pre className="max-h-96 overflow-auto p-3 text-[11px] leading-relaxed">
          <JsonValue value={value} />
        </pre>
      )}
    </div>
  );
};

const MarkdownChunk: React.FC<{ text: string }> = ({ text }) => (
  <ReactMarkdown
    components={{
      code({ className, children }: any) {
        const isBlock = className?.startsWith("language-");
        const lang = className?.replace("language-", "") || "";
        const codeText = String(children).replace(/\n$/, "");
        const [copied, setCopied] = React.useState(false);

        if (!isBlock) {
          return (
            <code className="px-1 py-0.5 bg-dash-bg border border-dash-border rounded text-[11px] font-mono text-dash-accent break-all">
              {children}
            </code>
          );
        }

        return (
          <div className="relative group my-2">
            <div className="flex items-center justify-between px-3 py-1 bg-dash-elevated border border-dash-border rounded-t text-[8px] font-mono text-dash-text-muted uppercase tracking-wider">
              <span>{lang || "code"}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded hover:bg-dash-accent/10 text-dash-accent"
              >
                {copied ? "copied!" : "copy"}
              </button>
            </div>
            <pre className="bg-[#1A1A1E] p-3 overflow-x-auto text-[11px] font-mono text-dash-text-primary rounded-b border border-t-0 border-dash-border whitespace-pre-wrap break-all">
              {codeText}
            </pre>
          </div>
        );
      },
      p({ children }: any) {
        return <p className="break-words overflow-wrap-anywhere">{children}</p>;
      },
    }}
  >
    {text}
  </ReactMarkdown>
);

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const blocks = React.useMemo(() => parseRichBlocks(content), [content]);

  return (
    <Suspense fallback={<div className="text-dash-text-muted text-xs animate-pulse">...</div>}>
      {blocks.map((block, index) => {
        if (block.type === "table") {
          return <RichTable key={index} {...block} />;
        }

        if (block.type === "json") {
          return <JsonViewer key={index} {...block} />;
        }

        return <MarkdownChunk key={index} text={block.text} />;
      })}
    </Suspense>
  );
};
