import React from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "../../utils/cn";
import type { Message } from "../../types/chat";
import { ReviewMessage } from "./ReviewMessage";

interface MessageItemProps {
  message: Message;
  index: number;
  agentLabel?: string | undefined;
  t: any;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  index,
  agentLabel,
  t,
}) => {
  if (message.role === "review") {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-0.5 sm:gap-3"
      >
        <span className="shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5 text-dash-accent">
          [REVIEW]
        </span>
        <div className="flex-1">
          <ReviewMessage message={message} />
        </div>
      </motion.div>
    );
  }

  if (message.role === "tool_call" && message.toolCall) {
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-0.5 sm:gap-3"
      >
        <span className="shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5 text-dash-accent">
          [TOOL]
        </span>
        <div className="flex-1 card border-dash-accent/30 bg-dash-accent-soft/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-dash-accent/20">
            <svg className="w-3 h-3 text-dash-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span className="text-[10px] font-mono uppercase tracking-wider text-dash-accent">
              TOOL CALL
            </span>
            <span className="text-[10px] font-mono text-dash-text-secondary">
              {message.toolCall.toolName}
            </span>
            <span className={cn(
              "ml-auto text-[9px] font-mono uppercase px-1.5 py-0.5 rounded",
              message.toolCall.status === "complete" && "text-dash-success bg-dash-success/10",
              message.toolCall.status === "running" && "text-dash-accent bg-dash-accent/10 animate-pulse",
              message.toolCall.status === "error" && "text-dash-error bg-dash-error/10",
            )}>
              {message.toolCall.status}
            </span>
          </div>
          <div className="px-3 py-2">
            <pre className="text-[11px] font-mono text-dash-text-secondary whitespace-pre-wrap break-all">
              {JSON.stringify(message.toolCall.params, null, 2)}
            </pre>
            {message.toolCall.result && (
              <div className="mt-2 pt-2 border-t border-dash-accent/20">
                <span className="text-[9px] font-mono uppercase text-dash-text-label">Result</span>
                <pre className="text-[11px] font-mono text-dash-text-primary mt-1 whitespace-pre-wrap break-all">
                  {message.toolCall.result}
                </pre>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

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
            "p-2 bg-dash-surface/30 rounded border border-dash-border"
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
                  <div className="flex items-center justify-between px-3 py-1 bg-dash-elevated border border-dash-border rounded-t text-[8px] font-mono text-dash-text-muted uppercase tracking-wider">
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
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.images.map((img, i) => (
              <div
                key={`${img.slice(-20)}-${i}`}
                className="w-20 h-20 rounded-md overflow-hidden border border-dash-border bg-dash-bg"
              >
                <img
                  src={img}
                  alt={`Message image ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
