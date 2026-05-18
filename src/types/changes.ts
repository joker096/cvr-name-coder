export interface FileChange {
  id: string;
  timestamp: number;
  filePath: string;
  operation: "write" | "edit";
  beforeContent: string | null;
  afterContent: string;
  description: string;
}

export interface ChangeHistory {
  changes: FileChange[];
  undoStack: string[];
  redoStack: string[];
}

export interface ChangeState {
  changes: FileChange[];
  canUndo: boolean;
  canRedo: boolean;
}
