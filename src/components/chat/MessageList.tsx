import React, { useEffect, useRef, memo, useMemo, useState } from "react";
import { MessageItem } from "./MessageItem";
import type { Message } from "../../types/chat";

interface MessageListProps {
  messages: Message[];
  agentLabel?: string | undefined;
  providerLabel?: string | undefined;
  modelName?: string | undefined;
  t: any;
  isLooming?: boolean;
  loadingText?: string | undefined;
}

export const MessageList: React.FC<MessageListProps> = memo(({
  messages,
  agentLabel,
  providerLabel,
  modelName,
  t,
  isLooming = false,
  loadingText,
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(messages.length);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  const VISIBLE_MESSAGE_COUNT = 50;
  const BUFFER_MESSAGE_COUNT = 10;

  const visibleMessages = useMemo(() => {
    if (messages.length <= VISIBLE_MESSAGE_COUNT) {
      return messages;
    }
    const { start, end } = visibleRange;
    return messages.slice(Math.max(0, start - BUFFER_MESSAGE_COUNT), Math.min(messages.length, end + BUFFER_MESSAGE_COUNT));
  }, [messages, visibleRange]);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (messages.length !== prevCount) {
      const raf = requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ block: "end" });
      });
      return () => cancelAnimationFrame(raf);
    }
    return;
  }, [messages, isLooming]);

  useEffect(() => {
    if (messages.length > VISIBLE_MESSAGE_COUNT) {
      setVisibleRange({ start: messages.length - VISIBLE_MESSAGE_COUNT, end: messages.length });
    }
  }, [messages.length]);

  if (messages.length === 0 && !isLooming) {
    return (
      <div className="flex-1 flex items-center justify-center text-dash-text-muted text-sm">
        <div className="text-center">
          <p className="text-xs opacity-60">{t.startConversation || "Start a conversation to begin"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
      {visibleMessages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
          agentLabel={agentLabel}
          providerLabel={providerLabel}
          modelName={modelName}
          t={t}
        />
      ))}
      {isLooming && (
        <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 animate-pulse">
          <span className="shrink-0 font-bold uppercase text-[10px] sm:text-[11px] sm:w-14 sm:text-right text-dash-accent pt-1">
            [{t.think || "THINK"}]
          </span>
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-dash-text-muted italic text-[10px] sm:text-[11px]">
                {loadingText || t.processing || "Processing..."}
              </span>
              <div className="flex gap-0.5">
                <span
                  className="w-1 h-1 bg-dash-accent rounded-full animate-bounce [animation-delay:-0.3s]"
                  aria-hidden="true"
                />
                <span
                  className="w-1 h-1 bg-dash-accent rounded-full animate-bounce [animation-delay:-0.15s]"
                  aria-hidden="true"
                />
                <span
                  className="w-1 h-1 bg-dash-accent rounded-full animate-bounce"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
});
