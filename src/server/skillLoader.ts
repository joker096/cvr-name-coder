import { readdir, readFile } from "fs/promises";
import * as path from "path";
import type { SkillDefinition, SkillODMeta } from "../types/skill";

interface RawFrontmatter {
  id?: string;
  name?: string;
  description?: string;
  triggers?: string[];
  od?: SkillODMeta;
}

const SKILLS_DIR = path.resolve(process.cwd(), ".cvr", "skills");
let _skillsDir = SKILLS_DIR;
let _cache: SkillDefinition[] | null = null;
let _lastLoad = 0;

export function setSkillsDir(dir: string): void {
  _skillsDir = dir;
  _cache = null;
}

function parseFrontmatter(raw: string): { frontmatter: RawFrontmatter; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match || !match[1] || match[2] === undefined) {
    return { frontmatter: {}, body: raw };
  }
  const lines = match[1].split("\n");
  const frontmatter: RawFrontmatter = {};
  const odRaw: Record<string, string> = {};

  for (const line of lines) {
    const kv = line.match(/^([\w._-]+):\s*(.*)$/);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) {
      const key = kv[1];
      const val = kv[2].trim();
      if (key === "id" || key === "name" || key === "description") {
        (frontmatter as Record<string, unknown>)[key] = val;
      } else if (key === "triggers") {
        if (val.startsWith("[") && val.endsWith("]")) {
          try {
            frontmatter.triggers = JSON.parse(val) as string[];
          } catch {
            frontmatter.triggers = [];
          }
        }
      } else if (key.startsWith("od.")) {
        odRaw[key.slice(3)] = val;
      }
    }
  }

  if (Object.keys(odRaw).length > 0) {
    const od: SkillODMeta = {};
    if (odRaw.mode) od.mode = odRaw.mode;
    if (odRaw.platform) od.platform = odRaw.platform;
    if (odRaw.scenario) od.scenario = odRaw.scenario;
    if (odRaw["design_system.requires"]) {
      od.design_system = { requires: odRaw["design_system.requires"] === "true" };
    }
    if (odRaw["preview.type"]) {
      od.preview = { type: odRaw["preview.type"] };
      if (odRaw["preview.entry"]) od.preview.entry = odRaw["preview.entry"];
    }
    frontmatter.od = od;
  }

  return { frontmatter, body: match[2].trim() };
}

async function findSkillFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await findSkillFiles(fullPath);
        results.push(...sub);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore
  }
  return results;
}

export async function loadSkills(force = false): Promise<SkillDefinition[]> {
  if (!force && _cache && Date.now() - _lastLoad < 30_000) {
    return _cache;
  }

  try {
    const filePaths = await findSkillFiles(_skillsDir);
    const skills: SkillDefinition[] = [];

    for (const filePath of filePaths) {
      const raw = await readFile(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(raw);

      const relPath = path.relative(_skillsDir, filePath).replace(/\\/g, "/");
      const id = frontmatter.id ?? relPath.replace(/\.md$/, "");
      const newSkill: SkillDefinition = {
        id,
        name: frontmatter.name ?? id,
        description: frontmatter.description ?? "",
        triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
        content: body,
        filePath,
      };
      if (frontmatter.od) {
        newSkill.od = frontmatter.od;
      }
      skills.push(newSkill);
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
