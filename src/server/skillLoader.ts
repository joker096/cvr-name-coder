import { readdir, readFile } from "fs/promises";
import * as path from "path";
import type { SkillDefinition } from "../types/skill";

const SKILLS_DIR = path.resolve(process.cwd(), ".cvr", "skills");
let _skillsDir = SKILLS_DIR;
let _cache: SkillDefinition[] | null = null;
let _lastLoad = 0;

export function setSkillsDir(dir: string): void {
  _skillsDir = dir;
  _cache = null;
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, any>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match || !match[1] || match[2] === undefined) {
    return { frontmatter: {}, body: raw };
  }
  const lines = match[1].split("\n");
  const frontmatter: Record<string, any> = {};
  for (const line of lines) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) {
      const key = kv[1];
      const val = kv[2].trim();
      if (val.startsWith("[") && val.endsWith("]")) {
        try {
          frontmatter[key] = JSON.parse(val);
        } catch {
          frontmatter[key] = val;
        }
      } else {
        frontmatter[key] = val;
      }
    }
  }
  return { frontmatter, body: match[2].trim() };
}

export async function loadSkills(force = false): Promise<SkillDefinition[]> {
  if (!force && _cache && Date.now() - _lastLoad < 30_000) {
    return _cache;
  }

  try {
    const entries = await readdir(_skillsDir, { withFileTypes: true });
    const skills: SkillDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = path.join(_skillsDir, entry.name);
      const raw = await readFile(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(raw);

      const id = frontmatter.id || entry.name.replace(/\.md$/, "");
      skills.push({
        id,
        name: frontmatter.name || id,
        description: frontmatter.description || "",
        triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
        content: body,
        filePath,
      });
    }

    _cache = skills;
    _lastLoad = Date.now();
    return skills;
  } catch {
    _cache = [];
    _lastLoad = Date.now();
    return [];
  }
}

export async function getSkillById(id: string): Promise<SkillDefinition | undefined> {
  const skills = await loadSkills();
  return skills.find((s) => s.id === id);
}

export async function matchSkillsByTrigger(text: string): Promise<SkillDefinition[]> {
  const skills = await loadSkills();
  const lower = text.toLowerCase();
  return skills.filter((s) => s.triggers.some((t) => lower.includes(t.toLowerCase())));
}
