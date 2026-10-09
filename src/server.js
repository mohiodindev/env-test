const { createApp } = require('./app');
const { loadConfig } = require('./config');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`Refusing to start: ${error.message}`);
  process.exit(1);
}

const server = createApp(config).listen(config.port, () => {
  console.log(`${config.appName} listening on port ${server.address().port} (APP_ENV=${config.environment})`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
