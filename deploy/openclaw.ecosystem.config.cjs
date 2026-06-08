module.exports = {
  apps: [
    {
      name: 'justrouter',
      cwd: '/var/www/justrouter.ru',
      script: 'server/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'openclaw-worker',
      cwd: '/var/www/justrouter.ru',
      script: 'scripts/openclaw-report-worker.mjs',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        OPENCLAW_REPORT_HOURS: '12',
        OPENCLAW_REPORT_PATH: '/',
        OPENCLAW_REPORT_INTERVAL_MS: '43200000',
      },
    },
  ],
}
