import * as path from "path";
import * as fs from "fs";

export interface DbStatement {
  run: (...args: unknown[]) => { lastInsertRowid: number; changes: number };
  get?: (key: unknown) => unknown;
  all?: (...args: unknown[]) => unknown[];
}

export interface DbLike {
  prepare: (sql: string) => DbStatement;
  exec: (sql: string) => void;
  pragma: (key: string, value?: string) => void;
}

type Row = Record<string, unknown>;

export function createJsonFallbackDb(options: {
  dbPath: string;
  rows: Row[];
  saveFn: () => void;
}): DbLike {
  const { rows, saveFn } = options;

  return {
    prepare: (sql: string): DbStatement => {
      const trimmed = sql.trim().toLowerCase();

      if (trimmed.startsWith("insert")) {
        const columnMatch = trimmed.match(/insert into \w+\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
        const colNames = columnMatch?.[1]?.split(",").map((c) => c.trim()) ?? [];
        return {
          run: (...args: unknown[]) => {
            const row: Row = {};
            colNames.forEach((col, i) => { row[col] = args[i]; });
            rows.push(row);
            saveFn();
            return { lastInsertRowid: rows.length, changes: 1 };
          },
        };
      }

      if (trimmed.startsWith("insert or replace")) {
        const columnMatch = trimmed.match(/insert or replace into \w+\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
        const colNames = columnMatch?.[1]?.split(",").map((c) => c.trim()) ?? [];
        return {
          run: (...args: unknown[]) => {
            const row: Row = {};
            colNames.forEach((col, i) => { row[col] = args[i]; });
            const keyCol = colNames[0]!;
            const idx = rows.findIndex((r) => r[keyCol] === args[0]);
            if (idx !== -1) rows[idx] = row;
            else rows.push(row);
            saveFn();
            return { lastInsertRowid: rows.length, changes: 1 };
          },
        };
      }

      if (trimmed.startsWith("select") && trimmed.includes("where") && trimmed.includes("=")) {
        const whereMatch = trimmed.match(/where\s+(\w+)\s*=\s*\?/);
        const colName = whereMatch?.[1];
        return {
          get: (key: unknown) => rows.find((r) => r[colName!] === key),
          all: (...args: unknown[]) => {
            if (args[0] !== undefined) return rows.filter((r) => r[colName!] === args[0]);
            return rows;
          },
          run: (...args: unknown[]) => {
            if (args[0] !== undefined) {
              const idx = rows.findIndex((r) => r[colName!] === args[0]);
              if (idx !== -1) rows.splice(idx, 1);
              saveFn();
            }
            return { lastInsertRowid: 0, changes: 1 };
          },
        };
      }

      if (trimmed.startsWith("select") && trimmed.includes("order by")) {
        const orderMatch = trimmed.match(/order by\s+(\w+)\s+(\w+)/i);
        const orderCol = orderMatch?.[1];
        const orderDir = orderMatch?.[2];
        return {
          all: () => {
            const sorted = [...rows];
            if (orderCol) {
              sorted.sort((a, b) => {
                const av = a[orderCol] as number;
                const bv = b[orderCol] as number;
                return orderDir === "desc" ? bv - av : av - bv;
              });
            }
            return sorted;
          },
          run: () => ({ lastInsertRowid: 0, changes: 0 }),
        };
      }

      if (trimmed.startsWith("select") && !trimmed.includes("where")) {
        return {
          all: () => rows,
          get: () => undefined,
          run: () => ({ lastInsertRowid: 0, changes: 0 }),
        };
      }

      if (trimmed.startsWith("delete")) {
        return {
          run: () => {
            rows.length = 0;
            saveFn();
            return { lastInsertRowid: 0, changes: 0 };
          },
        };
      }

      if (trimmed.startsWith("update") && trimmed.includes("where")) {
        return {
          run: (value: unknown, key: unknown) => {
            const whereMatch = trimmed.match(/where\s+(\w+)\s*=\s*\?/);
            const whereCol = whereMatch?.[1];
            if (whereCol) {
              const setMatch = trimmed.match(/set\s+(\w+)\s*=\s*\?/i);
              const setCol = setMatch?.[1];
              const row = rows.find((r) => r[whereCol] === key);
              if (row && setCol) { (row as Record<string, unknown>)[setCol] = value; saveFn(); }
            }
            return { lastInsertRowid: 0, changes: 1 };
          },
        };
      }

      return {
        run: () => ({ lastInsertRowid: 0, changes: 0 }),
        get: () => undefined,
        all: () => [],
      };
    },
    exec: () => {},
    pragma: () => {},
  };
}

let _saveQueue: Array<{ fn: () => void }> = [];
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAsyncSave(fn: () => void): void {
  _saveQueue.push({ fn });
  if (!_saveTimer) {
    _saveTimer = setTimeout(async () => {
      const queue = _saveQueue;
      _saveQueue = [];
      _saveTimer = null;
      for (const item of queue) {
        try { item.fn(); } catch { /* ignore */ }
      }
    }, 100);
  }
}

export function loadJsonData<T>(jsonPath: string, fallback: T): T {
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

export function saveJsonDataSync(jsonPath: string, data: unknown): void {
  try {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  } catch { /* ignore */ }
}
