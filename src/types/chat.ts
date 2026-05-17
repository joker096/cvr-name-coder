export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  content: string;
  timestamp: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'learned' | 'available';
  category: 'research' | 'devops' | 'content' | 'knowledge';
}

export interface Agent {
  id: string;
  label: string;
  role: string;
  icon: any;
  color: string;
  tools: string;
  autonomy: string;
}
