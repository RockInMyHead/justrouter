import assert from 'node:assert/strict';
import { getProjectStatus, listProjectCommands, runProjectCommand, searchProject } from '../server/agent-project-tools.js';

assert.ok(listProjectCommands().includes('lint_quiet'));

const denied = await runProjectCommand('rm -rf /');
assert.equal(denied.ok, false);
assert.match(denied.error, /запрещена|неизвестна/);

const status = await getProjectStatus();
assert.equal(status.ok, true);
assert.ok(typeof status.status === 'string');

const search = await searchProject({ query: 'JustRouter AI Admin', path: 'docs', limit: 5 });
assert.equal(search.ok, true);
assert.ok(search.count >= 1);

const deniedSearch = await searchProject({ query: 'SECRET', path: '.' });
assert.equal(deniedSearch.ok, false);

console.log('[test-agent-project-tools] ok');
