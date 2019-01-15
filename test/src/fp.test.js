require('dotenv').config();

const { BU } = require('base-util-jh');

const app = require('express')();

const server = require('http').Server(app);

// const io = require('socket.io')(server);

// const rtsp = require('rtsp-ffmpeg');

// const Main = require('../../src/Main');
const FpRndControl = require('../../src/projects/FP/RnD/FpRndControl');

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

server.listen(6147);

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

  const controller = new FpRndControl({
    projectInfo,
    dbInfo,
  });

  await controller.init();

  controller.bindingFeature();
  controller.runFeature({
    httpServer: server,
  });
  BU.CLIN(controller, 2);
}

operation();
