import { memo } from "react";
import { AlertCircle } from "lucide-react";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import type { Message } from "../../types/chat";
import { cn } from "../../utils/cn";

interface ChatContainerProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (images?: string[]) => void;
  onCancelMessage?: (() => void) | undefined;
  isLooming?: boolean;
  error?: string | null;
  agentLabel?: string | undefined;
  providerLabel?: string | undefined;
  modelName?: string | undefined;
  t: any;
  lang?: string;
  loadingText?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean;
  className?: string;
  voiceEnabled?: boolean | undefined;
  voiceLanguage?: string | undefined;
  voiceAutoSend?: boolean | undefined;
  visionEnabled?: boolean | undefined;
}

export const ChatContainer = memo<ChatContainerProps>(({
  messages,
  input,
  onInputChange,
  onSendMessage,
  onCancelMessage,
  isLooming = false,
  error,
  agentLabel,
  providerLabel,
  modelName,
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
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      <MessageList
        messages={messages}
        agentLabel={agentLabel}
        providerLabel={providerLabel}
        modelName={modelName}
        t={t}
        isLooming={isLooming}
        loadingText={loadingText}
      />
      {error && (
        <div className="mx-2 mb-1 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-[11px] text-red-400 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
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
});
