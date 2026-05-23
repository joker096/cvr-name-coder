import React, { lazy, Suspense } from "react";

const ReactMarkdown = lazy(() => import("react-markdown"));

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <Suspense fallback={<div className="text-dash-text-muted text-xs animate-pulse">...</div>}>
      <ReactMarkdown
        components={{
          code({ className, children }: any) {
            const isBlock = className?.startsWith("language-");
            const lang = className?.replace("language-", "") || "";
            const codeText = String(children).replace(/\n$/, "");
            const [copied, setCopied] = React.useState(false);

            if (!isBlock) {
              return (
                <code className="px-1 py-0.5 bg-dash-bg border border-dash-border rounded text-[11px] font-mono text-dash-accent">
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
                <pre className="bg-[#1A1A1E] p-3 overflow-x-auto text-[11px] font-mono text-dash-text-primary rounded-b border border-t-0 border-dash-border">
                  {codeText}
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Suspense>
  );
};
