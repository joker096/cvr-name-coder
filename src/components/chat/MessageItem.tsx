import { useState, useCallback, memo } from "react";
import { motion } from "motion/react";
import { User, Brain, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import type { Message } from "../../types/chat";
import { ReviewMessage } from "./ReviewMessage";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageItemProps {
  message: Message;
  agentLabel?: string | undefined;
  providerLabel?: string | undefined;
  modelName?: string | undefined;
  t: any;
}

const areEqual = (prev: MessageItemProps, next: MessageItemProps): boolean => {
  const pm = prev.message;
  const nm = next.message;
  return (
    pm.id === nm.id &&
    pm.role === nm.role &&
    pm.content === nm.content &&
    pm.reasoning === nm.reasoning &&
    pm.timestamp === nm.timestamp &&
    pm.tokenUsage?.input === nm.tokenUsage?.input &&
    pm.tokenUsage?.output === nm.tokenUsage?.output &&
    JSON.stringify(pm.images) === JSON.stringify(nm.images) &&
    JSON.stringify(pm.toolCall) === JSON.stringify(nm.toolCall) &&
    prev.agentLabel === next.agentLabel &&
    prev.providerLabel === next.providerLabel &&
    prev.modelName === next.modelName
  );
};

export const MessageItem = memo<MessageItemProps>(({
  message,
  agentLabel: _agentLabel,
  providerLabel,
  modelName,
  t,
}) => {
  const tt = t as Record<string, string>;
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);
  if (message.role === "review") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-0.5 sm:gap-3"
      >
        <span className="shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5 text-dash-accent">
          [{tt.reviewText?.toUpperCase() || "REVIEW"}]
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
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-0.5 sm:gap-3"
      >
        <span className="shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5 text-dash-accent">
          [{tt.toolsLabel?.toUpperCase() || "TOOL"}]
        </span>
        <div className="flex-1 card border-dash-accent/30 bg-dash-accent-soft/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-dash-accent/20">
            <svg className="w-3 h-3 text-dash-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
            <span className="text-[10px] font-mono uppercase tracking-wider text-dash-accent">
              {tt.toolCall || "TOOL CALL"}
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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 group"
    >
      <span
        className={cn(
          "shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right pt-0.5 flex items-center justify-end gap-1",
          message.role === "user" ? "text-dash-text-muted" : "text-dash-accent"
        )}
      >
        {message.role === "user" ? (
          <User className="w-3 h-3" />
        ) : (
          <Brain className="w-3 h-3" />
        )}
      </span>
      <div
        className={cn(
          "flex-1 prose prose-invert prose-sm max-w-none text-dash-text-primary text-[12px] leading-relaxed overflow-x-auto relative",
          message.role !== "user" &&
            "p-2 bg-dash-surface/30 rounded border border-dash-border"
        )}
      >
        {message.reasoning && message.role !== "user" && (
          <div className="mb-1 rounded border border-dash-accent/20 bg-dash-accent-soft/10 overflow-hidden">
            <button
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-dash-accent hover:bg-dash-accent-soft/10 transition-colors"
            >
              {thinkingExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {tt.thinkLabel || "Thoughts"}
            </button>
            {thinkingExpanded && (
              <div className="px-2 pb-1.5 text-[11px] text-dash-text-secondary leading-relaxed whitespace-pre-wrap border-t border-dash-accent/10">
                {message.reasoning}
              </div>
            )}
          </div>
        )}
        <MarkdownRenderer content={message.content} />
        {message.role !== "user" && (providerLabel || modelName || message.tokenUsage) && (
          <div className="mt-1.5 text-[9px] text-dash-text-label font-mono text-right leading-tight opacity-60 group-hover:opacity-100 transition-opacity">
            {providerLabel}{modelName && <span>/{modelName.split("/").pop()}</span>}
            {message.tokenUsage && (
              <span> · ↓{message.tokenUsage.input.toLocaleString()} ↑{message.tokenUsage.output.toLocaleString()} tok</span>
            )}
          </div>
        )}
        {message.role !== "user" && (
          <button
            onClick={handleCopy}
            className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-dash-hover transition-all text-dash-text-muted hover:text-dash-text-primary"
            title={copied ? (tt.copied || "Copied!") : (tt.copy || "Copy")}
          >
            {copied ? <Check className="w-3 h-3 text-dash-success" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
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
}, areEqual);
