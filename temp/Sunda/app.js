const _ = require('lodash');
const path = require('path');

const express = require('express');

const app = express();

const bodyParser = require('body-parser');

const { BU } = require('base-util-jh');

const SocketIoManager = require('./SocketIoManager');

app.use(bodyParser.json());
app.use(express.json());
// app.use(express.static(`${process.cwd()}/public`));

let currPath = __dirname;
let lastIndex = currPath.lastIndexOf('\\');
currPath = currPath.slice(0, lastIndex);
lastIndex = currPath.lastIndexOf('\\');
currPath = currPath.slice(0, lastIndex);

BU.CLI(currPath);

app.set('views', path.join(currPath, 'views'));

app.use(express.static(path.join(currPath, 'public')));

app.set('view engine', 'ejs');

// FIXME: Pkg 를 위한 path 추가 (pkg 모듈 테스트 필요)
path.join(process.cwd(), '/public/**/*');

const http = require('http').Server(app);

const socketIoManager = new SocketIoManager();
socketIoManager.setSocketIO(http);

const map = require('./map');

app.get('/', (req, res) => {
  // req.locasl.map = map;

  res.render('./Sunda/index', { map });
  // res.send('hi');
});

http.listen(7777, (req, res) => {
  console.log('Controller Server is Running', 7777);
});
