const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');

const domMakerInverter = require('../../models/domMaker/inverterDom');

// middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // Site Sequence.지점 Id를 불러옴

    const measureInfo = {
      measureTime: `${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };

    _.set(req, 'locals.measureInfo', measureInfo);

    next();
  }),
);

/* GET home page. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { mainWhere, siteId },
      searchRange,
      viewPowerProfileRows,
    } = req.locals;

    // 10분 간격
    searchRange.searchInterval = 'min10';

    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    const inverterStatusList = await refineModel.refineInverterStatus(inverterSeqList);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const invStatusBodyDom = domMakerInverter.makeInverterStatusList(inverterStatusList);

    // BU.CLI(invStatusBodyDom);

    _.set(req, 'locals.dom.invStatusBodyDom', invStatusBodyDom);

    const { chartDomList, chartList } = await commonUtil.getDynamicChartDom({
      searchRange,
      siteId,
      mainNavi: 'inverter',
      // subNavi: 'inverter',
    });

    _.set(req, 'locals.dom.chartDomList', chartDomList);
    _.set(req, 'locals.chartList', chartList);

    res.render('./inverter/inverter', req.locals);
  }),
);

module.exports = router;
