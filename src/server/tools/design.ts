import type { ToolResult } from "../../types/tools";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";

const DESIGN_SYSTEMS_DIR = path.resolve(process.cwd(), ".cvr", "design-systems");
const ACTIVE_DESIGN_FILE = path.resolve(process.cwd(), ".cvr", "design-active.json");

let _designSysDir = DESIGN_SYSTEMS_DIR;

export function setDesignSystemsDir(dir: string): void {
  _designSysDir = dir;
}

interface DesignSystemMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  path: string;
}

function parseDesignName(content: string): { name: string; category: string; description: string } {
  const lines = content.split("\n");
  let name = "";
  let category = "Other";
  let description = "";

  for (const line of lines) {
    if (line.startsWith("# ")) {
      name = line.replace(/^# /, "").trim();
    } else if (line.startsWith("> Category:")) {
      category = line.replace(/^> Category:\s*/, "").trim();
    } else if (name && line.trim() && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("|") && !description) {
      description = line.trim();
    }
  }

  return { name: name || "Unknown", category, description: description || "No description available" };
}

async function findDesignSystems(): Promise<DesignSystemMeta[]> {
  const results: DesignSystemMeta[] = [];
  try {
    const entries = await readdir(_designSysDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const designMdPath = path.join(_designSysDir, entry.name, "DESIGN.md");
        if (existsSync(designMdPath)) {
          const content = await readFile(designMdPath, "utf-8");
          const { name, category, description } = parseDesignName(content);
          results.push({
            id: entry.name,
            name,
            category,
            description,
            path: designMdPath,
          });
        }
      }
    }
  } catch {
    // dir doesn't exist yet
  }
  return results;
}

async function getDesignSystem(id: string): Promise<DesignSystemMeta | undefined> {
  const systems = await findDesignSystems();
  return systems.find((s) => s.id === id);
}

export async function executeDesignList(params: Record<string, unknown>): Promise<ToolResult> {
  const categoryFilter = params.category ? String(params.category).toLowerCase() : undefined;
  const systems = await findDesignSystems();

  let filtered = systems;
  if (categoryFilter) {
    filtered = systems.filter((s) => s.category.toLowerCase().includes(categoryFilter));
  }

  if (filtered.length === 0) {
    return {
      success: true,
      output: JSON.stringify({ systems: [], message: "No design systems found. Add DESIGN.md files to .cvr/design-systems/<id>/ to create design systems." }, null, 2),
    };
  }

  const output = filtered.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
  }));

  return { success: true, output: JSON.stringify({ systems: output, count: output.length }, null, 2) };
}

export async function executeDesignApply(params: Record<string, unknown>): Promise<ToolResult> {
  const designId = String(params.id);
  const system = await getDesignSystem(designId);

  if (!system) {
    const available = await findDesignSystems();
    const ids = available.map((s) => s.id).join(", ");
    return {
      success: false,
      output: "",
      error: `Design system not found: "${designId}". Available: ${ids || "none"}`,
    };
  }

  const content = await readFile(system.path, "utf-8");

  await mkdir(path.dirname(ACTIVE_DESIGN_FILE), { recursive: true });
  await writeFile(ACTIVE_DESIGN_FILE, JSON.stringify({
    active: designId,
    name: system.name,
    appliedAt: new Date().toISOString(),
  }, null, 2), "utf-8");

  return {
    success: true,
    output: `# Design System Active: ${system.name} (${system.category})\n\n${content}\n\n---\nAll generated HTML/CSS MUST follow this design system exactly. Use the colors, typography, spacing, and component patterns defined above.`,
  };
}

export async function executeDesignPreview(params: Record<string, unknown>): Promise<ToolResult> {
  const designId = String(params.id);
  const system = await getDesignSystem(designId);

  if (!system) {
    const available = await findDesignSystems();
    const ids = available.map((s) => s.id).join(", ");
    return {
      success: false,
      output: "",
      error: `Design system not found: "${designId}". Available: ${ids || "none"}`,
    };
  }

  const content = await readFile(system.path, "utf-8");
  const { name, category } = parseDesignName(content);

  const colorMatches = content.match(/#[0-9A-Fa-f]{6}/g) || [];
  const colors = [...new Set(colorMatches)].slice(0, 10);

  const fontMatch = content.match(/\*\*Primary:\*\*\s*(.+)/);
  const fontFamily = fontMatch?.[1]?.trim() ?? "System default";

  let preview = `## Preview: ${name} (${category})\n\n`;
  preview += `### Color Palette\n`;
  colors.forEach((c) => {
    preview += `- ![${c}](https://via.placeholder.com/16/${c.replace("#", "")}/${c.replace("#", "")}?text=+) \`${c}\`\n`;
  });
  preview += `\n### Typography\n- **Font family:** ${fontFamily}\n\n`;

  const summaryMatch = content.match(/## 1\. Visual Theme.*?\n([\s\S]*?)(?=## 2\.)/);
  if (summaryMatch?.[1]) {
    preview += `### Visual Theme\n${summaryMatch[1].trim()}\n\n`;
  }

  preview += `### Full Design System\nUse \`design_apply\` with id="${designId}" to load the complete design system.`;

  return { success: true, output: preview };
}

export async function getActiveDesignSystem(): Promise<string | null> {
  try {
    const raw = await readFile(ACTIVE_DESIGN_FILE, "utf-8");
    const config = JSON.parse(raw) as { active: string; name: string; appliedAt: string };
    const systemPath = path.join(_designSysDir, config.active, "DESIGN.md");
    if (existsSync(systemPath)) {
      const content = await readFile(systemPath, "utf-8");
      return `## Active Design System: ${config.name}\n\n${content}\n\n---\nFollow the design system above for all HTML/CSS output.`;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getActiveDesignSystemBrief(): Promise<string | null> {
  try {
    const raw = await readFile(ACTIVE_DESIGN_FILE, "utf-8");
    const config = JSON.parse(raw) as { active: string; name: string; appliedAt: string };
    return `Active design system: "${config.name}" (id: ${config.active}). Use design_apply to change it.`;
  } catch {
    return null;
  }
}

export interface DesignPreviewData {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: string[];
  fontFamily: string;
  visualTheme: string;
  dos: string[];
  donts: string[];
}

export async function getDesignPreviewData(id: string): Promise<DesignPreviewData | null> {
  const system = await getDesignSystem(id);
  if (!system) return null;
  const content = await readFile(system.path, "utf-8");

  const colorMatches = content.match(/#[0-9A-Fa-f]{6}/g) || [];
  const colors = [...new Set(colorMatches)].slice(0, 12);

  const fontMatch = content.match(/\*\*Primary:\*\*\s*(.+)/);
  const fontFamily = fontMatch?.[1]?.trim() ?? "System default";

  let visualTheme = "";
  const themeMatch = content.match(/## 1\. Visual Theme.*?\n([\s\S]*?)(?=## 2\.)/);
  if (themeMatch?.[1]) {
    visualTheme = themeMatch[1]
      .split("\n")
      .filter((l: string) => l.trim() && l.trim().startsWith("-"))
      .map((l: string) => l.replace(/^-\s*/, "").trim())
      .join(" • ");
  }

  const dos: string[] = [];
  const donts: string[] = [];
  const ddMatch = content.match(/## 7\. Do's and Don'ts\n([\s\S]*?)(?=## 8\.)/);
  if (ddMatch?.[1]) {
    for (const line of ddMatch[1].split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ✅")) dos.push(trimmed.replace(/^- ✅\s*/, ""));
      else if (trimmed.startsWith("- ❌")) donts.push(trimmed.replace(/^- ❌\s*/, ""));
    }
  }

  return {
    id: system.id,
    name: system.name,
    category: system.category,
    description: system.description,
    colors,
    fontFamily,
    visualTheme,
    dos,
    donts,
  };
}
