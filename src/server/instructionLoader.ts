import { readdir, readFile, access } from "fs/promises";
import * as path from "path";

const RULES_DIR = path.resolve(process.cwd(), ".cvr", "rules");
let _rulesDir = RULES_DIR;

export function setRulesDir(dir: string): void {
  _rulesDir = dir;
}

export interface InstructionFile {
  name: string;
  content: string;
  priority: number;
}

export async function loadInstructions(): Promise<InstructionFile[]> {
  try {
    await access(_rulesDir);
  } catch {
    return [];
  }

  const entries = await readdir(_rulesDir, { withFileTypes: true });
  const files: InstructionFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const filePath = path.join(_rulesDir, entry.name);
    const raw = await readFile(filePath, "utf-8");

    // Parse optional priority from frontmatter
    let priority = 0;
    const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontmatterMatch && frontmatterMatch[1] !== undefined) {
      const priorityMatch = frontmatterMatch[1].match(/priority:\s*(\d+)/);
      if (priorityMatch && priorityMatch[1] !== undefined) priority = parseInt(priorityMatch[1], 10);
    }

    const content = frontmatterMatch ? raw.slice(frontmatterMatch[0].length).trim() : raw.trim();

    files.push({
      name: entry.name.replace(/\.md$/, ""),
      content,
      priority,
    });
  }

  return files.sort((a, b) => b.priority - a.priority);
}

export async function getInstructionsContext(): Promise<string> {
  const instructions = await loadInstructions();
  if (instructions.length === 0) return "";

  const parts = instructions.map((f) => `## ${f.name}\n${f.content}`);
  return `## USER RULES\n${parts.join("\n\n")}`;
}
