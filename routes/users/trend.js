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
// const DEFAULT_CATEGORY = 'inverter';

/** @type {projectConfig} */
const pConfig = global.projectConfig;

const { naviList } = pConfig;

const subCategoryList = _.chain(naviList)
  .find({ href: 'trend' })
  .get('subCategoryList')
  .value();

// trend middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;
    const { subCategory = subCategoryList[0].subCategory } = req.params;

    // console.time('Trend Middleware');
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

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
    //   strStartDate: '2019-05-21',
    //   strEndDate: '',
    // });

    // BU.CLI(searchRange);

    // BU.CLI(subCategoryList);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const trendInfo = {
      siteId,
      subCategory,
      subCategoryName: _.chain(subCategoryList)
        .find({ subCategory })
        .get('btnName', '')
        .value(),
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

/** 트렌드 */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    const {
      searchRange,
      mainInfo: { siteId },
      trendInfo: { subCategory, subCategoryName },
    } = req.locals;

    // 서브 카테고리 이름이 없을 경우 존재하지 않는 href로 판단
    if (subCategoryName.length === 0) {
      return next();
    }

    const { chartDomList, chartList } = await commonUtil.getDynamicChartDom({
      searchRange,
      siteId,
      mainNavi: 'trend',
      subNavi: subCategory,
    });

    _.set(req, 'locals.dom.chartDomList', chartDomList);

    _.set(req, 'locals.chartList', chartList);

    res.render('./trend/trend', req.locals);
  }),
);

module.exports = router;
