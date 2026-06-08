import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolveAgentProjectPath } from './agent-file-safety.js';

const execFileAsync = promisify(execFile);

const COMMANDS = {
  lint: { cmd: 'npm', args: ['run', 'lint'] },
  lint_quiet: { cmd: 'npx', args: ['eslint', '.', '--quiet'] },
  test: { cmd: 'npm', args: ['test'] },
  test_billing: { cmd: 'npm', args: ['run', 'test:billing'] },
  test_agent_safety: { cmd: 'npm', args: ['run', 'test:agent-safety'] },
  test_openclaw_obsidian: { cmd: 'npm', args: ['run', 'test:openclaw-obsidian'] },
  build: { cmd: 'npm', args: ['run', 'build'] },
  migrate_dry_run: { cmd: 'npm', args: ['run', 'migrate:db', '--', '--dry-run'] },
};

function trimOutput(value, max = 12000) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

export function listProjectCommands() {
  return Object.keys(COMMANDS);
}

export async function runProjectCommand(name, { cwd = process.cwd(), timeoutMs = 120000 } = {}) {
  const command = COMMANDS[String(name || '').trim()];
  if (!command) {
    return { ok: false, error: `Команда запрещена или неизвестна. Доступно: ${listProjectCommands().join(', ')}` };
  }

  try {
    const result = await execFileAsync(command.cmd, command.args, {
      cwd,
      timeout: Math.max(1000, Math.min(Number(timeoutMs) || 120000, 300000)),
      maxBuffer: 1024 * 1024 * 5,
    });
    return {
      ok: true,
      command: name,
      stdout: trimOutput(result.stdout),
      stderr: trimOutput(result.stderr),
    };
  } catch (error) {
    return {
      ok: false,
      command: name,
      exit_code: error.code ?? null,
      stdout: trimOutput(error.stdout),
      stderr: trimOutput(error.stderr || error.message),
    };
  }
}

export async function getProjectStatus({ cwd = process.cwd() } = {}) {
  try {
    const [status, stat] = await Promise.all([
      execFileAsync('git', ['status', '--short', '--branch'], { cwd, timeout: 15000 }),
      execFileAsync('git', ['diff', '--stat'], { cwd, timeout: 15000 }),
    ]);
    return {
      ok: true,
      status: trimOutput(status.stdout, 20000),
      diff_stat: trimOutput(stat.stdout, 20000),
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      stdout: trimOutput(error.stdout),
      stderr: trimOutput(error.stderr),
    };
  }
}

export async function getProjectDiff({ file, cwd = process.cwd() } = {}) {
  const args = ['diff', '--'];
  if (file) args.push(String(file));
  try {
    const result = await execFileAsync('git', args, { cwd, timeout: 15000, maxBuffer: 1024 * 1024 * 5 });
    return { ok: true, diff: trimOutput(result.stdout, 30000) };
  } catch (error) {
    return { ok: false, error: error.message, stdout: trimOutput(error.stdout), stderr: trimOutput(error.stderr) };
  }
}

export async function searchProject({ query, path = 'src', limit = 50, cwd = process.cwd() } = {}) {
  const needle = String(query || '').trim();
  if (!needle) return { ok: false, error: 'Укажите query' };

  let safePath;
  try {
    safePath = resolveAgentProjectPath(path).relativePath;
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const max = Math.max(1, Math.min(Number(limit) || 50, 200));
  try {
    const result = await execFileAsync('rg', ['--line-number', '--no-heading', '--fixed-strings', '--', needle, safePath], {
      cwd,
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    const lines = String(result.stdout || '').split('\n').filter(Boolean).slice(0, max);
    return { ok: true, query: needle, path: safePath, count: lines.length, results: lines };
  } catch (error) {
    if (error.code === 1) return { ok: true, query: needle, path: safePath, count: 0, results: [] };
    return { ok: false, error: error.message, stdout: trimOutput(error.stdout), stderr: trimOutput(error.stderr) };
  }
}
