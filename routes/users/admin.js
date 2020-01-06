const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const domMakerMain = require('../../models/domMaker/mainDom');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);
    res.render('./admin/memberManage', req.locals);
  }),
);

module.exports = router;
