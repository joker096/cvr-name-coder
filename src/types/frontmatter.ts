export interface SkillFrontmatter {
  id?: string;
  name?: string;
  description?: string;
  triggers?: string[];
  priority?: number;
}

export interface AgentFrontmatter {
  id?: string;
  triggers?: string[];
  priority?: number;
}

export interface ParsedFrontmatter<T = SkillFrontmatter> {
  frontmatter: T;
  body: string;
}

export function isSkillFrontmatter(obj: unknown): obj is SkillFrontmatter {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    (o.id === undefined || typeof o.id === "string") &&
    (o.name === undefined || typeof o.name === "string") &&
    (o.description === undefined || typeof o.description === "string") &&
    (o.triggers === undefined || Array.isArray(o.triggers)) &&
    (o.priority === undefined || typeof o.priority === "number")
  );
}

export function isAgentFrontmatter(obj: unknown): obj is AgentFrontmatter {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    (o.id === undefined || typeof o.id === "string") &&
    (o.triggers === undefined || Array.isArray(o.triggers)) &&
    (o.priority === undefined || typeof o.priority === "number")
  );
}
