import type { ToolResult } from "../../types/tools";
import { loadSkills, getSkillById } from "../skillLoader.js";

export async function executeSkillList(): Promise<ToolResult> {
  const skills = await loadSkills();
  const list = skills.map((s) => ({ id: s.id, name: s.name, description: s.description, triggers: s.triggers }));
  return { success: true, output: JSON.stringify(list, null, 2) };
}

export async function executeSkillRead(params: Record<string, unknown>): Promise<ToolResult> {
  const skillId = String(params.id);
  const skill = await getSkillById(skillId);
  if (!skill) {
    return { success: false, output: "", error: `Skill not found: ${skillId}` };
  }
  return { success: true, output: `## ${skill.name}\n${skill.description}\n\n${skill.content}` };
}

export async function executeSkillRun(params: Record<string, unknown>): Promise<ToolResult> {
  const runId = String(params.id);
  const runSkill = await getSkillById(runId);
  if (!runSkill) {
    return { success: false, output: "", error: `Skill not found: ${runId}` };
  }
  return { success: true, output: `Skill "${runSkill.name}" loaded. Follow the instructions in the skill content.` };
}
