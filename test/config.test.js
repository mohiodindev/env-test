const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { ENVIRONMENTS, loadConfig, publicConfig } = require('../src/config');

describe('config loading', () => {
  it('rejects a missing APP_ENV', () => {
    assert.throws(() => loadConfig({}), /APP_ENV must be one of/);
  });

  it('rejects unknown APP_ENV values with a fixed message that does not echo them', () => {
    for (const value of ['prod', 'Production', 'test', '../production', ' staging', 'x-secret-x']) {
      assert.throws(() => loadConfig({ APP_ENV: value }), {
        message: 'APP_ENV must be one of development, staging, production (got an unknown value)',
      });
    }
  });

  it('gives every environment a distinct identifier and marker', () => {
    const configs = ENVIRONMENTS.map((e) => loadConfig({ APP_ENV: e }));
    assert.deepEqual(configs.map((c) => c.environment), ENVIRONMENTS);
    assert.equal(new Set(configs.map((c) => c.marker)).size, 3);
    assert.equal(new Set(configs.map((c) => c.apiBaseUrl)).size, 3);
  });

  it('does not carry values from one load into the next', () => {
    const staging = loadConfig({ APP_ENV: 'staging', APP_SECRET: 'stg-only' });
    const production = loadConfig({ APP_ENV: 'production' });
    assert.equal(production.marker, 'PRD-91d4');
    assert.equal(production.secret, undefined);
    assert.equal(staging.marker, 'STG-2c9e');
    assert.ok(Object.isFrozen(staging));
  });

  it('never exposes the secret value', () => {
    const config = loadConfig({ APP_ENV: 'production', APP_SECRET: 'fixture-secret-value' });
    const exposed = publicConfig(config);
    assert.equal(exposed.secretConfigured, true);
    assert.ok(!JSON.stringify(exposed).includes('fixture-secret-value'));
  });
});
