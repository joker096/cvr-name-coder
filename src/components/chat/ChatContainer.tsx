import React from "react";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import type { Message } from "../../types/chat";

interface ChatContainerProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (images?: string[]) => void;
  onCancelMessage?: (() => void) | undefined;
  isLooming?: boolean;
  agentLabel?: string | undefined;
  t: any;
  lang?: string;
  loadingText?: string | undefined;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  voiceEnabled?: boolean | undefined;
  voiceLanguage?: string | undefined;
  voiceAutoSend?: boolean | undefined;
  visionEnabled?: boolean | undefined;
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
  voiceEnabled,
  voiceLanguage,
  voiceAutoSend,
  visionEnabled,
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
      <div className="border-t border-dash-border p-1.5 bg-dash-bg">
        <InputArea
          value={input}
          onChange={onInputChange}
          onSend={onSendMessage}
          onCancel={onCancelMessage}
          isLooming={isLooming}
          placeholder={placeholder || t.promptPlaceholder}
          lang={lang}
          disabled={disabled}
          voiceEnabled={voiceEnabled}
          voiceLanguage={voiceLanguage}
          voiceAutoSend={voiceAutoSend}
          visionEnabled={visionEnabled}
          t={t}
        />
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
