import type { ToolResult } from "../../types/tools";
import { loadSkills, getSkillById } from "../skillLoader.js";

/**
 * Lists all available skills with their metadata (id, name, description, triggers, od).
 * @returns A tool result with JSON-encoded skill list.
 */
export async function executeSkillList(): Promise<ToolResult> {
  const skills = await loadSkills();
  const list = skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers, od: s.od }));
  return { success: true, output: JSON.stringify(list, null, 2) };
}

/**
 * Reads the full content of a specific skill by its identifier.
 * @param params - Contains `id` (the skill identifier).
 * @returns A tool result with the skill name, description, and content, or an error if not found.
 */
export async function executeSkillRead(params: Record<string, unknown>): Promise<ToolResult> {
  const skillId = String(params.id);
  const skill = await getSkillById(skillId);
  if (!skill) {
    return { success: false, output: "", error: `Skill not found: ${skillId}` };
  }
  return { success: true, output: `## ${skill.name}\n${skill.description}\n\n${skill.content}` };
}

/**
 * Activates a skill by its identifier, instructing the AI to load and follow it.
 * @param params - Contains `id` (the skill identifier).
 * @returns A tool result confirming the skill was loaded, or an error if not found.
 */
export async function executeSkillRun(params: Record<string, unknown>): Promise<ToolResult> {
  const runId = String(params.id);
  const runSkill = await getSkillById(runId);
  if (!runSkill) {
    return { success: false, output: "", error: `Skill not found: ${runId}` };
  }
  return { success: true, output: `Skill "${runSkill.name}" loaded. Follow the instructions in the skill content.` };
}
