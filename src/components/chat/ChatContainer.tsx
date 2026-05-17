import React from "react";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import type { Message } from "../../types/chat";

interface ChatContainerProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onCancelMessage?: () => void;
  isLooming?: boolean;
  agentLabel?: string;
  t: any;
  lang?: string;
  loadingText?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onCancelMessage,
  isLooming = false,
  agentLabel,
  t,
  lang = "en",
  loadingText,
  placeholder,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <MessageList
        messages={messages}
        agentLabel={agentLabel}
        t={t}
        isLooming={isLooming}
        loadingText={loadingText}
      />
      <div className="border-t border-dash-border p-2 bg-dash-bg">
        <InputArea
          value={input}
          onChange={onInputChange}
          onSend={onSendMessage}
          onCancel={onCancelMessage}
          isLooming={isLooming}
          placeholder={placeholder || t.promptPlaceholder}
          lang={lang}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
