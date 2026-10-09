#!/usr/bin/env bash
# Claude Code SessionStart hook: installs dependencies in fresh cloud sessions.
# Writes a marker so a session can prove the hook actually ran.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
npm ci --no-audit --no-fund >/dev/null
echo "session-start: npm ci ok, node $(node -v), $(date -u +%FT%TZ)" > .session-start.log
