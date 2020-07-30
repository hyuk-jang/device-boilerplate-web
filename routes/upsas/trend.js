const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');
const commonUtil = require('../../models/templates/common.util');

const defaultDom = require('../../models/domMaker/defaultDom');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';
const DEFAULT_CATEGORY = 'inverter';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'inverter',
    btnName: '인버터',
  },
  {
    subCategory: 'connector',
    btnName: '접속반',
  },
  {
    subCategory: 'saltern',
    btnName: '염전',
  },
];

// middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // console.time('Trend Middleware');
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

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
    // const searchRange = biModule.createSearchRange({
    //   searchType: 'days',
    //   searchInterval: 'hour',
    //   strStartDate: '2020-02-16',
    //   strEndDate: '',
    // });

    // BU.CLI(searchRange);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const trendInfo = {
      siteId,
      subCategory,
      subCategoryName: _.find(subCategoryList, { subCategory }).btnName,
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    _.set(req, 'locals.trendInfo', trendInfo);
    _.set(req, 'locals.searchRange', searchRange);
    // console.timeEnd('Trend Middleware');
    next();
  }),
);

/**  공통 트렌드 */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    const { siteId } = req.locals.mainInfo;
    const { subCategory } = req.locals.trendInfo;

    // console.time('refinedInverterCharts');
    const refinedBlockCharts = await refineModel.refineBlockCharts(
      _.get(req, 'locals.searchRange'),
      subCategory,
      siteId,
    );
    // console.timeEnd('refinedInverterCharts');

    // BU.CLIN(refinedBlockCharts);

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const inverterDomTemplate = _.template(`
        <div class="lineChart_box default_area" id="<%= domId %>"></div>
    `);
    const divDomList = refinedBlockCharts.map(refinedChart =>
      inverterDomTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', refinedBlockCharts);

    if (subCategory === 'inverter' || subCategory === 'saltern') {
      next();
    } else {
      res.render('./UPSAS/trend/trend', req.locals);
    }
  }),
);

/** 인버터 트렌드 */
router.get(
  ['/', '/:siteId', '/:siteId/inverter'],
  asyncHandler(async (req, res) => {
    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    const { siteId, siteList } = req.locals.mainInfo;
    const searchRange = _.get(req, 'locals.searchRange');

    const weatherDeviceRows = await weatherModel.getWeatherTrend(searchRange, siteId);
    // BU.CLI(weatherDeviceRows);
    // plotSeries 를 구하기 위한 객체
    // const { plotSeries } = commonUtil.getMomentFormat(searchRange);
    // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
    const strGroupDateList = commonUtil.getGroupDateList(searchRange);

    // fromToKey의 첫번째 인자로 그루핑을 하고 빈 데이터가 있을 경우 집어 넣음
    const blockDataRowsGroup = commonUtil.extPerfectRows(
      'main_seq',
      weatherDeviceRows,
      strGroupDateList,
    );

    // BU.CLIN(blockDataRowsGroup);

    const { madeLineChartList } = req.locals;

    // BU.CLIN(weatherDeviceRows);

    // BU.CLIN(req.locals);

    /** @type {lineChartInfo} */
    const acLineChart = _.head(madeLineChartList);

    acLineChart.yAxis.push({
      yTitle: '일사량(W/m²)',
      // dataUnit: 'W/m²',
    });

    const includedSiteList =
      _.lowerCase(siteId) === 'all' ? _.map(siteList, 'siteId') : [_.toString(siteId)];

    includedSiteList.forEach((strSiteId, index) => {
      const dataRows = _.get(blockDataRowsGroup, strSiteId, []);
      if (dataRows.length) {
        const siteInfo = _.find(siteList, { siteId: strSiteId });
        // BU.CLI(dataRows);
        acLineChart.series = acLineChart.series.concat([
          {
            name: `${siteInfo.m_name} 일사량`,
            // tooltip: {
            //   valueSuffix: ' W/m²',
            // },
            color: BU.blendColors('#ff0000', '#0000ff', (index + 1) / 10),
            yAxis: 1,
            data: _.map(dataRows, 'avg_solar'),
          },
          //   {
          //     name: `${siteInfo.m_name} 기온`,
          //     // tooltip: {
          //     //   valueSuffix: ' ℃',
          //     // },
          //     color: BU.blendColors('#7157c4', '#ffce61', (index + 1) / 10),
          //     yAxis: 0,
          //     data: _.map(dataRows, 'avg_temp'),
          //   },
        ]);
      }
    });

    res.render('./UPSAS/trend/trend', req.locals);
  }),
);

/** 염전 트렌드 */
router.get(
  ['/:siteId/saltern'],
  asyncHandler(async (req, res) => {
    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    const { siteId, siteList } = req.locals.mainInfo;
    const searchRange = _.get(req, 'locals.searchRange');

    const weatherDeviceRows = await weatherModel.getWeatherTrend(searchRange, siteId);
    // BU.CLI(weatherDeviceRows);
    // plotSeries 를 구하기 위한 객체
    // const { plotSeries } = commonUtil.getMomentFormat(searchRange);
    // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
    const strGroupDateList = commonUtil.getGroupDateList(searchRange);

    // fromToKey의 첫번째 인자로 그루핑을 하고 빈 데이터가 있을 경우 집어 넣음
    const blockDataRowsGroup = commonUtil.extPerfectRows(
      'main_seq',
      weatherDeviceRows,
      strGroupDateList,
    );

    // BU.CLIN(blockDataRowsGroup);

    const { madeLineChartList } = req.locals;

    // BU.CLIN(weatherDeviceRows);

    // BU.CLIN(req.locals);

    /** @type {lineChartInfo} */
    const lineChart = madeLineChartList[0];

    lineChart.yAxis.push({
      yTitle: '풍속(m/s)/기온(℃)',
      // dataUnit: 'W/m²',
    });

    const includedSiteList =
      _.lowerCase(siteId) === 'all' ? _.map(siteList, 'siteId') : [_.toString(siteId)];

    includedSiteList.forEach((strSiteId, index) => {
      const dataRows = _.get(blockDataRowsGroup, strSiteId, []);
      if (dataRows.length) {
        const siteInfo = _.find(siteList, { siteId: strSiteId });
        // BU.CLI(dataRows);
        lineChart.series = lineChart.series.concat([
          {
            name: `${siteInfo.m_name} 풍속`,
            // tooltip: {
            //   valueSuffix: ' W/m²',
            // },
            color: BU.blendColors('#ff0000', '#0000ff', (index + 1) / 10),
            yAxis: 1,
            data: _.map(dataRows, 'avg_ws'),
          },
          {
            name: `${siteInfo.m_name} 기온`,
            // tooltip: {
            //   valueSuffix: ' W/m²',
            // },
            color: BU.blendColors('#7157c4', '#ffce61', (index + 1) / 10),
            yAxis: 1,
            data: _.map(dataRows, 'avg_temp'),
          },
        ]);
      }
    });

    res.render('./UPSAS/trend/trend', req.locals);
  }),
);

module.exports = router;
