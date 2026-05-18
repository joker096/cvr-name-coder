export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  content: string;
  filePath: string;
}

export interface SkillListResult {
  skills: Array<{
    id: string;
    name: string;
    description: string;
    triggers: string[];
  }>;
}
