module.exports = {
  apps: [
    {
      name: 'UPSAS',
      script: './bin/www.js',

      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      args: 'one two',
      // instances: 0,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      ignore_watch: [
        'node_modules',
        'package-lock.json',
        '**/*/package-lock.json',
        '**/log/',
        '**/.vscode/',
        '**/out/',
        '**/docs/',
        '**/snapshot/',
        '**/dist/',
        '*.log',
      ],
      env: {
        NODE_ENV: 'development',
        PJ_MAIN_ID: 'UPSAS',
        PJ_SUB_ID: 'muan100kw',
        PJ_HTTP_PORT: 15351,
        PJ_API_PORT: 15352,
        PJ_DB_HOST: 'localhost',
        PJ_DB_PORT: 15390,
        PJ_DB_USER: 'root',
        PJ_DB_PW: 'smsoftware',
        PJ_DB_DB: 'MUAN100KW',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'FP',
      script: './bin/www.js',

      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      // args: 'one two',
      // instances: 0,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      ignore_watch: [
        'node_modules',
        'package-lock.json',
        '**/*/package-lock.json',
        '**/log/',
        '**/.vscode/',
        '**/out/',
        '**/docs/',
        '**/snapshot/',
        '**/dist/',
        '*.log',
      ],
      env: {
        NODE_ENV: 'development',
        PJ_MAIN_ID: 'FP',
        PJ_SUB_ID: 'RnD',
        PJ_HTTP_PORT: 15351,
        PJ_API_PORT: 15352,
        PJ_DB_HOST: '58.227.101.187',
        PJ_DB_PORT: 9000,
        PJ_DB_USER: 'root',
        PJ_DB_PW: 'smsoftware',
        PJ_DB_DB: 'FARM_PARALLEL',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'S2W',
      script: './bin/www.js',
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      // args: 'one two',
      // instances: 0,
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      // wait_ready: true,
      // listen_timeout: 50000,
      // kill_timeout: 5000,
      ignore_watch: [
        'node_modules',
        'package-lock.json',
        '**/*/package-lock.json',
        '**/log/',
        '**/.vscode/',
        '**/out/',
        '**/docs/',
        '**/snapshot/',
        '**/dist/',
        '*.log',
      ],
      env: {
        NODE_ENV: 'development',
        PJ_MAIN_ID: 'S2W',
        PJ_SUB_ID: '',
        PJ_HTTP_PORT: 15351,
        PJ_API_PORT: 15352,

        // # Home Img Path (\public\image\icon)
        PJ_FAVICON: 's2w.ico',
        PJ_IMG: 's2w_logo.png',
        // # Browser & Home Title
        PJ_NAME: '농가 보급형 @@@',
        // # Home Img Path (\public\image\bg)
        PJ_LOGIN_BG: 'bg_fp.jpg',

        // DB
        PJ_DB_HOST: 'localhost',
        PJ_DB_PORT: 115390,
        PJ_DB_USER: 'root',
        PJ_DB_PW: 'smsoftware',
        PJ_DB_DB: 'SOLAR_2WAY',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    production: {
      user: 'node',
      host: '212.83.163.1',
      ref: 'origin/master',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
    },
  },
};
