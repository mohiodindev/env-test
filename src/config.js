const fs = require('node:fs');
const path = require('node:path');

const ENVIRONMENTS = ['development', 'staging', 'production'];
const CONFIG_DIR = path.join(__dirname, '..', 'config');

// Loads the configuration for APP_ENV and nothing else. Throws on a missing or
// unknown environment so the app can never start with a guessed configuration.
function loadConfig(env = process.env) {
  const appEnv = env.APP_ENV;
  if (!ENVIRONMENTS.includes(appEnv)) {
    throw new Error(
      `APP_ENV must be one of ${ENVIRONMENTS.join(', ')} (got ${appEnv ? 'an unknown value' : 'nothing'})`,
    );
  }

  // Read the file fresh (no require cache) so one environment's values can
  // never be carried over into another load in the same process.
  const file = path.join(CONFIG_DIR, `${appEnv}.json`);
  const values = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (values.environment !== appEnv) {
    throw new Error(`${appEnv}.json declares environment "${values.environment}"`);
  }

  return Object.freeze({
    ...values,
    port: Number(env.PORT ?? 3000),
    // Secrets only ever come from the process environment and are never returned.
    secret: env.APP_SECRET,
  });
}

// The subset that is safe to expose over HTTP.
function publicConfig(config) {
  return {
    appName: config.appName,
    environment: config.environment,
    marker: config.marker,
    logLevel: config.logLevel,
    apiBaseUrl: config.apiBaseUrl,
    featureBanner: config.featureBanner,
    secretConfigured: Boolean(config.secret),
  };
}

module.exports = { ENVIRONMENTS, loadConfig, publicConfig };
