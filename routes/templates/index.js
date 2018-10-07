const request = require('request');
const path = require('path');
const { BU, DU, SU } = require('base-util-jh');

const expressApp = require('express')();

/** @param {expressApp} app */
module.exports = app => {
  // SU.ChainingControllers(path.join(process.cwd(), '/controllers'), app);
  SU.ChainingControllers(__dirname, app);

  app.get('/', (req, res, next) => {
    res.redirect('/main');
  });

  app.post('/reggcm', (req, res, next) => {
    // BU.CLI('@@reggcm@@');
    const locals = BU.param2Lowercase(req);

    const userAgent = req.get('User-Agent');
    const initSetter = app.get('initSetter');

    // Mobile 접속 환경
    if (userAgent.match(/iPad/) || userAgent.match(/Android/)) {
      // TODO: POSTMAN에서는 307 redirect가 잘 먹나 app에서는 안먹어서 임시로 해놓음. 문제가 무엇인지 모르겠음. app log 참조 불가
      request.post(
        `http://localhost:${initSetter.webPort}/api/app/reggcm`,
        {
          json: locals,
        },
        (err, response, body) => {
          // BU.CLI(err, response, body)
          if (err) {
            // console.log('server error.');
            return res.status(500).send(body);
          }
          if (response.statusCode === 204) {
            // BU.CLI('Empty');
            res.send(204).send(body);
          } else {
            // BU.CLI('Success', body);
            return res.send(body);
          }
        },
      );
    } else {
      return res.redirect(307, '/api/app/reggcm');
    }
  });

  app.post('/delgcm', (req, res, next) => {
    BU.CLI('@@delgcm@@');

    const locals = BU.param2Lowercase(req);

    const userAgent = req.get('User-Agent');
    const initSetter = app.get('initSetter');

    // Mobile 접속 환경
    if (userAgent.match(/iPad/) || userAgent.match(/Android/)) {
      // TODO: POSTMAN에서는 307 redirect가 잘 먹나 app에서는 안먹어서 임시로 해놓음. 문제가 무엇인지 모르겠음. app log 참조 불가
      request.post(
        `http://localhost:${initSetter.webPort}/api/app/delgcm`,
        {
          json: locals,
        },
        (err, response, body) => {
          // BU.CLI(err, response, body)
          if (err) {
            // console.log('server error.');
            return res.status(500).send(body);
          }
          if (response.statusCode === 204) {
            // BU.CLI('Empty');
            res.send(204).send(body);
          } else {
            // BU.CLI('Success', body);
            return res.send(body);
          }
        },
      );
    } else {
      return res.redirect(307, '/api/app/delgcm');
    }
  });
};
