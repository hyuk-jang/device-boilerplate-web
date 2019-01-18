const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

/* GET home page. */
router.get(
  ['/'],
  asyncHandler(async (req, res) => {
    BU.CLI('control!!!');

    req.locals.sessionID = req.sessionID;
    req.locals.user = req.user;

    res.render('./control/control', req.locals);
  }),
);

module.exports = router;
