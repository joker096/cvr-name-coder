import type { IconType } from './ai';
import type { MessageId, MemoryId, SkillId, AgentId } from './ai';
import type { ReviewComment } from '../server/codeReview';

export interface ToolCall {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  status: 'running' | 'complete' | 'error';
  result?: string;
}

export interface TokenUsage {
  input: number;
  output: number;
  cost?: string;
}

// Message with branded ID
export interface Message {
  id: MessageId;
  role: 'user' | 'model' | 'assistant' | 'review' | 'tool_call';
  content: string;
  reasoning?: string | undefined;
  images?: string[] | undefined;
  timestamp: number;
  reviewData?: {
    comments: ReviewComment[];
    summary: string;
  };
  toolCall?: ToolCall;
  tokenUsage?: TokenUsage;
  provider?: string;
  modelName?: string;
}

// Memory with branded ID
export interface Memory {
  id: MemoryId;
  content: string;
  timestamp: number;
}

// Skill with branded ID and proper icon type
export interface Skill {
  id: SkillId;
  name: string;
  description: string;
  icon: IconType;
  status: 'learned' | 'available';
  category: 'research' | 'devops' | 'content' | 'knowledge';
}

// Agent with branded ID and proper icon type
export interface Agent {
  id: AgentId;
  label: string;
  role: string;
  icon: IconType;
  color: string;
  tools: string;
  autonomy: string;
}

// Chat state as discriminated union
export type ChatStateIdle = {
  status: 'idle';
};

export type ChatStateLoading = {
  status: 'loading';
  provider: string;
};

export type ChatStateStreaming = {
  status: 'streaming';
  provider: string;
  content: string;
};

export type ChatStateError = {
  status: 'error';
  error: string;
};

export type ChatState = ChatStateIdle | ChatStateLoading | ChatStateStreaming | ChatStateError;

// Type guards for chat state
export const isIdleState = (state: ChatState): state is ChatStateIdle => {
  return state.status === 'idle';
};

export const isLoadingState = (state: ChatState): state is ChatStateLoading => {
  return state.status === 'loading';
};

export const isStreamingState = (state: ChatState): state is ChatStateStreaming => {
  return state.status === 'streaming';
};

export const isErrorState = (state: ChatState): state is ChatStateError => {
  return state.status === 'error';
};
