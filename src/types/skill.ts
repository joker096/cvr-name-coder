export interface SkillODMeta {
  mode?: string;
  platform?: string;
  scenario?: string;
  design_system?: {
    requires?: boolean;
  };
  preview?: {
    type?: string;
    entry?: string;
  };
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  content: string;
  filePath: string;
  od?: SkillODMeta;
}

export interface SkillListResult {
  skills: Array<{
    id: string;
    name: string;
    description: string;
    triggers: string[];
    od?: SkillODMeta;
  }>;
}
