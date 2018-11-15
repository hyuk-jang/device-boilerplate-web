const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const INCLINED_SOLAR = 'inclinedSolar';

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);
    res.render('./templates/Ean/main/main', req.locals);
  }),
);

module.exports = router;
