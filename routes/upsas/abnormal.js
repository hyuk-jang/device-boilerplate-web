const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');

const commonUtil = require('../../models/templates/common.util');

const reportDom = require('../../models/domMaker/reportDom');
const salternDom = require('../../models/domMaker/salternDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

const mType = {
  EARTH_30: 'earth30angle',
  EARTH_0: 'earth0angle',
  WATER_0: 'water0angle',
};

const DEFAULT_CATEGORY = 'outline';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'outline',
    btnName: '종합',
  },
  {
    subCategory: 'serialModulePower',
    btnName: '직렬 모듈 간 출력 이상',
  },
  {
    subCategory: 'inverterPower',
    btnName: '인버터 출력 이상',
  },
  {
    subCategory: 'inverterFault',
    btnName: '인버터 결함',
  },
];

// analysis middleware
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/:subCategory',
    '/:siteId/:subCategory/:subCategoryId',
    '/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    // req.param 값 비구조화 할당
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    next();
  }),
);

// 이상상태 요인 분석
router.get(
  ['/', '/:siteId/outline'],
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/abnormal/outline', req.locals);
  }),
);

// 이상상태 요인 분석
router.get(
  ['/:siteId/serialModulePower'],
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/abnormal/serialModulePower', req.locals);
  }),
);

// 이상상태 요인 분석
router.get(
  ['/:siteId/inverterPower'],
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/abnormal/inverterPower', req.locals);
  }),
);

module.exports = router;
