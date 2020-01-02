#!/usr/bin/env node
require('dotenv').config();
/**
 * Module dependencies.
 */

const debug = require('debug')('device-boilerplate-web:server');
const _ = require('lodash');
const http = require('http');

const { BU } = require('base-util-jh');

const app = require('../app');

global.app = app;

const Main = require('../src/Main');

const config = require('./config');

const { projectInfo, dbInfo, webServer } = config;
const { featureConfig } = projectInfo;
const { apiConfig, rtspConfig, isStopWeathercast } = featureConfig;

/**
 * Get port from environment and store in Express.
 */

const port = webServer.httpPort;
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, () => {
  operationController();
  console.log(`Server ${port} is Listening`);
});
// 최대 5분 기다림.
server.timeout = 1000 * 60 * 5;
server.on('error', onError);
server.on('listening', onListening);

// 컨트롤러 구동 시작
async function operationController() {
  try {
    const main = new Main();
    const srcController = main.createControl({
      projectInfo,
      dbInfo,
    });

    // 전역 변수로 등록
    global.srcController = srcController;

    await srcController.init();
    srcController.bindingFeature();
    srcController.runFeature({
      apiConfig,
      ioConfig: {
        httpServer: server,
      },
      rtspConfig,
      isStopWeathercast,
    });
  } catch (error) {
    BU.CLI(error);
    BU.errorLog('init', 'mainError', error);
  }
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
}

process.on('uncaughtException', err => {
  BU.CLI(err);
  console.log('uncaughtException. Node NOT Exiting...');
});

process.on('unhandledRejection', err => {
  BU.CLI(err);
  console.log('unhandledRejection. Node NOT Exiting...');
});
