#!/usr/bin/env node
import {
  initObsidianMemory,
  obsidianMemoryStatus,
  recallObsidianMemory,
  searchObsidianMemory,
  writeObsidianNote,
} from '../server/openclaw-obsidian-memory.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function usage() {
  console.log(`
OpenClaw Obsidian CLI

Commands:
  init
    Initialize OpenClaw Obsidian vault.

  write --title <title> --body <body> [--folder notes|daily|decisions|tasks] [--tags a,b]
    Write a markdown note.

  search <query> [--limit 10]
    Search markdown memory.

  recall <query> [--limit 5]
    Print larger context blocks for the agent.

  status
    Show vault stats.
`);
}

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

try {
  switch (cmd) {
    case 'init': {
      const result = initObsidianMemory();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'write': {
      const result = writeObsidianNote({
        title: args.title,
        body: args.body,
        folder: args.folder || 'notes',
        tags: args.tags || '',
        source: 'cli',
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
      break;
    }

    case 'search': {
      const query = args._.join(' ');
      if (!query) {
        console.error('Usage: node scripts/openclaw-obsidian-cli.mjs search <query>');
        process.exit(1);
      }
      const results = searchObsidianMemory(query, { limit: Number(args.limit || 10) });
      console.log(JSON.stringify({ query, count: results.length, results }, null, 2));
      break;
    }

    case 'recall': {
      const query = args._.join(' ');
      if (!query) {
        console.error('Usage: node scripts/openclaw-obsidian-cli.mjs recall <query>');
        process.exit(1);
      }
      const result = recallObsidianMemory(query, {
        limit: Number(args.limit || 5),
        maxChars: Number(args.maxChars || 6000),
      });
      console.log(result.context || '');
      break;
    }

    case 'status': {
      console.log(JSON.stringify(obsidianMemoryStatus(), null, 2));
      break;
    }

    default:
      usage();
      process.exit(cmd ? 1 : 0);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
