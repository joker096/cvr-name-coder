export interface DatabaseStatement {
  run?: (...params: unknown[]) => { lastInsertRowid: number | bigint; changes: number };
  get?: (...params: unknown[]) => unknown;
  all?: (...params: unknown[]) => unknown[];
}

export interface Database {
  prepare(sql: string): DatabaseStatement;
  exec(sql: string): void;
  pragma(pragma: string): void;
  close?(): void;
}

export interface RagChunk {
  id: number;
  source: string;
  content: string;
  embedding: string;
}

export interface RagJsonData {
  chunks: RagChunk[];
  nextId: number;
}
