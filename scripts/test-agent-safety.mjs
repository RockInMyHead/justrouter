import assert from 'node:assert/strict';
import { resolveAgentProjectPath } from '../server/agent-file-safety.js';

assert.equal(resolveAgentProjectPath('src/App.jsx').relativePath, 'src/App.jsx');
assert.equal(resolveAgentProjectPath('server/routes/content.js').relativePath, 'server/routes/content.js');
assert.throws(() => resolveAgentProjectPath('../.env'), /Пути с \.\. запрещены|Путь должен быть внутри/);
assert.throws(() => resolveAgentProjectPath('/tmp/file'), /Абсолютные пути запрещены/);
assert.throws(() => resolveAgentProjectPath('.env'), /Путь должен быть внутри|запрещены/);
assert.throws(() => resolveAgentProjectPath('SERVER.md'), /Путь должен быть внутри|запрещены/);
assert.throws(() => resolveAgentProjectPath('server/velorix.db'), /запрещены/);
assert.throws(() => resolveAgentProjectPath('public/og-image.png'), /Путь должен быть внутри/);

console.log('[test-agent-safety] ok');
