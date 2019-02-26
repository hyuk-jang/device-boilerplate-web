const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const sensorUtil = require('../../../models/templates/sensor.util');
const excelUtil = require('../../../models/templates/excel.util');
const commonUtil = require('../../../models/templates/common.util');

const webUtil = require('../../../models/templates/web.util');

const SensorProtocol = require('../../../models/SensorProtocol');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';

// trend middleware
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;

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
    // const searchRange = biModule.createSearchRange({
    //   searchType,
    //   searchInterval,
    //   searchOption,
    //   strStartDate: strStartDateInputValue,
    //   strEndDate: strEndDateInputValue,
    // });

    const searchRange = biModule.createSearchRange({
      searchType: 'days',
      // searchType: 'range',
      searchInterval: 'min',
      strStartDate: '2019-02-13',
      strEndDate: '',
      // strEndDate: '2019-02-14',
    });

    // BU.CLI(searchRange);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const trendInfo = {
      siteId,
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    _.set(req, 'locals.trendInfo', trendInfo);
    _.set(req, 'locals.searchRange', searchRange);
    next();
  }),
);

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    // 모든 노드를 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

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

    const strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo, {
      startHour: 7,
      endHour: 20,
    });
    // console.time('extPlaRelSensorRep');
    // 그루핑 데이터를 해당 장소에 확장 (Extends Place Realtion Rows With Sensor Report Rows)
    // sensorUtil.extPlaRelWithSenRep(placeRelationRows, sensorReportRows);
    sensorUtil.extPlaRelPerfectSenRep(placeRelationRows, sensorReportRows, strGroupDateList);
    // console.timeEnd('extPlaRelSensorRep');

    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const sensorProtocol = new SensorProtocol(siteId);

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('makeNodeDefStorageList');
    const nodeDefStorageList = sensorUtil.makeNodeDefStorageList(
      placeRelationRows,
      _.values(sensorProtocol.BASE_KEY),
    );
    // console.timeEnd('makeNodeDefStorageList');

    // UTC 날짜를 구하기 위하여 서울 기준 UTC +9 시간을 더함
    const utcList = strGroupDateList.map(date =>
      moment(date)
        .add(9, 'hours')
        .valueOf(),
    );
    // console.time('madeSensorChartList');
    // 생육 환경정보 차트 목록을 생성
    const madeSensorChartList = sensorProtocol.trendViewList.map(chartConfig =>
      sensorUtil.makeSensorChart(chartConfig, nodeDefStorageList, utcList, strGroupDateList),
    );

    // console.timeEnd('madeSensorChartList');

    // BU.CLIN(madeSensorChartList, 4);

    _.set(req, 'locals.madeSensorChartList', madeSensorChartList);

    // BU.CLIN(req.locals);
    res.json({
      headerInfo: req.locals.headerInfo,
      containerInfo: {
        inverterTrendList: [],
        sensorTrendList: madeSensorChartList,
      },
    });
  }),
);

module.exports = router;
