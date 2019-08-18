const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const sensorUtil = require('../../models/templates/sensor.util');
const excelUtil = require('../../models/templates/excel.util');
const commonUtil = require('../../models/templates/common.util');

const webUtil = require('../../models/templates/web.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';
const DEFAULT_CATEGORY = 'sensor';

// trend middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // console.time('Trend Middleware');
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;
    const { subCategory = DEFAULT_CATEGORY } = req.params;

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

/** 생육 환경 트렌드 */
router.get(
  ['/', '/:siteId', '/:siteId/sensor'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId, mainWhere } = req.locals.mainInfo;

    // 모든 노드를 조회하고자 할 경우 Id를 지정하지 않음
    // const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;
    // console.time('init');
    /** @type {V_DV_PLACE[]} */
    const placeRows = await biDevice.getTable('v_dv_place', mainWhere, false);
    // FIXME: V_NODE에 포함되어 있 IVT가 포함된 장소는 제거.
    _.remove(placeRows, pRow => _.includes(pRow.place_id, 'IVT'));

    // BU.CLI(placeRows);
    // BU.CLI(_.assign(mainWhere, sensorWhere));
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationRows = await biDevice.getTable('v_dv_place_relation', mainWhere, false);

    // BU.CLIN(placeRelationRows);

    // NOTE: IVT가 포함된 장소는 제거.
    _.remove(placeRelationRows, placeRelation => _.includes(placeRelation.place_id, 'IVT'));
    // console.timeEnd('init');
    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');
    // BU.CLI(searchRangeInfo);

    // console.time('getSensorReport');
    /** @type {sensorReport[]} */
    const sensorReportRows = await biDevice.getSensorReport(
      searchRangeInfo,
      _.map(placeRelationRows, 'node_seq'),
    );
    // console.timeEnd('getSensorReport');

    // BU.CLIN(sensorReportRows);

    // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
    const strGroupDateList = commonUtil.getGroupDateList(searchRangeInfo);
    // plotSeries 를 구하기 위한 객체
    const momentFormat = commonUtil.getMomentFormat(searchRangeInfo);

    // 하루 단위로 검색할 경우에만 시간 제한을 둠
    // if (searchRangeInfo.searchType === 'days') {
    //   const rangeInfo = {
    //     startHour: 7,
    //     endHour: 20,
    //   };
    //   strGroupDateList = commonUtil.getGroupDateList(searchRangeInfo, rangeInfo);
    //   momentFormat = commonUtil.getMomentFormat(searchRangeInfo, moment(_.head(strGroupDateList)));
    // } else {
    //   strGroupDateList = commonUtil.getGroupDateList(searchRangeInfo);
    //   momentFormat = commonUtil.getMomentFormat(searchRangeInfo);
    // }

    // console.time('extPlaRelSensorRep');
    // 그루핑 데이터를 해당 장소에 확장 (Extends Place Realtion Rows With Sensor Report Rows)
    // sensorUtil.extPlaRelWithSenRep(placeRelationRows, sensorReportRows);
    sensorUtil.extPlaRelPerfectSenRep(placeRelationRows, sensorReportRows, strGroupDateList);
    // console.timeEnd('extPlaRelSensorRep');

    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const deviceProtocol = new DeviceProtocol(siteId);

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('makeNodeDefStorageList');
    const nodeDefStorageList = sensorUtil.makeNodeDefStorageList(
      placeRelationRows,
      _.values(deviceProtocol.BASE_KEY),
    );
    // console.timeEnd('makeNodeDefStorageList');

    // BU.CLIN(nodeDefStorageList, 3);

    // FIXME: 구간 최대 값 차 차트 --> getSensorReport 밑에 저장해둠. 수정 필요.

    // FIXME: 과도한 쿼리를 발생시키는 SearchRange 는 serarchInterval 조정 후 반환

    // BU.CLIN(nodeDefStorageList);

    // console.time('madeSensorChartList');
    // 생육 환경정보 차트 목록을 생성
    const madeLineChartList = deviceProtocol.trendSensorViewList.map(chartConfig =>
      sensorUtil.makeSimpleLineChart(chartConfig, nodeDefStorageList, momentFormat.plotSeries),
    );

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const sensorDomTemplate = _.template(`
        <div class="lineChart_box default_area" id="<%= domId %>"></div>
    `);
    const divDomList = madeLineChartList.map(refinedChart =>
      sensorDomTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', madeLineChartList);

    // TODO: 1. 각종 Chart 작업

    // TODO: 1.1 인버터 발전량 차트 + 경사 일사량

    // BU.CLIN(req.locals);
    res.render('./trend/sensorTrend', req.locals);
  }),
);

/** 인버터 트렌드 */
router.get(
  ['/:siteId', '/:siteId/inverter'],
  asyncHandler(async (req, res, next) => {
    // TODO: Block으로 처리할  V_DV_NODE를 가져옴

    // TODO: Block dataTable 에서 가져올 column (toKey) 배열을 생성 및 searchRange에 맞는 데이터를 가져옴

    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    /** @type {searchRange} */
    const searchRangeInfo = _.get(req, 'locals.searchRange');

    // commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {MEMBER} */
    const { siteId } = req.locals.mainInfo;

    /** @type {V_PW_PROFILE[]} */
    // const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);
    const powerProfileRows = req.locals.viewPowerProfileRows;
    // BU.CLI(powerProfileRows);

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');
    // const inverterWhere = inverterSeqList.length ? { inverter_seq: inverterSeqList } : null;

    const deviceProtocol = new DeviceProtocol(siteId);

    const strGroupDateList = commonUtil.getGroupDateList(searchRangeInfo);

    // plotSeries 를 구하기 위한 객체
    const momentFormat = commonUtil.getMomentFormat(searchRangeInfo);

    // BU.CLI(strGroupDateList);

    const madeLineChartList = await powerModel.getInverterLineChart(
      searchRangeInfo,
      deviceProtocol.trendInverterViewList,
      inverterSeqList,
      {
        strGroupDateList,
        plotSeries: momentFormat.plotSeries,
      },
    );

    // BU.CLIN(madeLineChartList, 3);

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const inverterDomTemplate = _.template(`
        <div class="lineChart_box default_area" id="<%= domId %>"></div>
    `);
    const divDomList = madeLineChartList.map(refinedChart =>
      inverterDomTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', madeLineChartList);

    // BU.CLIN(inverterTrendRows);

    res.render('./trend/inverterTrend', req.locals);
  }),
);

module.exports = router;
