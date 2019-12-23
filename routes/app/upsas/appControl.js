const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

/* GET home page. */

// FIXME: 임시로 Get 방식으로 컨트롤 처리
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI('control!!!');

    const { pump = 2 } = req.query;

    global.srcController.controlMuanCCTV(_.toNumber(pump));

    res.send();
  }),
);

module.exports = router;
