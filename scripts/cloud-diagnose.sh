#!/usr/bin/env bash
# Read-only diagnostics for a fresh Claude Code cloud session.
# Usage: scripts/cloud-diagnose.sh [development|staging|production]
# Defaults to $APP_ENV. Prints facts and runs the project checks; changes nothing
# tracked by git.
set -uo pipefail
cd "$(dirname "$0")/.."
target=${1:-${APP_ENV:-}}

echo "== session"
echo "container_id=${CLAUDE_CODE_CONTAINER_ID:-unknown} session_id=${CLAUDE_CODE_SESSION_ID:-unknown}"
echo "environment_type=${CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE:-unknown} hostname=$(hostname) boot_id=$(cat /proc/sys/kernel/random/boot_id)"
echo "BMS_ENV=${BMS_ENV:-unset} APP_ENV=${APP_ENV:-unset} target=${target:-unset}"
echo "== system"
grep PRETTY_NAME /etc/os-release; uname -srm
echo "node $(node -v), npm $(npm -v), $(git --version)"
echo "== setup evidence"
if [ -f /tmp/bms-setup.txt ]; then cat /tmp/bms-setup.txt; else echo "no /tmp/bms-setup.txt (cloud setup script did not run or is not configured)"; fi
if [ -f .session-start.log ]; then cat .session-start.log; else echo "no .session-start.log (SessionStart hook did not run)"; fi
echo "== dependencies"
npm ls --depth=0 2>&1 | tail -n +2
echo "== git"
git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD; git status --short | head

status=0
run() { echo "\$ $*"; "$@" || status=1; }
echo "== checks"
case "$target" in
  development|staging)
    run env APP_ENV="$target" npm test
    run bash scripts/verify-env.sh "$target"
    ;;
  production)
    run env APP_ENV=production npm test
    # Production readiness: install runtime deps only into a throwaway copy,
    # then start it with APP_ENV=production and probe it locally. No deploy.
    tmp=$(mktemp -d)
    cp -r package.json package-lock.json src config "$tmp"/
    run npm ci --omit=dev --no-audit --no-fund --prefix "$tmp"
    env -i PATH="$PATH" APP_ENV=production PORT=4300 node "$tmp/src/server.js" >/tmp/prod-check.log 2>&1 &
    pid=$!
    for _ in $(seq 1 50); do curl -fsS http://127.0.0.1:4300/health >/dev/null 2>&1 && break; sleep 0.1; done
    run curl -fsS http://127.0.0.1:4300/health; echo
    run curl -fsS http://127.0.0.1:4300/config; echo
    kill "$pid" 2>/dev/null; wait "$pid" 2>/dev/null
    rm -rf "$tmp"
    ;;
  *)
    run npm run test:all
    run bash scripts/verify-env.sh
    ;;
esac
echo "== result: $([ $status -eq 0 ] && echo PASS || echo FAIL)"
exit $status
