import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDir = mkdtempSync(join(tmpdir(), 'openclaw-obsidian-'));
process.env.JUSTROUTER_MEMORY_DIR = tempDir;
process.env.OPENCLAW_MEMORY_DB = join(tempDir, 'memory.db');
process.env.OPENCLAW_MEMORY_VAULT = join(tempDir, 'vault');

const {
  initObsidianMemory,
  obsidianMemoryStatus,
  recallObsidianMemory,
  searchObsidianMemory,
  writeObsidianNote,
} = await import('../server/openclaw-obsidian-memory.js');

const {
  agentMemoryRecall,
  agentMemorySearch,
  agentMemoryStatus,
  agentMemoryWrite,
  storeConversation,
} = await import('../server/memory-wrapper.js');

const init = initObsidianMemory();
assert.equal(init.ok, true);
assert.ok(init.vault.includes(tempDir));

const note = writeObsidianNote({
  title: 'OpenClaw magic rule',
  body: 'OpenClaw must inspect rage clicks before changing the CTA.',
  folder: 'decisions',
  tags: ['openclaw', 'ux'],
});
assert.equal(note.ok, true);

const results = searchObsidianMemory('rage clicks CTA');
assert.ok(results.length >= 1);
assert.match(results[0].snippet, /rage clicks/i);

const recall = recallObsidianMemory('OpenClaw CTA');
assert.match(recall.context, /OpenClaw must inspect/);

const writeViaAgent = await agentMemoryWrite({
  title: 'Agent task memory',
  body: 'Remember to use Obsidian memory before large project changes.',
  folder: 'tasks',
  tags: ['agent', 'memory'],
});
assert.equal(writeViaAgent.ok, true);

storeConversation({
  userId: 'test-admin',
  title: 'Agent session test-admin',
  messages: [
    { role: 'user', content: 'Запомни правило OpenClaw' },
    { role: 'assistant', content: 'Правило записано в Obsidian memory' },
  ],
});

const combinedSearch = await agentMemorySearch('Obsidian memory');
assert.ok(combinedSearch.count >= 1);

const combinedRecall = await agentMemoryRecall('OpenClaw rule');
assert.ok(combinedRecall.chars > 0);

const status = await agentMemoryStatus();
assert.equal(status.db_exists, true);
assert.ok(status.obsidian.notes >= 3);

const rawStatus = obsidianMemoryStatus();
assert.ok(rawStatus.folders.decisions >= 1);
assert.ok(rawStatus.folders.tasks >= 1);
assert.ok(rawStatus.folders.conversations >= 1);

console.log('[test-openclaw-obsidian-memory] ok');
