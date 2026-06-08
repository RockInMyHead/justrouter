# JustRouter AI Admin

AI-agent in `server/justrouter-agent.js` can operate as a project administrator from authenticated admin endpoints.

## Capabilities

- Analyze OpenClaw events and reports.
- Query project data with read-only SQL through `query_db`.
- Manage support conversations and send support replies.
- Adjust user balance with `adjust_user_balance`.
- Set user flags with `set_user_flag` (`banned`, `corporate`).
- Enable or disable models with `set_model_active`.
- Read and write project files in allowed directories.
- Search project code with `search_project`.
- Apply precise unique text replacements with `replace_in_file`.
- Run allowed project commands: `lint`, `lint_quiet`, `test`, `test_billing`, `test_agent_safety`, `build`, `migrate_dry_run`.
- Inspect git status and git diff.
- Use OpenClaw Obsidian memory through `memory_search`, `memory_recall`, `memory_status`, and `memory_write`.

## Safety Boundaries

The agent is intentionally not given arbitrary shell access.

File access is limited to:

- `src/`
- `server/`
- `shared/`
- `scripts/`
- `docs/`
- `.github/workflows/`

The agent cannot read or write secrets, SQLite runtime files, backups, private keys, `.env`, or `SERVER.md`.

## Expected Workflow

For bug fixes and features the agent should:

1. Inspect relevant files.
2. Search code with `search_project`.
3. Read focused line ranges with `read_project_file`.
4. Prefer `replace_in_file` for small fixes; use `write_project_file` with `apply: true` for new files or larger rewrites.
5. Run `lint_quiet`, `test`, `test_openclaw_obsidian`, or `build` depending on risk.
6. Report changed files, checks run, and remaining risk.

For product analysis the agent should:

1. Read OpenClaw context and recall related memory.
2. Identify behavioral issues.
3. Propose or implement UI/product changes.
4. Verify with project checks.

## OpenClaw Obsidian Memory

The agent has two memory layers:

- SQLite/FTS memory database for indexed retrieval.
- Obsidian-compatible markdown vault for human-readable long-term notes.

Default paths:

- Memory dir: `JUSTROUTER_MEMORY_DIR` or `/var/www/justrouter.ru/.memory`
- Vault: `OPENCLAW_MEMORY_VAULT` or `$JUSTROUTER_MEMORY_DIR/vault`
- OpenClaw notes: `$OPENCLAW_MEMORY_VAULT/openclaw`

CLI:

```bash
npm run openclaw:obsidian -- init
npm run openclaw:obsidian -- write --title "Decision" --body "Text" --folder decisions --tags openclaw,agent
npm run openclaw:obsidian -- search "rage clicks"
npm run openclaw:obsidian -- recall "pricing funnel"
npm run openclaw:obsidian -- status
```

The agent automatically saves conversations into `openclaw/conversations/`. For important decisions, tasks, and stable project facts it should explicitly call `memory_write`.

## Telegram Routing

For linked admin accounts Telegram is OpenClaw-first:

- Plain admin messages go directly to OpenClaw.
- `/openclaw <question>` also opens direct OpenClaw chat.
- `/openclaw report`, `/openclaw latest`, and `/openclaw heatmap /path` keep their command behavior.
- `/agent <question>` is the explicit escape hatch to the generic JustRouter AI Administrator.
- `/clear` clears both Telegram OpenClaw and generic agent conversation histories.

OpenClaw Telegram replies include a visible execution log: context collection, heatmap/funnel/session checks, action plan, and any tool trace returned by the agent core.
