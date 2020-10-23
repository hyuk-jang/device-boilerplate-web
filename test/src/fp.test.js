require('dotenv').config();

const { BU } = require('base-util-jh');

const app = require('express')();

const server = require('http').Server(app);

const Main = require('../../src/Main');
const FpRndControl = require('../../src/projects/FP/FpRndControl');
const ToFFMPEG = require('../../src/features/RtspManager/ToFFMPEG');
const ToIMG = require('../../src/features/RtspManager/ToIMG');

let controller;

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/stream.html`);
  // res.sendFile(`${__dirname}/index.html`);
});

server.listen(7501);

const dbInfo = {
  host: process.env.PJ_DB_HOST,
  database: process.env.PJ_DB_DB,
  port: process.env.PJ_DB_PORT,
  user: process.env.PJ_DB_USER,
  password: process.env.PJ_DB_PW,
};

const projectInfo = {
  projectMainId: 'FP',
  projectSubId: 'RnD',
};

async function operation() {
  const main = new Main();

  controller = main.createControl({
    projectInfo,
    dbInfo,
  });

  // controller = new FpRndControl({
  //   projectInfo,
  //   dbInfo,
  // });

  await controller.init();

  controller.bindingFeature();

  // const rtspUrl = 'rtsp://admin:yaho1027@192.168.0.73/Streaming/channels/1';
  // const rtspUrl = 'rtsp://smsoft.iptime.org:30554/live.sdp';
  const rtspUrl = 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov';

  // controller.runFeature({
  //   apiConfig: {
  //     apiPort: 7777,
  //   },
  //   ioConfig: {
  //     httpServer: server,
  //   },
  //   rtspConfig: {
  //     rtspUrl,
  //     streamWebPort: 7502,
  //   },
  // });

  controller.socketIoManager.init({
    httpServer: server,
  });

  controller.rtspManager = new ToFFMPEG();
  controller.rtspManager.bindingSocketIO(controller.socketIoManager.io);
  controller.rtspManager.init({
    rtspUrl,
    streamWebPort: 7502,
  });

  // controller.runStream(app);
  // BU.CLIN(controller, 2);
}

operation();
