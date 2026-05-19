import { readFile, writeFile, access, rename } from "fs/promises";
import * as path from "path";

let _memoryDir = path.resolve(process.cwd(), ".opencode-infinite");

export function setMemoryDir(dir: string): void {
  _memoryDir = dir;
}

function getMemoryPath(): string { return path.join(_memoryDir, "MEMORY.md"); }
function getUserPath(): string { return path.join(_memoryDir, "USER.md"); }

export interface MemorySection {
  title: string;
  lines: string[];
}

export interface MemoryData {
  sections: MemorySection[];
  raw: string;
}

function parseMemoryMarkdown(raw: string): MemoryData {
  const sections: MemorySection[] = [];
  const lines = raw.split("\n");
  let current: MemorySection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch && headingMatch[2]) {
      if (current) sections.push(current);
      current = { title: headingMatch[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return { sections, raw };
}

async function ensureFile(filePath: string, defaultContent: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, defaultContent, "utf-8");
  }
}

export async function readMemory(): Promise<MemoryData> {
  const memoryPath = getMemoryPath();
  await ensureFile(
    memoryPath,
    `# Project Memory\n\n## Project Facts\n\n## Architecture Decisions\n\n## Code Patterns\n\n## Known Issues\n`
  );
  const raw = await readFile(memoryPath, "utf-8");
  return parseMemoryMarkdown(raw);
}

export async function writeMemory(content: string, section?: string): Promise<void> {
  const data = await readMemory();
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `- [${timestamp}] ${content}`;

  if (section) {
    const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
    if (target) {
      target.lines.push(entry);
    } else {
      data.sections.push({ title: section, lines: [entry] });
    }
  } else {
    // Default to Project Facts
    const facts = data.sections.find((s) => s.title.toLowerCase() === "project facts");
    if (facts) {
      facts.lines.push(entry);
    } else {
      data.sections.push({ title: "Project Facts", lines: [entry] });
    }
  }

  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
}

export async function readUser(): Promise<MemoryData> {
  const userPath = getUserPath();
  await ensureFile(
    userPath,
    `# User Preferences\n\n## Coding Style\n\n## Tech Stack Preferences\n\n## Communication Preferences\n`
  );
  const raw = await readFile(userPath, "utf-8");
  return parseMemoryMarkdown(raw);
}

export async function writeUser(content: string, section?: string): Promise<void> {
  const data = await readUser();
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `- [${timestamp}] ${content}`;

  if (section) {
    const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
    if (target) {
      target.lines.push(entry);
    } else {
      data.sections.push({ title: section, lines: [entry] });
    }
  } else {
    const style = data.sections.find((s) => s.title.toLowerCase() === "coding style");
    if (style) {
      style.lines.push(entry);
    } else {
      data.sections.push({ title: "Coding Style", lines: [entry] });
    }
  }

  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
}

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmp = filePath + ".tmp";
  await writeFile(tmp, content, "utf-8");
  await rename(tmp, filePath);
}

function rebuildMarkdown(sections: MemorySection[]): string {
  const lines: string[] = ["# Project Memory\n"];
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    lines.push(...section.lines.filter((l) => l.trim() !== ""));
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}

export async function getMemoryContext(): Promise<string> {
  const [memory, user] = await Promise.all([readMemory(), readUser()]);

  const parts: string[] = [];

  if (memory.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## Project Memory\n" + memory.raw.replace(/^# Project Memory\n?/i, "").trim());
  }

  if (user.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## User Preferences\n" + user.raw.replace(/^# User Preferences\n?/i, "").trim());
  }

  return parts.join("\n\n---\n\n");
}
