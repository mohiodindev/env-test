#!/usr/bin/env bash
# Starts the real server once per environment, calls the endpoints over HTTP,
# and checks that the reported environment matches. Each server runs with a
# clean environment (env -i), so no variable from another run can leak in.
# Usage: scripts/verify-env.sh [development|staging|production ...]
set -euo pipefail
cd "$(dirname "$0")/.."

envs=("$@")
[ ${#envs[@]} -eq 0 ] && envs=(development staging production)
port=4100
status=0

for env in "${envs[@]}"; do
  port=$((port + 1))
  env -i PATH="$PATH" APP_ENV="$env" PORT="$port" node src/server.js >"/tmp/env-test-$env.log" 2>&1 &
  pid=$!
  for _ in $(seq 1 50); do curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1 && break; sleep 0.1; done

  health=$(curl -fsS "http://127.0.0.1:$port/health")
  config=$(curl -fsS "http://127.0.0.1:$port/config")
  kill "$pid"; wait "$pid" 2>/dev/null || true

  got=$(node -e 'console.log(JSON.parse(process.argv[1]).environment)' "$config")
  echo "[$env] /health  $health"
  echo "[$env] /config  $config"
  if [ "$got" = "$env" ]; then echo "[$env] PASS environment matches"; else echo "[$env] FAIL got $got"; status=1; fi
done

echo "[invalid] starting with APP_ENV=prod"
if env -i PATH="$PATH" APP_ENV=prod PORT=4199 node src/server.js 2>&1; then
  echo "[invalid] FAIL server started"; status=1
else
  echo "[invalid] PASS refused to start (exit $?)"
fi
exit $status
