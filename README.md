# env-test

A disposable experiment, not a real application. It checks how far a Claude Code
cloud session can set up and tell apart three environments (development, staging,
production) using one Express app.

## What's here

| Path | Purpose |
| --- | --- |
| `src/` | Express app with `GET /`, `GET /health` and `GET /config` |
| `config/<env>.json` | Non-secret values for each environment, each with a unique `marker` |
| `test/` | `node:test` suites. They run against whatever `APP_ENV` is set |
| `scripts/verify-env.sh` | Starts the real server once per environment with a clean `env -i` and checks it over HTTP |
| `scripts/session-start.sh` + `.claude/settings.json` | SessionStart hook that runs `npm ci` in fresh cloud sessions |
| `.github/workflows/test.yml` | CI matrix: one job per environment |

## Configuration rules

- `APP_ENV` is required and must be `development`, `staging` or `production`.
  Anything else, or a missing value, stops the app with exit code 1.
- Only `config/$APP_ENV.json` is read. The file must declare the same environment.
- Secrets (`APP_SECRET`) come only from the process environment. `/config` reports
  `secretConfigured: true|false` and never returns the value.
- Staging and production URLs use the reserved `.invalid` TLD, so they can never
  resolve to real infrastructure.

## Commands

```bash
npm ci
APP_ENV=development npm test
APP_ENV=staging npm test
APP_ENV=production npm test
npm run test:all            # all three, one after another
npm run verify              # start the real server per environment and curl it
APP_ENV=staging npm start   # run one environment on :3000
```

## Isolation: what this does and does not prove

These are three **configurations** of one codebase, run as separate processes. They
are not three machines, three databases or three deployments. Real per-environment
isolation (separate hosts, databases and secrets) needs infrastructure outside the
repository. Each Claude Code cloud session runs in its own container, so separate
sessions give container-level separation. They all share whatever the cloud
environment's settings define, though.
