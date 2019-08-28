const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const commonUtil = require('../../models/templates/common.util');
const sensorUtil = require('../../models/templates/sensor.util');
const weatherModel = require('../../models/templates/WeatherModel');

const DeviceProtocol = require('../../models/DeviceProtocol');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    /** @type {V_PW_PROFILE[]} powerProfileRows */
    const powerProfileRows = req.locals.viewPowerProfileRows;

    // ********** Power 관련
    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    /** @type {WC_KMA_DATA} */
    const weatherCastInfo = _.get(req, 'locals.weatherCastInfo');

    // BU.CLI(searchRangeInfo);

    // 발전 현황을 나타내는 기본적인 정보
    const { powerGenerationInfo, validInverterDataList } = await refineModel.refineGeneralPowerInfo(
      siteId,
    );

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    // 인버터 평균 출력 현황 차트로 긁어옴
    const inverterLineChart = await refineModel.refineInverterChart(
      searchRangeInfo,
      inverterSeqList,
      {
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
      },
    );

    // BU.CLIN(inverterLineChart, 3);

    // 인버터 현재 데이터 동적 생성 돔
    _.set(
      req,
      'locals.dom.inverterStatusListDom',
      domMakerMain.makeInverterStatusDom(validInverterDataList),
    );

    // TODO:
    req.locals.inverterLineChart = inverterLineChart;
    req.locals.powerGenerationInfo = powerGenerationInfo;
    req.locals.weatherCastInfo = weatherCastInfo;

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
