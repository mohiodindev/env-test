// Starts the real entry point in a child process with a minimal environment
// (PATH only), so nothing from the parent shell can leak into the config.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { describe, it } = require('node:test');

const entry = path.join(__dirname, '..', 'src', 'server.js');
const run = (env) =>
  spawn(process.execPath, [entry], { env: { PATH: process.env.PATH, ...env }, stdio: 'pipe' });

describe('server process', () => {
  for (const [label, env] of [
    ['missing APP_ENV', {}],
    ['invalid APP_ENV', { APP_ENV: 'prod' }],
  ]) {
    it(`fails safely with ${label}`, async () => {
      const child = run(env);
      let stderr = '';
      child.stderr.on('data', (d) => (stderr += d));
      const [code] = await once(child, 'exit');
      assert.equal(code, 1);
      assert.match(stderr, /Refusing to start/);
    });
  }

  it('starts with only APP_ENV set', { skip: !process.env.APP_ENV && 'APP_ENV not set' }, async () => {
    const child = run({ APP_ENV: process.env.APP_ENV, PORT: '0' });
    const [line] = await once(child.stdout, 'data');
    assert.match(String(line), new RegExp(`APP_ENV=${process.env.APP_ENV}\\)`));
    child.kill('SIGTERM');
    assert.equal((await once(child, 'exit'))[0], 0);
  });
});
