const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const commonUtil = require('../../models/templates/common.util');
const sensorUtil = require('../../models/templates/sensor.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    // ********** Power 관련
    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    // BU.CLI(searchRangeInfo);

    // 발전 현황을 나타내는 기본적인 정보
    const { powerGenerationInfo, validInverterDataList } = await refineModel.getGeneralPowerInfo(
      siteId,
    );

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    // 인버터 평균 출력 현황 차트로 긁어옴
    const inverterLineChart = await refineModel.getInverterChart(searchRangeInfo, inverterSeqList, {
      domId: 'daily_kw_graph',
      // title: '인버터 발전 현황',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        // groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    });

    // BU.CLIN(inverterLineChart, 3);

    // 인버터 현재 데이터 동적 생성 돔
    _.set(
      req,
      'locals.dom.inverterStatusListDom',
      domMakerMain.makeInverterStatusDom(validInverterDataList),
    );

    req.locals.inverterLineChart = inverterLineChart;

    req.locals.powerGenerationInfo = powerGenerationInfo;

    // BU.CLI(req.locals);
    res.render('./UPSAS/main/index', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/main/index', req.locals);
  }),
);

module.exports = router;
