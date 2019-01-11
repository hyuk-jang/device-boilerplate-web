const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

/* GET home page. */
router.get(
  ['/'],
  asyncHandler(async (req, res) => {
    BU.CLI('control!!!');
    res.render('./control/control', req.locals);
  }),
);

module.exports = router;
