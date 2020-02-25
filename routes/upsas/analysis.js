const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const domMakerMain = require('../../models/domMaker/mainDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

const DEFAULT_CATEGORY = 'efficiency';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'efficiency',
    btnName: '효율분석',
  },
  {
    subCategory: 'prediction',
    btnName: '예측분석',
  },
];

router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
      viewPowerProfileRows,
    } = req.locals;

    // BU.CLI(req.locals);
    res.render('./UPSAS/analysis/efficiency', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/main/index', req.locals);
  }),
);

module.exports = router;
