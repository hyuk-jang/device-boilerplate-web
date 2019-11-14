const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const domMakerInverter = require('../../models/domMaker/inverterDom');

const HORIZONTAL_SOLAR = 'horizontalSolar';

/* GET home page. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {V_PW_PROFILE[]} powerProfileRows */
    const powerProfileRows = req.locals.viewPowerProfileRows;

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    const refinedInverterStatusList = await refineModel.refineInverterStatus(inverterSeqList);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const inverterStatusListDom = domMakerInverter.makeInverterStatusList(
      refinedInverterStatusList,
    );

    _.set(req, 'locals.dom.inverterStatusListDom', inverterStatusListDom);

    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    // BU.CLI(momentFormat);
    /** @type {lineChartConfig} */
    const chartConfig = {
      domId: 'chart_div',
      title: '인버터 발전 현황',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    };

    // 동적 라인 차트를 생성
    const inverterLineChart = await refineModel.refineInverterChart(
      searchRange,
      inverterSeqList,
      chartConfig,
    );

    req.locals.inverterLineChart = inverterLineChart;
    req.locals.measureInfo = {
      measureTime: `${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };
    // BU.CLIN(req.locals);
    res.render('./inverter/inverter', req.locals);
  }),
);

module.exports = router;
