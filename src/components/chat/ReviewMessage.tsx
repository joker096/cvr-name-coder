import React, { useState } from "react";
import { motion } from "motion/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "../../utils/cn";
import type { Message } from "../../types/chat";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Check,
  X,
  GitPullRequest,
  FileCode,
  ShieldAlert,
  Zap,
  LayoutTemplate,
  Paintbrush,
} from "lucide-react";

interface ReviewMessageProps {
  message: Message;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertOctagon,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    label: "CRITICAL",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    label: "WARNING",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    label: "INFO",
  },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  style: { icon: Paintbrush, color: "text-pink-400", label: "STYLE" },
  bug: { icon: ShieldAlert, color: "text-red-400", label: "BUG" },
  security: { icon: ShieldAlert, color: "text-orange-400", label: "SECURITY" },
  performance: { icon: Zap, color: "text-yellow-400", label: "PERFORMANCE" },
  architecture: { icon: LayoutTemplate, color: "text-purple-400", label: "ARCHITECTURE" },
};

export const ReviewMessage: React.FC<ReviewMessageProps> = ({ message }) => {
  const reviewData = message.reviewData;
  if (!reviewData) return null;

  const { comments, summary } = reviewData;
  const [localComments, setLocalComments] = useState(comments);

  const handleAccept = async (commentId: string) => {
    setLocalComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, accepted: true } : c))
    );
  };

  const handleReject = async (commentId: string) => {
    setLocalComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, accepted: false } : c))
    );
  };

  const acceptedCount = localComments.filter((c) => c.accepted === true).length;
  const rejectedCount = localComments.filter((c) => c.accepted === false).length;
  const pendingCount = localComments.filter((c) => c.accepted === null).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-dash-card/50 rounded border border-dash-border">
        <GitPullRequest className="w-4 h-4 text-dash-accent" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-dash-accent">
          Code Review
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {acceptedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <Check className="w-3 h-3" /> {acceptedCount}
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
              <X className="w-3 h-3" /> {rejectedCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" /> {pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="px-2 py-1.5 text-[12px] text-dash-text-secondary italic border-l-2 border-dash-accent bg-dash-card/20">
        {summary}
      </div>

      {/* Comments */}
      <div className="space-y-2">
        {localComments.map((comment) => {
          const severity = SEVERITY_CONFIG[comment.severity] || SEVERITY_CONFIG.info;
          const category = CATEGORY_CONFIG[comment.category] || { icon: Info, color: "text-gray-400", label: "NOTE" };
          const SeverityIcon = severity.icon;
          const CategoryIcon = category.icon;
          const isResolved = comment.accepted !== null;

          return (
            <motion.div
              key={comment.id}
              layout
              className={cn(
                "rounded border overflow-hidden transition-opacity",
                severity.border,
                isResolved && comment.accepted === true && "border-emerald-500/30 opacity-70",
                isResolved && comment.accepted === false && "border-red-500/30 opacity-50 line-through",
                !isResolved && severity.bg
              )}
            >
              {/* Comment Header */}
              <div className={cn("flex items-center gap-2 px-2 py-1", severity.bg)}>
                <SeverityIcon className={cn("w-3.5 h-3.5", severity.color)} />
                <span className={cn("text-[10px] font-mono uppercase", severity.color)}>
                  {severity.label}
                </span>
                <span className="text-dash-text-muted">·</span>
                <CategoryIcon className={cn("w-3 h-3", category.color)} />
                <span className={cn("text-[10px] font-mono uppercase", category.color)}>
                  {category.label}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <FileCode className="w-3 h-3 text-dash-text-muted" />
                  <span className="text-[10px] font-mono text-dash-text-muted truncate max-w-[120px]">
                    {comment.file}
                  </span>
                  {comment.lineStart && (
                    <span className="text-[10px] font-mono text-dash-text-muted">
                      :{comment.lineStart}
                      {comment.lineEnd && comment.lineEnd !== comment.lineStart ? `-${comment.lineEnd}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment Body */}
              <div className="px-2 py-2 space-y-2">
                <p className="text-[12px] text-dash-text-primary leading-relaxed">
                  {comment.message}
                </p>

                {comment.suggestion && (
                  <div className="border-l-2 border-dash-accent pl-2">
                    <p className="text-[10px] font-mono text-dash-accent uppercase tracking-wider mb-1">
                      Suggestion
                    </p>
                    <p className="text-[11px] text-dash-text-secondary">
                      {comment.suggestion}
                    </p>
                  </div>
                )}

                {comment.codeExample && (
                  <div className="relative group">
                    <div className="flex items-center justify-between px-2 py-0.5 bg-dash-header border border-dash-border rounded-t text-[8px] font-mono text-dash-text-muted uppercase tracking-wider">
                      <span>suggested fix</span>
                    </div>
                    <SyntaxHighlighter
                      language="typescript"
                      style={oneDark}
                      customStyle={{
                        margin: 0,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        fontSize: "11px",
                        background: "#1A1A1E",
                      }}
                    >
                      {comment.codeExample}
                    </SyntaxHighlighter>
                  </div>
                )}

                {/* Actions */}
                {!isResolved && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAccept(comment.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/30"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={() => handleReject(comment.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/30"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
                {comment.accepted === true && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <Check className="w-3 h-3" /> Accepted
                  </div>
                )}
                {comment.accepted === false && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-red-400">
                    <X className="w-3 h-3" /> Rejected
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {localComments.length === 0 && (
        <div className="text-center py-4 text-[11px] text-dash-text-muted">
          No review comments found.
        </div>
      )}
    </motion.div>
  );
};
