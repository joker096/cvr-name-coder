import { Wand2, MessageSquare, GitBranch, BookOpen, Clock, Puzzle, Scale, RefreshCw } from "lucide-react";

export type SectionKey = "skills" | "sessions" | "git" | "memory" | "cron" | "plugins" | "rules" | "sync";

export interface SectionDef {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  help?: string;
}

export const SECTIONS_CONFIG: Omit<SectionDef, "label" | "help" | "count">[] = [
  { key: "skills", icon: Wand2 },
  { key: "sessions", icon: MessageSquare },
  { key: "git", icon: GitBranch },
  { key: "memory", icon: BookOpen },
  { key: "cron", icon: Clock },
  { key: "plugins", icon: Puzzle },
  { key: "rules", icon: Scale },
  { key: "sync", icon: RefreshCw },
];