const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const sensorUtil = require('../../models/templates/sensor.util');
const commonUtil = require('../../models/templates/common.util');

const webUtil = require('../../models/templates/web.util');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';

// trend middleware
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;

    // req.query 값 비구조화 할당
    const {
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      searchOption = DEFAULT_SEARCH_OPTION,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // BU.CLI(req.query);

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });

    // BU.CLI(searchRange);
    // const searchRange = biModule.createSearchRange({
    //   // searchType: 'months',
    //   // searchType: 'days',
    //   searchType: 'range',
    //   searchInterval: 'hour',
    //   strStartDate: '2019-03-23',
    //   // strEndDate: '',
    //   strEndDate: '2019-03-25',
    // });

    // BU.CLI(searchRange);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const trendInfo = {
      siteId,
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    _.set(req, 'locals.trendInfo', trendInfo);
    _.set(req, 'locals.searchRange', searchRange);
    next();
  }),
);

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    const solarRows = await biDevice.getTable('v_solar_profile');

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');
    // BU.CLI(searchRangeInfo);

    const strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo);
    // BU.CLI(strGroupDateList);
    // plotSeries 를 구하기 위한 객체
    const momentFormat = sensorUtil.getMomentFormat(searchRangeInfo);

    const solarTrend = await biDevice.getSolarTrend(searchRangeInfo, _.map(solarRows, 'solar_seq'));
    // BU.CLI(solarTrend);
    const sortTrend = sensorUtil.sortSolarData(null, solarTrend, strGroupDateList);
    // BU.CLI(sortTrend);

    const refineChart = sensorUtil.makeSolarLineChart(
      {
        domId: 'sensorArea',
        title: '일사량',
        chartOptionList: [
          {
            keys: ['solar'],
            mixColors: [null, '#d9480f'],
            yTitle: '일사량',
            dataUnit: ' W/m²',
          },
        ],
      },
      sortTrend,
      momentFormat.plotSeries,
    );

    _.forEach(refineChart.series, chart => {
      const solarRow = _.find(solarRows, { solar_seq: Number(chart.name) });
      if (solarRow) {
        chart.name = solarRow.solar_name;
      }
    });

    _.set(req, 'locals.refineChart', refineChart);

    // const chartOption = {
    //   selectKey: 'solar',
    //   dateKey: 'group_date',
    //   groupKey: 'solar_seq',
    // };

    // const solarChart = webUtil.makeStaticChartData(solarTrend, betweenDatePoint, chartOption);
    // webUtil.mappingChartDataName(solarChart, solarRows, 'solar_seq', 'solar_name');

    // _.set(req, 'locals.solarChart', solarChart);

    res.render('./templates/solar/trend/trend', req.locals);
  }),
);

module.exports = router;
