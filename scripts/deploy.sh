#!/usr/bin/env bash
set -euo pipefail

# ── JustRouter deploy script ──
# Usage: ./scripts/deploy.sh [--dry-run] [server_host]
# Example: ./scripts/deploy.sh root@justrouter.ru
#
# For password-based auth, set SSHPASS env var:
#   SSHPASS='password' ./scripts/deploy.sh root@host

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
  shift
fi

SERVER="${1:-}"
if [ -z "$SERVER" ]; then
  echo "❌ Usage: $0 [--dry-run] user@server"
  echo "   Example: $0 root@justrouter.ru"
  exit 1
fi

REMOTE_DIR="/var/www/justrouter.ru"
SSH_KEY="${SSH_KEY:-}"  # e.g. -i ~/.ssh/id_rsa

# Use sshpass if SSHPASS is set (for password auth)
RSYNC_RSH="ssh"
if [ -n "${SSHPASS:-}" ]; then
  RSYNC_RSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new"
fi

SSH_CMD="ssh $SSH_KEY"
if [ -n "${SSHPASS:-}" ]; then
  SSH_CMD="sshpass -p \"$SSHPASS\" ssh -o StrictHostKeyChecking=accept-new"
fi

echo "🔨 Building project..."
npm run build

echo "📦 Copying files to server..."
RSYNC_DRY_RUN=()
if [ "$DRY_RUN" -eq 1 ]; then
  RSYNC_DRY_RUN=(--dry-run)
fi

rsync -avz --delete \
  "${RSYNC_DRY_RUN[@]}" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'demos/*/node_modules' \
  --exclude 'demos/*/package-lock.json' \
  --exclude 'ChatGPT Image *.png' \
  --exclude 'backups' \
  --exclude '*.bak' \
  --exclude 'server/velorix.db' \
  --exclude 'server/velorix.db-wal' \
  --exclude 'server/velorix.db-shm' \
  --exclude 'server/velorix.db-journal' \
  --exclude 'src' \
  --include 'dist' \
  --include 'server' \
  --include 'shared' \
  --include 'scripts' \
  --include 'scripts/openclaw-report-worker.mjs' \
  --include 'scripts/openclaw-report-now.mjs' \
  --include 'deploy' \
  --include 'deploy/openclaw.ecosystem.config.cjs' \
  --include 'package.json' \
  --include 'package-lock.json' \
  --rsh="$RSYNC_RSH" \
  ./ "$SERVER:$REMOTE_DIR/"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "✅ Dry run complete. No remote changes applied."
  exit 0
fi

echo "🔧 Installing deps & restarting on server..."
eval $SSH_CMD "$SERVER" bash -s << 'REMOTE'
  set -euo pipefail
  cd /var/www/justrouter.ru

  # Install production deps
  npm install --omit=dev

  # Ensure .env exists (copy from example if missing)
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Created .env from .env.example — EDIT IT with real values!"
  fi

  # DO NOT remove velorix.db — it's the production database with real users!
  # rsync already excludes it via --exclude rules.
  if [ -f server/velorix.db ]; then
    mkdir -p server/backups
    cp server/velorix.db "server/backups/velorix.db.$(date +%Y%m%d-%H%M%S).bak"
  fi

  # Restart via PM2 ecosystem (manages justrouter + openclaw-worker)
  if command -v pm2 &>/dev/null; then
    if [ -f deploy/openclaw.ecosystem.config.cjs ]; then
      pm2 startOrReload deploy/openclaw.ecosystem.config.cjs --update-env
    else
      pm2 restart justrouter || pm2 start server/index.js --name justrouter
    fi
    pm2 save
  else
    echo "⚠️  pm2 not found. Restart manually:"
    echo "   node server/index.js"
    echo "   node scripts/openclaw-report-worker.mjs"
  fi

  echo ""
  echo "✅ Deploy complete!"
REMOTE
