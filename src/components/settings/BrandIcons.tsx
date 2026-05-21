import React from "react";
import {
  siGoogle,
  siAnthropic,
  siDeepseek,
  siX,
  siMistralai,
  siOpenrouter,
  siOllama,
} from "simple-icons";
import type { ChatProviderId } from "../../types/settings";

interface SimpleIcon {
  path: string;
  hex: string;
}

const BRAND_ICONS: Record<string, SimpleIcon> = {
  gemini: siGoogle as SimpleIcon,
  anthropic: siAnthropic as SimpleIcon,
  deepseek: siDeepseek as SimpleIcon,
  grok: siX as SimpleIcon,
  mistral: siMistralai as SimpleIcon,
  openrouter: siOpenrouter as SimpleIcon,
  local: siOllama as SimpleIcon,
};

function BrandSvg({ icon, size = 20 }: { icon: SimpleIcon; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#FFFFFF"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
}

function OpenAIIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.5 9.5a2.5 2.5 0 0 0-2.5-2.5h-4l.08-.4A2.5 2.5 0 0 0 12.7 3.7l-.2.08a2.5 2.5 0 0 0-1.6 2.33v.39l-.2.5a7 7 0 0 1-5.2 4.5l-.2.04A2.5 2.5 0 0 0 3 14.04v.16A2.5 2.5 0 0 0 5.3 16.5h4.2l.5 1.3a7 7 0 0 1-1 6.2 2.5 2.5 0 0 0 3.5 3l.3-.3a2.5 2.5 0 0 0 .7-1.7v-.3l.5-1a7 7 0 0 1 6.5-3.8l.3.02A2.5 2.5 0 0 0 23 17a2.5 2.5 0 0 0-1.5-2.3l-.3-.13-2-1 2-1 .3-.12A2.5 2.5 0 0 0 21.5 9.5Z" fill="currentColor" />
    </svg>
  );
}

function GroqIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BasetenIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M8 16V8l4 5 4-5v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TogetherIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CustomIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2l2.8-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

const CUSTOM_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  openai: OpenAIIcon,
  groq: GroqIcon,
  baseten: BasetenIcon,
  together: TogetherIcon,
  custom: CustomIcon,
};

export function BrandIcon({
  provider,
  size = 20,
}: {
  provider: ChatProviderId;
  size?: number;
}) {
  const simpleIcon = BRAND_ICONS[provider];
  if (simpleIcon) {
    return <BrandSvg icon={simpleIcon} size={size} />;
  }
  const CustomComp = CUSTOM_ICONS[provider];
  if (CustomComp) {
    return <CustomComp size={size} />;
  }
  return <CustomIcon size={size} />;
}

export const BRAND_COLORS: Record<string, string> = {
  gemini: "#4285F4",
  openai: "#10A37F",
  anthropic: "#D4A574",
  deepseek: "#4D6BFE",
  grok: "#FFFFFF",
  groq: "#F55036",
  baseten: "#7C3AED",
  openrouter: "#6366F1",
  together: "#0FA5E9",
  mistral: "#F90",
  local: "#FFFFFF",
  custom: "#A0A0A0",
};
