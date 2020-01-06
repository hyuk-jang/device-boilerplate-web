const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');
const domMakerMain = require('../../models/domMaker/mainDom');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);
    commonUtil.applyHasNumbericReqToNumber(req);

    // req.query 값 비구조화 할당
    const { page = 1, accountStatus = 'all', accountLock = 'all' } = req.query;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {MEMBER} */
    const memberWhere = {};

    await biModule.getTable('MEMBER');

    res.render('./admin/memberManage', req.locals);
  }),
);

module.exports = router;
