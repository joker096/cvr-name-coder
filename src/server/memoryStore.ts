import { readFile, writeFile, access, rename, stat } from "fs/promises";
import * as path from "path";

let _memoryDir = path.resolve(process.cwd(), ".opencode-infinite");

let _memCache: { data: MemoryData; mtime: number } | null = null;
let _userCache: { data: MemoryData; mtime: number } | null = null;
let _contextCache: string | null = null;
let _contextTimestamp = 0;

export function setMemoryDir(dir: string): void {
  _memoryDir = dir;
  _memCache = null;
  _userCache = null;
  _contextCache = null;
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
    const current = await readFile(filePath, "utf-8");
    const oldDefault = `# Project Memory\n\n## Project Facts\n\n## Architecture Decisions\n\n## Code Patterns\n\n## Known Issues\n`;
    const oldUserDefault = `# User Preferences\n\n## Coding Style\n\n## Tech Stack Preferences\n\n## Communication Preferences\n`;
    if (current.trim() === oldDefault.trim() || current.trim() === oldUserDefault.trim()) {
      await writeFile(filePath, defaultContent, "utf-8");
    }
  } catch {
    await writeFile(filePath, defaultContent, "utf-8");
  }
}

export async function readMemory(): Promise<MemoryData> {
  const memoryPath = getMemoryPath();
  await ensureFile(
    memoryPath,
    `# Project Memory

## Project Overview
- **Name:** cvr.name.coder
- **Type:** VS Code Extension / AI Coding Agent
- **Stack:** TypeScript, React, Express, Vite
- **Description:** Autonomous AI coding agent with multi-provider support, streaming responses, persistent memory, and skills system.

## Architecture
- Dual entry points: \`server.ts\` (standalone) and \`vscode/src/extension.ts\` (VS Code extension)
- Shared code in \`src/server/\` directory
- Frontend: React with Vite, components in \`src/components/\`
- AI providers: Gemini, OpenAI, Anthropic, DeepSeek, Groq, local LLMs
- Memory system: MEMORY.md / USER.md with auto-compression

## Key Files
| File | Purpose |
|------|---------|
| \`server.ts\` | Standalone Express server |
| \`vscode/src/extension.ts\` | VS Code extension entry |
| \`src/server/tools.ts\` | Tool execution logic |
| \`src/server/prompts.ts\` | System prompt builder |
| \`src/server/agentLoop.ts\` | Autonomous agent loop |
| \`src/hooks/useChat.ts\` | Chat state management |
| \`src/App.tsx\` | Main UI component |

## Code Patterns
- TypeScript strict mode, no \`any\` types
- React functional components with hooks
- Zod for runtime validation
- SSE for streaming responses
- Atomic file writes via temp files

## Known Issues
- Some tests are flaky (network-dependent)
- Duplicate code patterns being migrated to shared modules
- Memory compression threshold may need tuning

## Commands
- \`npm run dev\` — Start dev server
- \`npm test\` — Run tests
- \`npm run type-check\` — TypeScript validation
- \`npm run build\` — Production build
`
  );

  if (_memCache &&
    _memCache.mtime === (await stat(memoryPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs) {
    return _memCache.data;
  }

  const raw = await readFile(memoryPath, "utf-8");
  const data = parseMemoryMarkdown(raw);
  _memCache = { data, mtime: (await stat(memoryPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs };
  return data;
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
  _memCache = null;
  _contextCache = null;
}

export async function replaceMemorySection(section: string, lines: string[]): Promise<void> {
  const data = await readMemory();
  const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
  if (target) {
    target.lines = lines.filter((l) => l.trim() !== "");
  } else {
    data.sections.push({ title: section, lines: lines.filter((l) => l.trim() !== "") });
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
  _memCache = null;
  _contextCache = null;
}

export async function deleteMemorySection(section: string): Promise<void> {
  const data = await readMemory();
  data.sections = data.sections.filter((s) => s.title.toLowerCase() !== section.toLowerCase());
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getMemoryPath(), raw);
  _memCache = null;
  _contextCache = null;
}

export async function readUser(): Promise<MemoryData> {
  const userPath = getUserPath();
  await ensureFile(
    userPath,
    `# User Preferences

## Coding Style
- Use TypeScript strict mode
- Prefer functional React components with hooks
- Use \`cn()\` utility for conditional CSS classes
- Follow existing code patterns in the project
- No unnecessary comments — code should be self-documenting
- Use Zod for runtime validation of API inputs

## Tech Stack Preferences
- TypeScript 5.x with ES modules
- React 18+ with functional components
- Express.js for backend APIs
- Vite for frontend bundling
- Vitest for testing (not Jest)
- TailwindCSS for styling (via utility classes)

## Communication Preferences
- Be concise — answer in 1-3 sentences when possible
- Use Russian when communicating with the user
- Show code changes before applying them
- Run type-check (\`npx tsc --noEmit\`) after each change
- Delete precompiled .js/.d.ts files in src/ — let Vite compile .tsx directly

## Common Tasks
- \`npm run type-check\` — verify TypeScript
- \`npm test\` — run test suite
- \`npm run dev\` — start development server
`
  );

  if (_userCache &&
    _userCache.mtime === (await stat(userPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs) {
    return _userCache.data;
  }

  const raw = await readFile(userPath, "utf-8");
  const data = parseMemoryMarkdown(raw);
  _userCache = { data, mtime: (await stat(userPath).catch(() => ({ mtimeMs: 0 }))).mtimeMs };
  return data;
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
  _userCache = null;
  _contextCache = null;
}

export async function replaceUserSection(section: string, lines: string[]): Promise<void> {
  const data = await readUser();
  const target = data.sections.find((s) => s.title.toLowerCase() === section.toLowerCase());
  if (target) {
    target.lines = lines.filter((l) => l.trim() !== "");
  } else {
    data.sections.push({ title: section, lines: lines.filter((l) => l.trim() !== "") });
  }
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
  _userCache = null;
  _contextCache = null;
}

export async function deleteUserSection(section: string): Promise<void> {
  const data = await readUser();
  data.sections = data.sections.filter((s) => s.title.toLowerCase() !== section.toLowerCase());
  const raw = rebuildMarkdown(data.sections);
  await atomicWriteFile(getUserPath(), raw);
  _userCache = null;
  _contextCache = null;
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
  if (_contextCache && Date.now() - _contextTimestamp < 10000) return _contextCache;

  const [memory, user] = await Promise.all([readMemory(), readUser()]);

  const parts: string[] = [];

  if (memory.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## Project Memory\n" + memory.raw.replace(/^# Project Memory\n?/i, "").trim());
  }

  if (user.sections.some((s) => s.lines.some((l) => l.trim() !== ""))) {
    parts.push("## User Preferences\n" + user.raw.replace(/^# User Preferences\n?/i, "").trim());
  }

  _contextCache = parts.join("\n\n---\n\n");
  _contextTimestamp = Date.now();
  return _contextCache;
}
