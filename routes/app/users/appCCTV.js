const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

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
    const cameraList = await biDevice.getTable('camera', mainWhere, false);

    /** @type {CAMERA_SNAPSHOT_DATA[]} */
    const snapshotDataRows = await biDevice.getCameraSnapshot(_.map(cameraList, 'camera_seq'));

    const snapshotStorageList = [];

    snapshotDataRows.forEach(snapshotDataRow => {
      const { snapshot_uuid: snapshotPath, camera_seq, writedate } = snapshotDataRow;
      const cameraInfo = _.find(cameraList, { camera_seq });

      const snapshotStorage = {
        cameraSeq: cameraInfo.camera_seq,
        cameraName: cameraInfo.camera_name,
        snapshotPath: `snapshot/${uuid}/${snapshotPath}`,
        snapshotTime: moment(writedate).format('YYYY-MM-DD hh:mm:ss'),
      };

      snapshotStorageList.push(snapshotStorage);

      // const img = fs.readFileSync(`${process.cwd}/snapshot/${uuid}/${snapshotPath}`);
      // res.writeHead(200, { 'Content-Type': 'image/jpeg' });

      // res.end(img, 'binary');
    });

    req.locals.sessionID = req.sessionID;
    req.locals.user = req.user;
    req.locals.snapshotStorageList = snapshotStorageList;

    res.json(snapshotStorageList);
  }),
);

module.exports = router;
