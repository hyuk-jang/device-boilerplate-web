const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');
const reportDom = require('../../models/domMaker/reportDom');

const sensorUtil = require('../../models/templates/sensor.util');
const excelUtil = require('../../models/templates/excel.util');
const commonUtil = require('../../models/templates/common.util');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';
const DEFAULT_CATEGORY = 'inverter';
const DEFAULT_SUB_SITE = 'all';
const PAGE_LIST_COUNT = 20; // 한 페이지당 목록을 보여줄 수

const DeviceProtocol = require('../../models/DeviceProtocol');

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'inverter',
    btnName: '인버터',
  },
  // {
  //   subCategory: 'connector',
  //   btnName: '접속반',
  // },
  // {
  //   subCategory: 'saltern',
  //   btnName: '염전',
  // },
];

// report middleware
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/:subCategory',
    '/:siteId/:subCategory/:subCategoryId',
    '/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    const {
      mainInfo: { siteId, subCategory = DEFAULT_CATEGORY, subCategoryId = DEFAULT_SUB_SITE },
    } = req.locals;

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
    //   strStartDate: '2019-03-28',
    //   strEndDate: '',
    // });

    // BU.CLI(searchRange);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const reportInfo = {
      siteId,
      subCategory,
      subCategoryName: _.find(subCategoryList, { subCategory }).btnName,
      subCategoryId,
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };
    _.set(req, 'locals.reportInfo', reportInfo);
    _.set(req, 'locals.searchRange', searchRange);
    next();
  }),
);

/** 인버터 조회 절 생성 */
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/:inverter',
    '/:siteId/:inverter/:subCategoryId',
    '/:siteId/:inverter/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    const {
      mainInfo: { mainWhere },
      viewPowerProfileRows,
      reportInfo: { subCategoryId },
    } = req.locals;

    const inverterWhere = _.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null;
    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _(powerProfileRows)
      .filter(inverterWhere)
      .map('inverter_seq')
      .value();

    // Block Report 조회절
    _.set(req, 'locals.whereColumnInfo', {
      column: 'inverter_seq',
      seqList: inverterSeqList,
    });

    // 서브 카테고리 이름 목록
    const subCategoryNameList = _.map(inverterSeqList, seq => {
      /** @type {subCategoryNameInfo} */
      const subCategoryInfo = {
        seq,
        name: _.chain(powerProfileRows)
          .find({ inverter_seq: Number(seq) })
          .thru(row => `${_.get(row, 'm_name')} ${_.get(row, 'ivt_target_name')}`)
          .value(),
      };
      return subCategoryInfo;
    });

    // 서브 카테고리 req 객체에 저장
    _.set(req, 'locals.subCategoryNameList', subCategoryNameList);

    // 인버터 사이트 목록 돔 추가
    const inverterSiteDom = reportDom.makeInverterSiteDom(powerProfileRows, subCategoryId);
    _.set(req, 'locals.dom.subSelectBoxDom', inverterSiteDom);

    return next();
  }),
);

/** 템플릿 레포트 */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory', '/:siteId/:subCategory/:subCategoryId'],
  asyncHandler(async (req, res) => {
    /** @type {BlockModel} */
    const blockModel = global.app.get('blockModel');

    const { siteId } = req.locals.mainInfo;
    const { subCategory, subCategoryId } = req.locals.reportInfo;

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // Block Report 조회를 위한
    const whereColumnInfo = _.get(req, 'locals.whereColumnInfo', {});

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    const deviceProtocol = new DeviceProtocol();

    const { dbTableInfo, domTableColConfigs } = deviceProtocol.getBlockReport(subCategory);

    const { reportRows, totalCount } = await blockModel.getDynamicReport(
      {
        searchRange: searchRangeInfo,
        dynamicQueryConfig: dbTableInfo,
        whereColumnInfo,
      },
      { page, pageListCount: PAGE_LIST_COUNT },
    );

    // 인버터 보고서 돔 추가
    const { tableHeaderDom, tableBodyDom } = defaultDom.makeDynamicBlockTable(
      {
        dataRows: reportRows,
        blockTableOptions: domTableColConfigs,
      },
      { page, pageListCount: PAGE_LIST_COUNT },
    );

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/report/${siteId}/${subCategory}/${subCategoryId}`,
      _.get(req, 'locals.reportInfo'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    res.render('./UPSAS/report/report', req.locals);
  }),
);

/** 템플릿 엑셀 다운로드 */
router.get(
  ['/:siteId/:subCategory/:subCategoryId/excel'],
  asyncHandler(async (req, res) => {
    /** @type {BlockModel} */
    const blockModel = global.app.get('blockModel');

    const { subCategory } = req.locals.reportInfo;

    // Block Report 조회를 위한
    /** @type {whereColumnOption} */
    const whereColumnInfo = _.get(req, 'locals.whereColumnInfo', {});

    /** @type {subCategoryNameInfo[]} */
    const subCategoryNameList = _.get(req, 'locals.subCategoryNameList', {});

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    const deviceProtocol = new DeviceProtocol();

    const { dbTableInfo, domTableColConfigs } = deviceProtocol.getBlockReport(subCategory);

    const dataRows = await blockModel.getDynamicTrend({
      searchRange: searchRangeInfo,
      dynamicQueryConfig: dbTableInfo,
      whereColumnInfo,
    });

    const groupedData = _.groupBy(dataRows, whereColumnInfo.column);

    // 인버터 별로 엑셀 시트를 생성
    const excelWorkSheetList = _.map(groupedData, (trendRows, seq) => {
      // BU.CLI(strInverterSeq, trendRows);
      // 엑셀 시트 생성
      return excelUtil.makeEWSWithBlock(trendRows, {
        blockName: _.find(subCategoryNameList, { seq: Number(seq) }).name,
        searchRangeInfo,
        strGroupDateList: commonUtil.getGroupDateList(searchRangeInfo),
        blockViewOptionList: _.reject(
          domTableColConfigs,
          config => config.dataKey === 'group_date',
        ),
      });
    });

    // BU.CLI(excelWorkSheetList);

    // console.time('makeExcelWorkBook');
    const excelWorkBook = excelUtil.makeExcelWorkBook('test', excelWorkSheetList);
    // console.timeEnd('makeExcelWorkBook');

    // BU.CLIN(excelWorkBook);

    // // res.send('hi');
    const { rangeStart, rangeEnd } = searchRangeInfo;
    const fileName = `${rangeStart}${rangeEnd.length ? ` ~ ${rangeEnd}` : ''}`;
    res.send({ fileName, workBook: excelWorkBook });
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

// /** 템플릿 레포트 */
// router.get(
//   [
//     '/:siteId',
//     '/:siteId/inverter',
//     '/:siteId/inverter/:subCategoryId',
//     '/:siteId/inverter/:subCategoryId/:finalCategory',
//   ],
//   asyncHandler(async (req, res, next) => {
//     /** @type {PowerModel} */
//     const powerModel = global.app.get('powerModel');

//     /** @type {MEMBER} */
//     const { siteId } = req.locals.mainInfo;
//     // req.param 값 비구조화 할당
//     const { subCategoryId = DEFAULT_SUB_SITE } = req.params;

//     // req.query 값 비구조화 할당
//     const { page = 1 } = req.query;

//     // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
//     const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;
//     const inverterWhere = _.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null;

//     /** @type {V_PW_PROFILE[]} */
//     const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

//     // 인버터 Seq 목록
//     const inverterSeqList = _(powerProfileRows)
//       .filter(inverterWhere)
//       .map('inverter_seq')
//       .value();

//     /** @type {searchRange} */
//     const searchRangeInfo = _.get(req, 'locals.searchRange');

//     // 엑셀 다운로드 요청일 경우에는 현재까지 계산 처리한 Rows 반환
//     if (_.get(req.params, 'finalCategory', '') === 'excel') {
//       // BU.CLI('인버터 엑셀 출력 Next', searchRangeInfo);
//       _.set(req, 'locals.powerProfileRows', powerProfileRows);
//       _.set(req, 'locals.inverterSeqList', inverterSeqList);
//       return next();
//     }

//     // SQL 질의를 위한 검색 정보 옵션 객체 생성
//     // BU.CLI(req.query);
//     // 레포트 추출 --> 총 개수, TableRows 반환
//     const { reportRows, totalCount } = await powerModel.getInverterReport(
//       searchRangeInfo,
//       { page, pageListCount: PAGE_LIST_COUNT },
//       inverterSeqList,
//     );

//     // BU.CLI(reportRows);

//     // 페이지 네이션 생성
//     let paginationInfo = DU.makeBsPagination(
//       page,
//       totalCount,
//       `/report/${siteId}/inverter/${subCategoryId}`,
//       _.get(req, 'locals.reportInfo'),
//       PAGE_LIST_COUNT,
//     );

//     // 페이지네이션 돔 추가
//     _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

//     // 페이지 정보 추가
//     paginationInfo = _.omit(paginationInfo, 'paginationDom');
//     _.set(req, 'locals.paginationInfo', paginationInfo);

//     // 인버터 사이트 목록 돔 추가
//     const inverterSiteDom = reportDom.makeInverterSiteDom(powerProfileRows, subCategoryId);
//     _.set(req, 'locals.dom.subSelectBoxDom', inverterSiteDom);

//     const deviceProtocol = new DeviceProtocol();
//     // 인버터 보고서 돔 추가

//     const { tableHeaderDom, tableBodyDom } = reportDom.makeInverterReportDom(reportRows, {
//       blockViewList: deviceProtocol.reportInverterViewList,
//       page,
//       pageListCount: PAGE_LIST_COUNT,
//     });

//     // const inverterReportDom = reportDom.makeInverterReportDom(reportRows, {
//     //   blockViewList: deviceProtocol.reportInverterViewList,
//     //   page,
//     //   pageListCount: PAGE_LIST_COUNT,
//     // });

//     _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
//     _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

//     res.render('./UPSAS/report/report', req.locals);
//   }),
// );
