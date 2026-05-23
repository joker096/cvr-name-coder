import React, { useEffect, useRef } from "react";
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

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  agentLabel,
  providerLabel,
  modelName,
  t,
  isLooming = false,
  loadingText,
}) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isLooming]);

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
      {messages.map((message, index) => (
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
};
