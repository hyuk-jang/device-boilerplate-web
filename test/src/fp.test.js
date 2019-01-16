require('dotenv').config();

const { BU } = require('base-util-jh');

const app = require('express')();

const server = require('http').Server(app);

const events = require('events');

// const io = require('socket.io')(server);

// const rtsp = require('rtsp-ffmpeg');

// const Main = require('../../src/Main');
const FpRndControl = require('../../src/projects/FP/RnD/FpRndControl');

const Emitters = {};
let controller;
const initEmitter = feed => {
  if (!Emitters[feed]) {
    Emitters[feed] = new events.EventEmitter().setMaxListeners(0);
  }
  return Emitters[feed];
};

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/stream.html`);
  // res.sendFile(`${__dirname}/index.html`);
});

server.listen(7500);

const dbInfo = {
  host: process.env.WEB_DB_HOST,
  database: process.env.WEB_DB_DB,
  port: process.env.WEB_DB_PORT,
  user: process.env.WEB_DB_USER,
  password: process.env.WEB_DB_PW,
};

const projectInfo = {
  projectMainId: 'FP',
  projectSubId: 'RnD',
};

async function operation() {
  // const main = new Main({
  //   dbInfo,
  // });

  // const controller = main.createControl({
  //   projectInfo,
  //   dbInfo,
  // });

  controller = new FpRndControl({
    projectInfo,
    dbInfo,
  });

  await controller.init();

  controller.bindingFeature();

  // const rtspUrl = 'rtsp://smsoft.iptime.org:30554/live.sdp';
  const rtspUrl = 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov';

  controller.runFeature({
    ioConfig: {
      httpServer: server,
    },
    rtspConfig: {
      app,
      rtspUrl,
      webPort: process.env.WEB_HTTP_PORT,
    },
  });

  // controller.runStream(app);
  // BU.CLIN(controller, 2);
}

operation();
