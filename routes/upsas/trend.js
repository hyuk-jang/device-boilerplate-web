const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

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
    //   strStartDate: '2019-08-16',
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

/** 인버터 트렌드 */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res) => {
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    const { siteId } = req.locals.mainInfo;
    const { subCategory } = req.locals.trendInfo;

    // console.time('refinedInverterCharts');
    const refinedInverterCharts = await refineModel.refineBlockCharts(
      _.get(req, 'locals.searchRange'),
      subCategory,
      siteId,
    );
    // console.timeEnd('refinedInverterCharts');

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const inverterDomTemplate = _.template(`
        <div class="lineChart_box default_area" id="<%= domId %>"></div>
    `);
    const divDomList = refinedInverterCharts.map(refinedChart =>
      inverterDomTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', refinedInverterCharts);

    res.render('./UPSAS/trend/trend', req.locals);
  }),
);

module.exports = router;
