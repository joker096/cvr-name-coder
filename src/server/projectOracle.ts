import * as fs from 'fs';
import * as path from 'path';
import { ingestDocument, clearSource } from './ragEngine.js';
import type { EmbedFunction } from './ragEngine.js';
import { log } from './logger.js';

const MAX_FILE_SIZE = 100 * 1024;
const ORACLE_SOURCE_PREFIX = 'oracle:';
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.opencode-infinite', 'dist', 'build',
  '.next', '__pycache__', '.venv', 'target', '.turbo', '.cache',
  'coverage', '.nyc_output', 'tmp', '.DS_Store',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.mdx', '.css', '.scss', '.less',
  '.html', '.htm', '.xml', '.svg',
  '.py', '.pyi', '.pyx',
  '.go', '.rs', '.rb', '.php',
  '.java', '.kt', '.kts', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cc', '.cxx',
  '.sql', '.graphql', '.gql',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.env',
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  '.dockerfile', 'dockerfile',
  '.prisma', '.proto',
  '.txt', '.log',
]);

export async function indexProject(
  rootDir: string,
  embedFn: EmbedFunction
): Promise<number> {
  clearSource(ORACLE_SOURCE_PREFIX + '*');
  const oracleDirs = getAllOracleDirs(rootDir);

  let fileCount = 0;
  for (const dir of oracleDirs) {
    const indexed = await indexDirectory(dir, rootDir, embedFn);
    fileCount += indexed;
  }

  log.info('Project Oracle indexed', { files: fileCount });
  return fileCount;
}

function getAllOracleDirs(root: string): string[] {
  const dirs: string[] = [root];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        const fullPath = path.join(root, entry.name);
        dirs.push(...getAllOracleDirs(fullPath));
      }
    }
  } catch {
    /* permission denied, skip */
  }
  return dirs;
}

async function indexDirectory(
  dir: string,
  rootDir: string,
  embedFn: EmbedFunction
): Promise<number> {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const baseName = entry.name.toLowerCase();
      const isText = TEXT_EXTENSIONS.has(ext) || baseName === 'dockerfile' || baseName === 'makefile';
      if (!isText) continue;

      const filePath = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.trim()) continue;

        const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        const source = ORACLE_SOURCE_PREFIX + relativePath;

        await ingestDocument(source, content, embedFn);
        count++;
      } catch {
        /* skip unreadable files */
      }
    }
  } catch {
    /* skip unreadable directories */
  }
  return count;
}
