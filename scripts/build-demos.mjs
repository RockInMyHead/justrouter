import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const demosRoot = join(root, 'demos');

if (!existsSync(demosRoot)) {
  console.log('[demos] no demos folder, skip');
  process.exit(0);
}

const projects = readdirSync(demosRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(demosRoot, entry.name))
  .filter((dir) => existsSync(join(dir, 'package.json')));

if (projects.length === 0) {
  console.log('[demos] no demo projects found');
  process.exit(0);
}

for (const dir of projects) {
  const name = dir.split('/').pop();
  console.log(`[demos] building ${name}...`);
  execSync('npm install', { cwd: dir, stdio: 'inherit' });
  execSync('npm run build', { cwd: dir, stdio: 'inherit' });
  console.log(`[demos] ${name} → public/demos/${name}`);
}
