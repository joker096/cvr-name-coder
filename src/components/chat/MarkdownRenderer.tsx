import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }: any) {
          const isBlock = className?.startsWith("language-");
          const lang = className?.replace("language-", "") || "";
          const codeText = String(children).replace(/\n$/, "");
          const [copied, setCopied] = React.useState(false);
          if (!isBlock)
            return (
              <code
                className="px-1 py-0.5 bg-dash-bg border border-dash-border rounded text-[11px] font-mono text-dash-accent"
                {...props}
              >
                {children}
              </code>
            );
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
              <SyntaxHighlighter
                language={lang || "text"}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  fontSize: "11px",
                  background: "#1A1A1E",
                }}
                showLineNumbers={codeText.split("\n").length > 3}
              >
                {codeText}
              </SyntaxHighlighter>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
