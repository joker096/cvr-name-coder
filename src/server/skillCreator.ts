import { writeFile, mkdir } from "fs/promises";
import * as path from "path";

let _skillsDir = path.resolve(process.cwd(), ".cvr", "skills");

export function setSkillCreatorDir(dir: string): void {
  _skillsDir = dir;
}

export interface SkillCreationInput {
  goal: string;
  steps: Array<{ thought: string; action?: any; observation?: string | undefined }>;
  toolNames: string[];
  durationMs: number;
  success: boolean;
}

export async function maybeCreateSkill(input: SkillCreationInput): Promise<{ created: boolean; path?: string; reason: string }> {
  // Only create skills for multi-step successful tasks that used diverse tools
  const MIN_STEPS = 3;
  const MIN_UNIQUE_TOOLS = 2;

  if (!input.success) {
    return { created: false, reason: "Task failed — not creating skill." };
  }

  if (input.steps.length < MIN_STEPS) {
    return { created: false, reason: "Too few steps — not a repeatable workflow." };
  }

  const uniqueTools = new Set(input.toolNames.filter((t) => t && t !== "read_file" && t !== "list_directory"));
  if (uniqueTools.size < MIN_UNIQUE_TOOLS) {
    return { created: false, reason: "Not enough diverse tools — trivial task." };
  }

  const id = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const title = summarizeGoal(input.goal);
  const description = `Auto-generated skill from completed task: ${input.goal}`;
  const triggers = extractTriggers(input.goal);

  const content = buildSkillContent(input);

  const frontmatter = `---
id: ${id}
name: ${title}
description: ${description}
triggers: ${JSON.stringify(triggers)}
---

${content}`;

  const filePath = path.join(_skillsDir, `${id}.md`);
  try {
    await mkdir(_skillsDir, { recursive: true });
    await writeFile(filePath, frontmatter, "utf-8");
    return { created: true, path: filePath, reason: "Skill created successfully." };
  } catch (e: any) {
    return { created: false, reason: `Write failed: ${e.message}` };
  }
}

function summarizeGoal(goal: string): string {
  // Simple heuristic: first 5 words or first 40 chars
  const words = goal.split(/\s+/).slice(0, 5);
  let title = words.join(" ");
  if (title.length > 40) title = title.slice(0, 40) + "...";
  return title;
}

function extractTriggers(goal: string): string[] {
  const lower = goal.toLowerCase();
  const keywords = ["refactor", "implement", "fix", "create", "build", "optimize", "debug", "migrate", "setup", "configure"];
  return keywords.filter((k) => lower.includes(k));
}

function buildSkillContent(input: SkillCreationInput): string {
  const lines: string[] = ["# Auto-Generated Skill", ""];
  lines.push(`## Goal`);
  lines.push(input.goal);
  lines.push("");
  lines.push(`## Steps`);
  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    if (!step) continue;
    lines.push(`${i + 1}. ${step.thought.substring(0, 200)}${step.thought.length > 200 ? "..." : ""}`);
    if (step.action) {
      lines.push(`   - Action: ${step.action.tool || "N/A"}`);
    }
  }
  lines.push("");
  lines.push(`## Tools Used`);
  lines.push(input.toolNames.filter(Boolean).join(", "));
  lines.push("");
  lines.push(`## Notes`);
  lines.push(`- Duration: ${(input.durationMs / 1000).toFixed(1)}s`);
  lines.push(`- Generated automatically from agent execution.`);
  return lines.join("\n");
}
