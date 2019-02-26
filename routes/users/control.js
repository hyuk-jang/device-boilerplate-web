const _ = require('lodash');
const request = require('request');
const express = require('express');
const asyncHandler = require('express-async-handler');
const base64Img = require('base64-img');

const router = express.Router();

const fs = require('fs');

const { BU } = require('base-util-jh');

/* GET home page. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI('control!!!');

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    const { siteId, uuid } = req.locals.mainInfo;

    // 모든 노드를 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {CAMERA[]} */
    const cameraList = await biDevice.getTable('camera', mainWhere, true);

    /** @type {CAMERA_SNAPSHOT_DATA[]} */
    const snapshotDataRows = await biDevice.getCameraSnapshot(_.map(cameraList, 'camera_seq'));

    BU.CLI(snapshotDataRows);

    const snapshotStorageList = [];

    snapshotDataRows.forEach(snapshotDataRow => {
      const { snapshot_uuid: snapshotPath, camera_seq } = snapshotDataRow;
      const cameraInfo = _.find(cameraList, { camera_seq });

      const snapshotStorage = {
        cameraSeq: cameraInfo.camera_seq,
        cameraName: cameraInfo.camera_name,
        snapshotPath: `snapshot/${uuid}/${snapshotPath}`,
      };

      snapshotStorageList.push(snapshotStorage);

      // const img = fs.readFileSync(`${process.cwd}/snapshot/${uuid}/${snapshotPath}`);
      // res.writeHead(200, { 'Content-Type': 'image/jpeg' });

      // res.end(img, 'binary');
    });

    BU.CLI(snapshotStorageList);

    req.locals.sessionID = req.sessionID;
    req.locals.user = req.user;
    req.locals.snapshotStorageList = snapshotStorageList;

    res.render('./control/control', req.locals);
  }),
);

/* GET home page. */
router.get(
  ['/:siteId/snapshot'],
  asyncHandler(async (req, res) => {
    // BU.CLI('control!!!');
    request
      .get('http://smsoft.iptime.org:38080/cgi-bin/viewer/video.jpg')
      .on('error', function(err) {
        console.log(err);
      })
      .pipe(res);
    // const requestGet = Promise.promisify(request.get);

    // const { statusCode, headers, body } = await requestGet(
    //   // const { error, response, body } = await requestGet(
    //   'http://smsoft.iptime.org:38080/cgi-bin/viewer/video.jpg',
    // );

    // console.log(body);

    // fs.readFile(
    //   './video.jpg',
    //   {
    //     encoding: 'base64',
    //   },
    //   (err, result) => {
    //     BU.CLIS(err, result);
    //   },
    // );

    // res.send('hi');

    // if (statusCode !== 200) {
    //   return res.status(statusCode).send('err');
    // }

    // const data = `data:${headers['content-type']};base64,${Buffer.from(body).toString('base64')}`;

    // BU.CLI(data);

    // res.send(data);

    // BU.CLIS(error, response, body);

    // if (error) {
    //   return res.status(500).send('error');
    // }

    // const data = `data:${response.headers['content-type']};base64,${Buffer.from(body, 'base64')}`;

    // // BU.CLI(data);

    // res.send(data);
  }),
);

// router.get('/:siteId/snapshot', (req, res) => {
//   // request.get(
//   //   'http://smsoft.iptime.org:38080/cgi-bin/viewer/video.jpg',
//   //   (error, response, body) => {
//   //     if (!error && response.statusCode === 200) {
//   //       BU.CLI('complete');
//   //       // const data = `data:${response.headers['content-type']};base64,${Buffer.from(
//   //       //   body,
//   //       //   'base64',
//   //       // )}`;

//   //       // console.log(body);
//   //       // return res.send(data);
//   //     }
//   //     BU.CLI('error', error);
//   //     // res.status(500).send('');
//   //   },
//   // );
//   request.get(
//     'http://smsoft.iptime.org:38080/cgi-bin/viewer/video.jpg',
//     (error, response, body) => {
//       if (!error && response.statusCode == 200) {
//         const data = `data:${response.headers['content-type']};base64,${Buffer.from(body).toString(
//           'base64',
//         )}`;
//         BU.CLI('@@');
//         console.log(data);
//       }
//       // res.status(500).send('');
//     },
//   );

//   // request.get(
//   //   'http://smsoft.iptime.org:38080/cgi-bin/viewer/video.jpg',
//   //   (error, response, body) => {
//   //     if (error) {
//   //       return res.send(error);
//   //     }

//   //     return res.send(body);
//   //   },
//   // );
// });

module.exports = router;
