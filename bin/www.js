#!/usr/bin/env node

/**
 * Module dependencies.
 */

const debug = require('debug')('device-boilerplate-web:server');
let http = require('http');

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const { BU } = require('base-util-jh');
const MainControl = require('../src/MainControl');

const app = require('../app');

global.app = app;

// require('../../default-intelligence');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.WEB_HTTP_PORT || '3000');
app.set('port', port);

/**
 * Set Customize
 */

// const dbInfo = {
//   port: process.env.WEB_DB_PORT || '3306',
//   host: process.env.WEB_DB_HOST || 'localhost',
//   user: process.env.WEB_DB_USER || 'root',
//   password: process.env.WEB_DB_PW || 'test',
//   database: process.env.WEB_DB_DB || 'test',
// };

// app.set('dbInfo', dbInfo);

// app.use(
//   session({
//     key: 'sid',
//     secret: BU.GUID(),
//     store: new MySQLStore(dbInfo),
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//       maxAge: 1000 * 60 * 60 * 24, // 1일
//     },
//   }),
// );

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
server.on('error', onError);
server.on('listening', onListening);

// 컨트롤러 구동 시작
async function operationController() {
  try {
    // BU.CLI(process.env.DEV_MODE);
    /** Web Socket Binding */
    http = http.Server(app);
    const mainControl = new MainControl(app.get('dbInfo'));
    await mainControl.init();
    // mainControl.dataStorageManager.setSocketIO(http);
    // 전역 변수로 설정
    // global.mainStorageList = mainControl.dataStorageManager.mainStorageList;
  } catch (error) {
    BU.CLI(error);
    BU.errorLog('init', 'mainError', error);
  }
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const parsePort = parseInt(val, 10);

  if (isNaN(parsePort)) {
    // named pipe
    return val;
  }

  if (parsePort >= 0) {
    // port number
    return parsePort;
  }

  return false;
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
