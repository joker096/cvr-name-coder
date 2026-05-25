import type { Provider } from "../components/settings/ProviderSelector";
import { toChatProviderId } from "../types/ai";

export const AI_PROVIDERS: Provider[] = [
  { id: toChatProviderId("gemini"), icon: { type: "lucide", name: "sparkles" }, label: "Google Gemini", type: "cloud" },
  { id: toChatProviderId("openai"), icon: { type: "lucide", name: "bot" }, label: "OpenAI", type: "cloud" },
  { id: toChatProviderId("anthropic"), icon: { type: "lucide", name: "brain" }, label: "Anthropic", type: "cloud" },
  { id: toChatProviderId("deepseek"), icon: { type: "lucide", name: "search" }, label: "DeepSeek", type: "cloud" },
  { id: toChatProviderId("grok"), icon: { type: "lucide", name: "zap" }, label: "Grok", type: "cloud" },
  { id: toChatProviderId("groq"), icon: { type: "lucide", name: "cpu" }, label: "Groq", type: "cloud" },
  { id: toChatProviderId("baseten"), icon: { type: "lucide", name: "box" }, label: "Baseten", type: "cloud" },
  { id: toChatProviderId("openrouter"), icon: { type: "lucide", name: "router" }, label: "OpenRouter", type: "cloud" },
  { id: toChatProviderId("together"), icon: { type: "lucide", name: "users" }, label: "Together AI", type: "cloud" },
  { id: toChatProviderId("mistral"), icon: { type: "lucide", name: "wind" }, label: "Mistral AI", type: "cloud" },
  { id: toChatProviderId("local"), icon: { type: "lucide", name: "server" }, label: "Local", type: "local" },
  { id: toChatProviderId("custom"), icon: { type: "lucide", name: "settings" }, label: "Custom", type: "cloud" },
];