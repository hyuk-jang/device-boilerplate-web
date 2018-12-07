const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const reportDom = require('../../models/domMaker/reportDom');

const sensorUtil = require('../../models/templates/sensor.util');
const excelUtil = require('../../models/templates/excel.util');
const commonUtil = require('../../models/templates/common.util');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'hour';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';
const DEFAULT_CATEGORY = 'sensor';
const DEFAULT_SUB_SITE = 'all';
const PAGE_LIST_COUNT = 20; // 한 페이지당 목록을 보여줄 수

const { BaseModel } = require('../../../device-protocol-converter-jh');

const SensorProtocol = require('../../models/SensorProtocol');

// report middleware
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/:subCategory',
    '/:siteId/:subCategory/:subCategoryId',
    '/:siteId/sensor/:subCategoryId/:finalCategory',
  ],
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
    //   strStartDate: '2018-11-10',
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

    next();
  }),
);

/** 생육 환경 레포트 */
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/sensor',
    '/:siteId/sensor/:subCategoryId',
    '/:siteId/sensor/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});
    // req.param 값 비구조화 할당
    const { siteId = user.main_seq, subCategoryId = DEFAULT_SUB_SITE } = req.params;

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // 모든 노드를 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;
    const sensorWhere = _.isNumber(subCategoryId) ? { place_seq: subCategoryId } : null;

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    /** @type {V_DV_PLACE[]} */
    const placeRows = await biDevice.getTable('v_dv_place', mainWhere, false);

    // BU.CLI(placeRows);
    // BU.CLI(_.assign(mainWhere, sensorWhere));
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationRows = await biDevice.getTable(
      'v_dv_place_relation',
      _.assign(mainWhere, sensorWhere),
      false,
    );

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');
    // BU.CLI(searchRangeInfo);

    // console.time('getSensorReport');
    /** @type {sensorReport[]} */
    let sensorReportRows = await biDevice.getSensorReport(
      searchRangeInfo,
      _.map(placeRelationRows, 'node_seq'),
    );
    // console.timeEnd('getSensorReport');
    // BU.CLI(sensorReportRows);

    // 엑셀 다운로드 요청일 경우에는 현재까지 계산 처리한 Rows 반환
    if (_.get(req.params, 'finalCategory', '') === 'excel') {
      _.set(req, 'locals.placeRows', placeRows);
      _.set(req, 'locals.placeRelationRows', placeRelationRows);
      _.set(req, 'locals.sensorReportRows', sensorReportRows);
      return next();
    }

    // 날짜 내림 차순으로 정렬
    sensorReportRows = _.reverse(sensorReportRows);

    // console.time('extPlaRelSensorRep');
    // 그루핑 데이터를 해당 장소에 확장 (Extends Place Realtion Rows With Sensor Report Rows)
    sensorUtil.extPlaRelWithSenRep(placeRelationRows, sensorReportRows);
    // console.timeEnd('extPlaRelSensorRep');

    // BU.CLIN(placeRelationRows, 2);

    // BU.CLI(sensorGroupRows);

    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const sensorProtocol = new SensorProtocol(siteId);

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('makeNodeDefStorageList');
    const nodeDefStorageList = sensorUtil.makeNodeDefStorageList(
      placeRelationRows,
      sensorProtocol.pickedNodeDefIdListEan,
    );
    // console.timeEnd('makeNodeDefStorageList');

    // 실제 사용된 데이터 그룹 Union 처리하여 반환
    const strGroupDateList = sensorUtil.getDistinctGroupDateList(sensorReportRows);

    const sensorGroupDateInfo = sensorUtil.sliceStrGroupDateList(strGroupDateList, {
      page,
      pageListCount: PAGE_LIST_COUNT,
    });

    // BU.CLI(sensorGroupDateInfo);
    // console.time('calcMergedReportStorageList');
    // 데이터 그룹의 평균 값 산출
    // FIXME: 병합은 하지 않음. 이슈 생길 경우 대처
    if (searchRangeInfo.searchOption === DEFAULT_SEARCH_OPTION) {
      // 동일 Node Def Id 를 사용하는 저장소 데이터를 GroupDate 별로 합산처리
      sensorUtil.calcMergedReportStorageList(nodeDefStorageList, sensorGroupDateInfo);
      const { sensorReportHeaderDom, sensorReportBodyDom } = reportDom.makeSensorReportDomByCombine(
        nodeDefStorageList,
        {
          pickedNodeDefIdList: sensorProtocol.pickedNodeDefIdListEan,
          groupDateInfo: sensorGroupDateInfo,
        },
      );
      _.set(req, 'locals.dom.sensorReportHeaderDom', sensorReportHeaderDom);
      _.set(req, 'locals.dom.sensorReportBodyDom', sensorReportBodyDom);
    }
    // console.timeEnd('calcMergedReportStorageList');

    // BU.CLIN(reportStorageList, 2);

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      strGroupDateList.length,
      `/report/${siteId}/sensor/${subCategoryId}`,
      _.get(req, 'locals.reportInfo'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    // 생육센서 사이트 목록 돔 추가
    const placeSiteDom = reportDom.makePlaceSiteDom(placeRows, subCategoryId);
    _.set(req, 'locals.dom.subSelectBoxDom', placeSiteDom);

    res.render('./templates/Ean/report/report', req.locals);
  }),
);

/** 생육 환경 엑셀 다운로드 */
router.get(
  ['/:siteId/sensor/:subCategoryId/excel'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});
    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');
    /** @type {V_DV_PLACE[]} */
    const placeRows = _.get(req, 'locals.placeRows', []);
    // /** @type {sensorAvgGroup[]} */
    // const sensorGroupRows = _.get(req, 'locals.sensorGroupRows', []);
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationRows = _.get(req, 'locals.placeRelationRows', []);
    /** @type {sensorReport[]} */
    const sensorReportRows = _.get(req, 'locals.sensorReportRows', []);

    // BU.CLIN(sensorReportRows);

    // BU.CLIN(placeRelationRows);
    // BU.CLI(searchRangeInfo);
    const strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo);

    // Place Relation Rows 확장
    sensorUtil.extPlaRelPerfectSenRep(placeRelationRows, sensorReportRows, strGroupDateList);

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('reportStorageList');
    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const sensorProtocol = new SensorProtocol();
    // PlaceRows --> nodeDefList --> nodePlaceList  --> sensorDataRows
    const finalPlaceRows = sensorUtil.extPlaWithPlaRel(
      placeRows,
      placeRelationRows,
      sensorProtocol.senorReportProtocolEan,
    );
    // console.timeEnd('reportStorageList');

    // console.time('excelWorkSheetList');
    const excelWorkSheetList = finalPlaceRows.map(pRow =>
      excelUtil.makeEWSWithPlaceRow(pRow, {
        searchRangeInfo,
        strGroupDateList,
      }),
    );
    // console.timeEnd('excelWorkSheetList');

    // console.time('makeExcelWorkBook');
    const excelWorkBook = excelUtil.makeExcelWorkBook('test', excelWorkSheetList);
    // console.timeEnd('makeExcelWorkBook');

    // BU.CLIN(excelWorkBook);

    // res.send('hi');
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

// /** 생육 환경 레포트 */
// router.get(
//   ['/', '/:siteId', '/:siteId/sensor', '/:siteId/sensor/:subCategoryId'],
//   asyncHandler(async (req, res) => {
//     commonUtil.applyHasNumbericReqToNumber(req);

//     const tempTemplate = _.template(`
//       <tr class="<%= trClass %>" >
//         <td><%= num %></td>
//         <td><%= group_date %></td>
//         <td><%= module_name %></td>
//         <td><%= ac_a %></td>
//         <td><%= ac_v %></td>
//         <td><%= ac_w %></td>
//         <td><%= c_kwh %></td>
//         <td><%= pr_temp %></td>
//         <td><%= w_temp %></td>
//         <td><%= o_temp %></td>
//       </tr>
//     `);

//     const moduleList = ['냉각형모듈(200 W)', '일반형모듈(200 W)'];
//     const currMoment = moment().set('minutes', 0);
//     currMoment.set('hour', 14);

//     const domList = [];
//     let cKwh = _.random(1.67, 2.92);
//     for (let index = 0; index < 20; index++) {
//       const selectNum = index % 2;
//       domList.push(
//         tempTemplate({
//           trClass: selectNum ? 'info' : '',
//           num: index + 1,
//           group_date: currMoment.format('YYYY-MM-DD HH:mm'),
//           module_name: moduleList[index % 2],
//           ac_a: _.random(1.43, 1.68).toFixed(1),
//           ac_v: _.random(150.2, 160.8).toFixed(1),
//           ac_w: _.random(190.6, 210.5).toFixed(1),
//           c_kwh: (cKwh += _.random(0.01, 0.02)).toFixed(1),
//           pr_temp: _.random(21.5, 22.7).toFixed(1),
//           w_temp: selectNum ? _.random(19.5, 19.7).toFixed(1) : _.random(22.1, 22.8).toFixed(1),
//           o_temp: _.random(17.1, 17.3).toFixed(1),
//         }),
//       );
//       if (selectNum === 1) {
//         currMoment.add(10, 'minutes');
//       }
//     }

//     _.set(req, 'locals.dom.reportDom', _.flatten(domList));

//     let paginationInfo = DU.makeBsPagination(
//       1,
//       300,
//       '/report',
//       _.get(req, 'locals.reportInfo'),
//       PAGE_LIST_COUNT,
//     );

//     // 페이지네이션 돔 추가
//     _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

//     // 페이지 정보 추가
//     paginationInfo = _.omit(paginationInfo, 'paginationDom');
//     _.set(req, 'locals.paginationInfo', paginationInfo);

//     res.render('./templates/Ean/report/report', req.locals);
//   }),
// );
