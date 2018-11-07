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

/** 인버터 목록 조회 */
router.get(
  ['/', '/:siteId', '/:siteId/inverter', '/:siteId/inverter/:inverterId'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    // req.param 값 비구조화 할당
    const { siteId = req.user.main_seq, inverterId = DEFAULT_SUB_SITE } = req.params;
    // req.query 값 비구조화 할당
    const {
      page = 1,
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      strStartDate = moment().format('YYYY-MM-DD'),
      strEndDate = '',
    } = req.query;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;
    const inverterWhere = BU.isNumberic(inverterId) ? { inverter_seq: Number(inverterId) } : null;

    BU.CLIN(req.locals);

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _(powerProfileRows)
      .filter(inverterWhere)
      .map('inverter_seq')
      .value();

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    // const searchRange = powerModel.createSearchRange(searchType, strStartDate, strEndDate);
    const searchRange = powerModel.createSearchRange(searchType, '2018-11-01', strEndDate);
    searchRange.searchInterval = searchInterval;
    // searchRange.page = Number(page);
    // searchRange.pageListCount = PAGE_LIST_COUNT;

    const { reportRows, totalCount } = await powerModel.getInverterReport(
      searchRange,
      { page, pageListCount: PAGE_LIST_COUNT },
      inverterSeqList,
    );

    // BU.CLI(reportRows);
    const reportInfo = {
      strStartDate: searchRange.strStartDateInputValue,
      strEndDate: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/report/${siteId}/inverter/${inverterId}`,
      reportInfo,
      PAGE_LIST_COUNT,
    );
    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    // 인버터 사이트 목록 돔 추가
    const inverterSiteDom = reportDom.makeInverterSiteDom(powerProfileRows, inverterId);
    _.set(req, 'locals.dom.inverterSiteDom', inverterSiteDom);

    // 인버터 보고서 돔 추가
    const inverterReportDom = reportDom.makeInverterReportDom(reportRows, paginationInfo);
    _.set(req, 'locals.dom.inverterReportDom', inverterReportDom);

    res.render('./report/report', req.locals);
  }),
);

/* GET home page. */
router.get(
  '/test',
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    // 지점 Id를 불러옴
    const { siteId } = req.locals;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const pwProfileWhereInfo = _.eq(siteId, 'all') ? null : { main_seq: siteId };

    // Power 현황 테이블에서 선택한 Site에 속해있는 인버터 목록을 가져옴
    // /** @type {V_PW_PROFILE[]} */
    // const viewPowerProfileRows = await biModule.getTable('v_pw_profile', pwProfileWhereInfo, false);
    // const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');

    // 인버터별 경사 일사량을 가져옴
    // const INCLINED_SOLAR = 'inclinedSolar';
    // const placeDataList = await biDevice.extendsPlaceDeviceData(
    //   viewPowerProfileRows,
    //   INCLINED_SOLAR,
    // );

    /** @type {V_PW_INVERTER_PROFILE[]} */
    let viewPowerProfileList = _.filter(req.locals.viewPowerProfileRows, pwProfileWhereInfo);

    let inverterSeqList = [];
    const selectedInverterStrSeq = req.query.inverter_seq;
    if (BU.isNumberic(selectedInverterStrSeq)) {
      inverterSeqList = Number(selectedInverterStrSeq);
      viewPowerProfileList = _.filter(viewPowerProfileList, { inverter_seq: inverterSeqList });
    } else {
      inverterSeqList = _.map(viewPowerProfileList, 'inverter_seq');
    }

    const queryPage = req.query.page || 1;
    // 조회 간격
    const searchInterval = req.query.search_interval
      ? req.query.search_interval
      : DEFAULT_RANGE_FORMAT;

    const searchType = req.query.search_type ? req.query.search_type : 'hour';

    const searchRange = powerModel.createSearchRange(
      searchType,
      req.query.start_date,
      req.query.end_date,
    );

    searchRange.searchInterval = searchInterval;
    // searchRange.searchType = searchType;
    searchRange.page = Number(queryPage);
    searchRange.pageListCount = 20;

    /** @type {V_PW_INVERTER_PROFILE[]} */
    const viewInverterProfileRows = await powerModel.getTable('v_pw_inverter_profile', {
      inverter_seq: inverterSeqList,
    });
    const reportList = await powerModel.getInverterReport(searchRange, inverterSeqList);

    const queryString = {
      inverter_seq: inverterSeqList,
      start_date: searchRange.strStartDateInputValue,
      end_date: searchRange.strEndDateInputValue,
      search_type: searchType,
      search_interval: searchInterval,
    };

    const paginationInfo = DU.makeBsPagination(
      searchRange.page,
      reportList.totalCount,
      '/report',
      queryString,
      searchRange.pageListCount,
    );

    const deviceList = await powerModel.getInverterList(inverterSeqList);

    viewInverterProfileRows.unshift({
      inverter_seq: 'all',
      target_name: '모두',
    });

    const inverterReportsDom = makeInverterReportsDom(reportList.reportRows, paginationInfo);
    const inverterSitesDom = makeInverterSitesDom(viewInverterProfileRows, siteId);

    req.locals.inverter_seq = inverterSeqList;
    req.locals.inverterReportsDom = inverterReportsDom;
    req.locals.inverterSitesDom = inverterSitesDom;
    req.locals.device_list = deviceList;
    req.locals.searchRange = searchRange;
    req.locals.reportList = reportList.reportRows;
    req.locals.paginationInfo = paginationInfo;

    res.render('./report/report', req.locals);
  }),
);

module.exports = router;

/**
 *
 * @param {PW_INVERTER_DATA[]} inverterReportRows
 * @param {page: number, pageListCount: number} paginationInfo
 */
function makeInverterReportsDom(inverterReportRows, paginationInfo) {
  const firstRowNum = (paginationInfo.page - 1) * paginationInfo.pageListCount;
  const inverterReportTemplate = _.template(`
        <tr>
        <td><%= num %></td>
        <td><%= group_date %></td>
        <td><%= avg_pv_a %></td>
        <td><%= avg_pv_v %></td>
        <td><%= avg_pv_kw %></td>
        <td><%= avg_grid_r_a %></td>
        <td><%= avg_grid_rs_v %></td>
        <td><%= avg_line_f %></td>
        <td><%= avg_power_kw %></td>
        <td><%= powerFactor %></td>
        <td><%= total_c_mwh %></td>
      </tr>
    `);
  const inverterReportsDom = inverterReportRows.map((row, index) => {
    const pvKw = _.get(row, 'avg_pv_kw', '');
    const powerKw = _.get(row, 'avg_power_kw', '');

    // 번호
    _.set(row, 'num', firstRowNum + index + 1);
    // 발전 효율
    _.set(row, 'powerFactor', _.round(_.divide(powerKw, pvKw) * 100, 1));

    return inverterReportTemplate(row);
  });

  return inverterReportsDom;
}

/**
 *
 * @param {V_PW_INVERTER_PROFILE[]} vInverterProfileRows
 * @param {string} selectedId
 */
function makeInverterSitesDom(vInverterProfileRows, selectedId) {
  const template = _.template(`
  <option selected="<%= selected %>" data-type="inverter" value="<%= inverter_seq %>"><%= inverterName %></option>
`);
  const madeDom = vInverterProfileRows.map(row => {
    const { name = '', target_name: targetName, director_name: dName = '' } = row;
    _.set(row, 'selected', _.eq(row.inverter_seq, selectedId) ? 'selected' : '');
    const inverterName = `${name}${name.length ? ' ' : ''}${
      _.isNil(targetName) ? '' : targetName
    } ${_.isNil(dName) ? '' : dName}`;
    _.set(row, 'inverterName', inverterName);
    return template(row);
  });

  return madeDom;
}

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
