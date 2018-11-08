const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const reportDom = require('../../models/domMaker/reportDom');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'hour';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'min10';
const DEFAULT_CATEGORY = 'inverter';
const DEFAULT_SUB_SITE = 'all';
const PAGE_LIST_COUNT = 20; // 한 페이지당 목록을 보여줄 수

// report middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory', '/:siteId/:subCategory/:subCategoryId'],
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // req.param 값 비구조화 할당
    const {
      siteId = req.user.main_seq,
      subCategory = DEFAULT_CATEGORY,
      subCategoryId = DEFAULT_SUB_SITE,
    } = req.params;

    // req.query 값 비구조화 할당
    const {
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange(
      searchType,
      strStartDateInputValue,
      strEndDateInputValue,
    );
    // const searchRange = biModule.createSearchRange(searchType, '2018-11-01', strEndDateInputValue);
    searchRange.searchInterval = searchInterval;

    // BU.CLI(reportRows);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const reportInfo = {
      siteId,
      subCategory,
      subCategoryId,
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    _.set(req, 'locals.reportInfo', reportInfo);
    _.set(req, 'locals.searchRange', searchRange);

    // // 서브 메뉴 돔
    // const subCategoryDom = reportDom.makeSubCategoryDom(subCategory);
    // _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    next();
  }),
);

/** 인버터 레포트 */
router.get(
  ['/', '/:siteId', '/:siteId/inverter', '/:siteId/inverter/:subCategoryId'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    // req.param 값 비구조화 할당
    const { siteId = req.user.main_seq, subCategoryId = DEFAULT_SUB_SITE } = req.params;
    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;
    const inverterWhere = BU.isNumberic(subCategoryId)
      ? { inverter_seq: Number(subCategoryId) }
      : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _(powerProfileRows)
      .filter(inverterWhere)
      .map('inverter_seq')
      .value();

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    // BU.CLI(req.query);
    // BU.CLI(searchRangeInfo);
    // 레포트 추출 --> 총 개수, TableRows 반환
    const { reportRows, totalCount } = await powerModel.getInverterReport(
      searchRangeInfo,
      { page, pageListCount: PAGE_LIST_COUNT },
      inverterSeqList,
    );

    // BU.CLI(reportRows);

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/report/${siteId}/inverter/${subCategoryId}`,
      _.get(req, 'locals.reportInfo'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    // 인버터 사이트 목록 돔 추가
    const inverterSiteDom = reportDom.makeInverterSiteDom(powerProfileRows, subCategoryId);
    _.set(req, 'locals.dom.subSelectBoxDom', inverterSiteDom);

    // 인버터 보고서 돔 추가
    const inverterReportDom = reportDom.makeInverterReportDom(reportRows, paginationInfo);
    _.set(req, 'locals.dom.reportDom', inverterReportDom);

    res.render('./report/rInverter', req.locals);
  }),
);

/** 생육 환경 레포트 */
router.get(
  ['/', '/:siteId', '/:siteId/sensor', '/:siteId/sensor/:subCategoryId'],
  asyncHandler(async (req, res) => {
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // req.param 값 비구조화 할당
    const { siteId = req.user.main_seq, subCategoryId = DEFAULT_SUB_SITE } = req.params;
    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;

    /** @type {V_DV_PLACE_RELATION[]} */
    const viewPlaceRelationRows = await biDevice.getTable('v_dv_place_relation', mainWhere);

    // IVT가 포함된 장소는 제거.
    _.remove(viewPlaceRelationRows, placeRelation => _.includes(placeRelation.place_id, 'IVT'));

    // BU.CLI(viewPlaceRelationRows);

    res.render('./report/rSensor', req.locals);
  }),
);

module.exports = router;

// const testArray = [
//   ['min', strStartDate, strEndDate],
//   ['min10', strStartDate, strEndDate],
//   ['hour', strStartDate, strEndDate],
//   ['min10', '2018-11-01'],
//   ['day', '2018-11-01'],
//   ['hour', '2018-11-01'],
//   ['range', '2018-11-01', '2018-11-25'],
// ];

// BU.CLI('??');
// const result = _.map(testArray, ele => {
//   const get = powerModel.createSearchRange(...ele);
//   const create = powerModel.createSearchRange(...ele);
//   BU.CLIS(get, create);
//   if (_.isEqual(get, create)) {
//     return true;
//   }
//   return false;
// });
// BU.CLI(result);
