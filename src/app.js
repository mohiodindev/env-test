const express = require('express');
const { publicConfig } = require('./config');

function createApp(config) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/', (req, res) => {
    res.json({ app: config.appName, environment: config.environment });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: config.environment });
  });

  app.get('/config', (req, res) => {
    res.json(publicConfig(config));
  });

  return app;
}

module.exports = { createApp };
