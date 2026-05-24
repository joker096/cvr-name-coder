import { readdir, readFile, access, writeFile, unlink, mkdir } from "fs/promises";
import * as path from "path";

const RULES_DIR = path.resolve(process.cwd(), ".cvr", "rules");
let _rulesDir = RULES_DIR;

/**
 * Sets the directory from which instruction rule files are loaded.
 * @param {string} dir - Absolute path to the rules directory.
 */
export function setRulesDir(dir: string): void {
  _rulesDir = dir;
}

/**
 * @interface InstructionFile
 * @description Represents a loaded instruction rule file with its metadata.
 */
export interface InstructionFile {
  /** Name of the instruction (derived from filename without .md extension) */
  name: string;
  /** Content of the instruction (markdown body without frontmatter) */
  content: string;
  /** Priority value parsed from frontmatter (higher = more important). Defaults to 0. */
  priority: number;
}

/**
 * Loads all instruction rule files from the rules directory.
 * Parses optional YAML frontmatter for priority, and sorts results by descending priority.
 * @returns {Promise<InstructionFile[]>} Array of instruction files sorted by priority (highest first).
 */
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

/**
 * Loads all instructions and formats them as a single context string for inclusion in system prompts.
 * @returns {Promise<string>} Formatted string of all instructions, or empty string if none found.
 */
export async function getInstructionsContext(): Promise<string> {
  const instructions = await loadInstructions();
  if (instructions.length === 0) return "";

  const parts = instructions.map((f) => `## ${f.name}\n${f.content}`);
  return `## USER RULES\n${parts.join("\n\n")}`;
}

/**
 * Saves an instruction rule file to the rules directory with optional priority frontmatter.
 * @param {string} name - The instruction name (used as filename without .md extension).
 * @param {string} content - The markdown content of the instruction.
 * @param {number} [priority=0] - Priority value written into YAML frontmatter.
 * @returns {Promise<void>} Resolves when the file has been written.
 */
export async function saveInstruction(name: string, content: string, priority: number = 0): Promise<void> {
  try { await access(_rulesDir); } catch { await mkdir(_rulesDir, { recursive: true }); }
  const frontmatter = `---\npriority: ${priority}\n---\n`;
  const filePath = path.join(_rulesDir, `${name}.md`);
  await writeFile(filePath, frontmatter + content, "utf-8");
}

/**
 * Deletes an instruction rule file from the rules directory.
 * @param {string} name - The instruction name (filename without .md extension).
 * @returns {Promise<void>} Resolves when the file has been deleted (silently ignores missing files).
 */
export async function deleteInstruction(name: string): Promise<void> {
  try {
    const filePath = path.join(_rulesDir, `${name}.md`);
    await unlink(filePath);
  } catch {
    // File may not exist
  }
}
