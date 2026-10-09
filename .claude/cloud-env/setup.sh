#!/usr/bin/env bash
# Setup script for the BMS-Development, BMS-Staging and BMS-Production Claude
# Code cloud environments. Paste it unchanged into each environment's
# "Setup script" field. The environments differ only in the variables they set
# (BMS_ENV, APP_ENV), not in tooling: this stack (Node 22 + npm + Express)
# needs the same tools everywhere.
#
# Project dependencies are NOT installed here. The repository's SessionStart
# hook (.claude/settings.json -> scripts/session-start.sh) runs `npm ci` after
# the repository is checked out, so the install always matches package-lock.json.
set -euo pipefail

required_node_major=22
node_major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if [ "$node_major" -lt "$required_node_major" ]; then
  echo "setup: Node >= $required_node_major required, found $(node -v 2>/dev/null || echo none)" >&2
  exit 1
fi
for tool in npm git curl; do
  command -v "$tool" >/dev/null || { echo "setup: missing $tool" >&2; exit 1; }
done

# Evidence that the setup script ran in this container.
cat > /tmp/bms-setup.txt <<INFO
bms_env=${BMS_ENV:-unset}
app_env=${APP_ENV:-unset}
node=$(node -v)
npm=$(npm -v)
ran_at=$(date -u +%FT%TZ)
INFO
echo "setup: ok ($(tr '\n' ' ' </tmp/bms-setup.txt))"
