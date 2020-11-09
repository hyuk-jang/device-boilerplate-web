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

/** @type {projectConfig} */
const pConfig = global.projectConfig;

const { naviList } = pConfig;

const subCategoryList = _.chain(naviList)
  .find({ href: 'report' })
  .get('subCategoryList')
  .value();

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
      mainInfo: {
        siteId,
        subCategory = DEFAULT_CATEGORY,
        subCategoryId = DEFAULT_SUB_SITE,
      },
    } = req.locals;

    // BU.CLI(subCategory);

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

/** 인버터 레포트 */
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/inverter',
    '/:siteId/inverter/:subCategoryId',
    '/:siteId/inverter/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    const {
      mainInfo: { siteId, subCategoryId = DEFAULT_SUB_SITE, mainWhere },
      viewPowerProfileRows,
    } = req.locals;

    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;
    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const inverterWhere = _.isNumber(subCategoryId)
      ? { inverter_seq: subCategoryId }
      : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _(powerProfileRows)
      .filter(inverterWhere)
      .map('inverter_seq')
      .value();

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    // 엑셀 다운로드 요청일 경우에는 현재까지 계산 처리한 Rows 반환
    if (_.get(req.params, 'finalCategory', '') === 'excel') {
      // BU.CLI('인버터 엑셀 출력 Next', searchRangeInfo);
      _.set(req, 'locals.powerProfileRows', powerProfileRows);
      _.set(req, 'locals.inverterSeqList', inverterSeqList);
      return next();
    }

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    // BU.CLI(req.query);
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
    const inverterSiteDom = reportDom.makeInverterSiteDom(
      powerProfileRows,
      subCategoryId,
    );
    _.set(req, 'locals.dom.subSelectBoxDom', inverterSiteDom);

    const deviceProtocol = new DeviceProtocol();
    // 인버터 보고서 돔 추가

    const { tableHeaderDom, tableBodyDom } = reportDom.makeInverterReportDom(reportRows, {
      blockViewList: deviceProtocol.reportInverterViewList,
      page,
      pageListCount: PAGE_LIST_COUNT,
    });

    // const inverterReportDom = reportDom.makeInverterReportDom(reportRows, {
    //   blockViewList: deviceProtocol.reportInverterViewList,
    //   page,
    //   pageListCount: PAGE_LIST_COUNT,
    // });

    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    res.render('./report/rInverter', req.locals);
  }),
);

/** 인버터 엑셀 다운로드 */
router.get(
  ['/:siteId/inverter/:subCategoryId/excel'],
  asyncHandler(async (req, res) => {
    // BU.CLI('인버터 엑셀 다운');

    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    const strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo);

    // /** @type {MEMBER} */
    // const { siteId } = req.locals.mainInfo;
    // req.param 값 비구조화 할당
    // const { subCategoryId = DEFAULT_SUB_SITE } = req.params;

    // const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;
    // const inverterWhere = _.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.get(req, 'locals.powerProfileRows', []);
    /** @type {number[]} */
    const inverterSeqList = _.get(req, 'locals.inverterSeqList', []);

    // 인버터 트렌드를 구함
    const inverterTrendRows = await powerModel.getInverterTrend(
      searchRangeInfo,
      inverterSeqList,
    );
    // BU.CLI(inverterTrendRows);

    const deviceProtocol = new DeviceProtocol();

    // 인버터 별로 그루핑
    const groupedInverterTrend = _.groupBy(inverterTrendRows, 'inverter_seq');

    // 인버터 별로 엑셀 시트를 생성
    const excelWorkSheetList = _.map(
      groupedInverterTrend,
      (trendRows, strInverterSeq) => {
        // BU.CLI(strInverterSeq, trendRows);
        // 현재 인버터의 이름을 알기 위해서 찾아옴
        const foundPowerProfile = _.find(powerProfileRows, {
          inverter_seq: Number(strInverterSeq),
        });
        let blockName = '';
        if (foundPowerProfile) {
          blockName = `${foundPowerProfile.m_name} ${foundPowerProfile.ivt_target_name}`;
        }
        // 엑셀 시트 생성
        return excelUtil.makeEWSWithBlock(trendRows, {
          blockName,
          searchRangeInfo,
          strGroupDateList,
          blockViewOptionList: deviceProtocol.reportInverterViewList,
        });
      },
    );

    if (excelWorkSheetList.length === 0) {
      return res.status(500).send('데이터가 존재하지 않습니다.');
    }

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

/** 생육 환경 레포트 */
router.get(
  [
    '/:siteId/sensor',
    '/:siteId/sensor/:subCategoryId',
    '/:siteId/sensor/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    const {
      mainInfo: { siteId, mainWhere, subCategoryId = DEFAULT_SUB_SITE },
      searchRange,
    } = req.locals;
    // const { subCategoryId = DEFAULT_SUB_SITE } = req.params;

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    // 모든 노드를 조회하고자 할 경우 Id를 지정하지 않음
    const sensorWhere = _.isNumber(subCategoryId) ? { place_seq: subCategoryId } : null;

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    /** @type {V_DV_PLACE[]} */
    let placeRows = await biDevice.getTable('v_dv_place', mainWhere, false);
    placeRows = _.sortBy(placeRows, 'chart_sort_rank');
    // FIXME: V_NODE에 포함되어 있 IVT가 포함된 장소는 제거.
    _.remove(placeRows, pRow => _.includes(pRow.place_id, 'IVT'));

    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationRows = await biDevice.getTable(
      'v_dv_place_relation',
      _.assign(mainWhere, sensorWhere),
    );

    // NOTE: IVT가 포함된 장소는 제거.
    _.remove(placeRelationRows, placeRelation =>
      _.includes(placeRelation.place_id, 'IVT'),
    );

    // console.time('getSensorReport');
    /** @type {sensorReport[]} */
    const sensorReportRows = await biDevice.getSensorReport(
      searchRange,
      _.map(placeRelationRows, 'node_seq'),
    );
    // console.timeEnd('getSensorReport');

    // 엑셀 다운로드 요청일 경우에는 현재까지 계산 처리한 Rows 반환
    if (_.get(req.params, 'finalCategory', '') === 'excel') {
      _.set(req, 'locals.placeRows', placeRows);
      _.set(req, 'locals.placeRelationRows', placeRelationRows);
      _.set(req, 'locals.sensorReportRows', sensorReportRows);
      return next();
    }

    // console.time('extPlaRelSensorRep');
    // 그루핑 데이터를 해당 장소에 확장 (Extends Place Realtion Rows With Sensor Report Rows)
    sensorUtil.extPlaRelWithSenRep(placeRelationRows, sensorReportRows);
    // console.timeEnd('extPlaRelSensorRep');

    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const deviceProtocol = new DeviceProtocol(siteId);

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('makeNodeDefStorageList');
    const nodeDefStorageList = sensorUtil.makeNodeDefStorageList(
      placeRelationRows,
      deviceProtocol.pickedNodeDefIdList,
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
    if (searchRange.searchOption === DEFAULT_SEARCH_OPTION) {
      // 동일 Node Def Id 를 사용하는 저장소 데이터를 GroupDate 별로 합산처리
      sensorUtil.calcMergedReportStorageList(nodeDefStorageList, sensorGroupDateInfo);
      const {
        sensorReportHeaderDom,
        sensorReportBodyDom,
      } = reportDom.makeSensorReportDomByCombine(nodeDefStorageList, {
        pickedNodeDefIdList: deviceProtocol.pickedNodeDefIdList,
        groupDateInfo: sensorGroupDateInfo,
      });
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

    return res.render('./report/rSensor', req.locals);
  }),
);

/** 생육 환경 엑셀 다운로드 */
router.get(
  ['/:siteId/sensor/:subCategoryId/excel'],
  asyncHandler(async (req, res) => {
    /** @type {searchRange} */
    const searchRange = _.get(req, 'locals.searchRange');
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
    const strGroupDateList = sensorUtil.getGroupDateList(searchRange);

    // Place Relation Rows 확장
    // console.time('extPlaRelPerfectSenRep');
    sensorUtil.extPlaRelPerfectSenRep(
      placeRelationRows,
      sensorReportRows,
      strGroupDateList,
    );
    // console.timeEnd('extPlaRelPerfectSenRep');
    // BU.CLIN(placeRelationRows)

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('reportStorageList');
    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const { siteId } = req.locals.mainInfo;
    const deviceProtocol = new DeviceProtocol(siteId);
    // PlaceRows --> nodeDefList --> nodePlaceList  --> sensorDataRows
    const finalPlaceRows = sensorUtil.extPlaWithPlaRel(
      placeRows,
      placeRelationRows,
      deviceProtocol.senorReportProtocol,
    );
    // console.timeEnd('reportStorageList');

    // console.time('excelWorkSheetList');
    const excelWorkSheetList = finalPlaceRows.map(pRow =>
      excelUtil.makeEWSWithPlaceRow(pRow, {
        searchRangeInfo: searchRange,
        strGroupDateList,
      }),
    );
    // console.timeEnd('excelWorkSheetList');

    // BU.CLIN(excelWorkSheetList);

    // excelUtil.makeEWSWithPlaceRow(finalPlaceRows[0], {
    //   searchRangeInfo,
    //   strGroupDateList,
    // });

    if (excelWorkSheetList.length === 0) {
      return res.status(500).send('데이터가 존재하지 않습니다.');
    }

    // console.time('makeExcelWorkBook');
    const excelWorkBook = excelUtil.makeExcelWorkBook('test', excelWorkSheetList);
    // console.timeEnd('makeExcelWorkBook');

    // BU.CLIN(excelWorkBook);

    // res.send('hi');
    const { rangeStart, rangeEnd } = searchRange;
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
