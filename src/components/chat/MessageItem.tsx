import React from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "../../utils/cn";
import type { Message } from "../../types/chat";

interface MessageItemProps {
  message: Message;
  index: number;
  agentLabel?: string;
  t: any;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  agentLabel,
  t,
}) => {
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-0.5 sm:gap-3"
    >
      <span
        className={cn(
          "shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5",
          message.role === "user" ? "text-dash-text-muted" : "text-dash-accent"
        )}
      >
        [
        {message.role === "user"
          ? t.input
          : agentLabel?.toUpperCase() || t.agent}
        ]
      </span>
      <div
        className={cn(
          "flex-1 prose prose-invert prose-sm max-w-none text-dash-text-primary text-[13px]",
          message.role === "model" &&
            "p-2 bg-dash-card/30 rounded border border-dash-border"
        )}
      >
        <ReactMarkdown
          components={{
            code({ className, children, ...props }: any) {
              const isBlock = className?.startsWith("language-");
              const lang = className?.replace("language-", "") || "";
              const code = String(children).replace(/\n$/, "");
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
                  <div className="flex items-center justify-between px-3 py-1 bg-dash-header border border-dash-border rounded-t text-[8px] font-mono text-dash-text-muted uppercase tracking-wider">
                    <span>{lang || "code"}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(code);
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
                    showLineNumbers={code.split("\n").length > 3}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
};
