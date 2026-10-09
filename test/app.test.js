// Runs against the environment named by APP_ENV, e.g. `APP_ENV=staging npm test`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const { createApp } = require('../src/app');
const { ENVIRONMENTS, loadConfig } = require('../src/config');

const appEnv = process.env.APP_ENV;
const others = ENVIRONMENTS.filter((e) => e !== appEnv).map((e) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', `${e}.json`), 'utf8')),
);

describe(`endpoints for APP_ENV=${appEnv}`, { skip: !appEnv && 'APP_ENV not set' }, () => {
  let server;
  let base;

  before(async () => {
    const config = loadConfig({ ...process.env, APP_SECRET: 'fixture-secret-value' });
    server = createApp(config).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  it('GET / reports the app and active environment', async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { app: 'env-test', environment: appEnv });
  });

  it('GET /health is ok for the active environment', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', environment: appEnv });
  });

  it('GET /config returns this environment and nothing from the others', async () => {
    const res = await fetch(`${base}/config`);
    const text = await res.text();
    const body = JSON.parse(text);
    assert.equal(body.environment, appEnv);
    for (const other of others) {
      assert.ok(!text.includes(other.marker), `leaked ${other.environment} marker`);
      assert.ok(!text.includes(other.apiBaseUrl), `leaked ${other.environment} apiBaseUrl`);
    }
  });

  it('GET /config never returns the secret', async () => {
    const text = await (await fetch(`${base}/config`)).text();
    assert.ok(!text.includes('fixture-secret-value'));
    assert.equal(JSON.parse(text).secretConfigured, true);
  });

  it('GET /config only points at localhost or non-routable .invalid hosts', async () => {
    const { apiBaseUrl } = await (await fetch(`${base}/config`)).json();
    const host = new URL(apiBaseUrl).hostname;
    assert.ok(host === 'localhost' || host.endsWith('.invalid') || host === 'example.invalid');
  });
});
