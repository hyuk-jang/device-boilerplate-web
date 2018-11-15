const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const reportDom = require('../../models/domMaker/reportDom');

const sensorUtil = require('../../models/templates/sensor.util');
const commonUtil = require('../../models/templates/common.util');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'hour';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'min10';
const DEFAULT_SEARCH_OPTION = 'merge';
const DEFAULT_CATEGORY = 'sensor';
const DEFAULT_SUB_SITE = 'all';
const PAGE_LIST_COUNT = 20; // 한 페이지당 목록을 보여줄 수

const { BaseModel } = require('../../../device-protocol-converter-jh');

const SensorProtocol = require('../../models/SensorProtocol');

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
      searchOption = DEFAULT_SEARCH_OPTION,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });
    // const searchRange = biModule.createSearchRange({
    //   searchType: 'min10',
    //   strStartDate: '2018-11-11',
    //   strEndDate: '',
    // });

    // BU.CLI(searchRange);
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

/** 생육 환경 레포트 */
router.get(
  ['/', '/:siteId', '/:siteId/sensor', '/:siteId/sensor/:subCategoryId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    const tempTemplate = _.template(`
      <tr class="<%= trClass %>" >
        <td><%= num %></td>
        <td><%= group_date %></td>
        <td><%= module_name %></td>
        <td><%= ac_a %></td>
        <td><%= ac_v %></td>
        <td><%= ac_w %></td>
        <td><%= c_kwh %></td>
        <td><%= pr_temp %></td>
        <td><%= w_temp %></td>
        <td><%= o_temp %></td>
      </tr>
    `);

    const moduleList = ['냉각형모듈(200 W)', '일반형모듈(200 W)'];
    const currMoment = moment().set('minutes', 0);
    currMoment.set('hour', 14);

    const domList = [];
    let cKwh = _.random(1.67, 2.92);
    for (let index = 0; index < 20; index++) {
      const selectNum = index % 2;
      domList.push(
        tempTemplate({
          trClass: selectNum ? 'info' : '',
          num: index + 1,
          group_date: currMoment.format('YYYY-MM-DD HH:mm'),
          module_name: moduleList[index % 2],
          ac_a: _.random(1.43, 1.68).toFixed(1),
          ac_v: _.random(150.2, 160.8).toFixed(1),
          ac_w: _.random(190.6, 210.5).toFixed(1),
          c_kwh: (cKwh += _.random(0.01, 0.02)).toFixed(1),
          pr_temp: _.random(21.5, 22.7).toFixed(1),
          w_temp: selectNum ? _.random(19.5, 19.7).toFixed(1) : _.random(22.1, 22.8).toFixed(1),
          o_temp: _.random(17.1, 17.3).toFixed(1),
        }),
      );
      if (selectNum === 1) {
        currMoment.add(10, 'minutes');
      }
    }

    _.set(req, 'locals.dom.reportDom', _.flatten(domList));

    let paginationInfo = DU.makeBsPagination(
      1,
      300,
      '/report',
      _.get(req, 'locals.reportInfo'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    res.render('./templates/Ean/report/report', req.locals);
  }),
);

/** 인버터 레포트 */
router.get(
  ['/:siteId', '/:siteId/inverter', '/:siteId/inverter/:subCategoryId'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});
    // req.param 값 비구조화 할당
    const { siteId = user.main_seq, subCategoryId = DEFAULT_SUB_SITE } = req.params;

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;
    const inverterWhere = _.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null;

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
