import path from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED_PREFIXES = ['src', 'server', 'shared', 'scripts', 'docs', '.github/workflows'];
const DENIED_BASENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  'SERVER.md',
  'velorix.db',
  'velorix.db-wal',
  'velorix.db-shm',
  'velorix.db-journal',
]);
const DENIED_EXTENSIONS = new Set(['.db', '.sqlite', '.sqlite3', '.bak', '.pem', '.key', '.p12', '.pfx']);

export function resolveAgentProjectPath(inputPath, { write = false } = {}) {
  const raw = String(inputPath || '').trim();
  if (!raw) throw new Error('Укажите path');
  if (path.isAbsolute(raw)) throw new Error('Абсолютные пути запрещены');

  const normalized = path.normalize(raw).replace(/^(\.\.[/\\])+/, '');
  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Пути с .. запрещены');
  }

  const absolutePath = path.resolve(PROJECT_ROOT, normalized);
  if (!absolutePath.startsWith(PROJECT_ROOT + path.sep) && absolutePath !== PROJECT_ROOT) {
    throw new Error('Путь выходит за пределы проекта');
  }

  const relativePath = path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
  const firstAllowed = ALLOWED_PREFIXES.some((prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`));
  if (!firstAllowed) {
    throw new Error(`Путь должен быть внутри: ${ALLOWED_PREFIXES.join(', ')}`);
  }

  const basename = path.basename(relativePath);
  if (DENIED_BASENAMES.has(basename) || DENIED_EXTENSIONS.has(path.extname(relativePath))) {
    throw new Error('Запись или чтение этого файла запрещены политикой безопасности');
  }

  if (write && relativePath.startsWith('server/backups/')) {
    throw new Error('Запись в backups запрещена');
  }

  return { absolutePath, relativePath };
}
