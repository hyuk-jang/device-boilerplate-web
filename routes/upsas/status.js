const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');
const domMakerInverter = require('../../models/domMaker/inverterDom');
const salternDom = require('../../models/domMaker/salternDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

const DEFAULT_CATEGORY = 'outline';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'outline',
    btnName: '종합',
  },
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
  // {
  //   subCategory: 'damage',
  //   btnName: '손실 및 저하요인 분석',
  // },
];

// middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // Site Sequence.지점 Id를 불러옴
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    const measureInfo = {
      measureTime: `${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };

    _.set(req, 'locals.measureInfo', measureInfo);

    next();
  }),
);

/* 종합. */
router.get(
  ['/', '/:siteId', '/:siteId/outline'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');
    /** @type {BlockModel} */
    const blockModel = global.app.get('blockModel');

    // Site Sequence.지점 Id를 불러옴
    const { mainWhere } = req.locals.mainInfo;

    // Step1: SEB_RELATION에서 main_seq를 충족하는 rows 추출
    /** @type {V_DV_PLACE[]} */
    const placeRows = await powerModel.getTable('V_DV_PLACE', mainWhere);

    const placeSeqList = _.map(placeRows, 'place_seq');

    /** @type {SEB_RELATION[]} 수중태양광 모듈과 관계된 접속반, 인버터, 장소 관계 목록 */
    const sebRelRows = await powerModel.getTable('SEB_RELATION');

    const sebRelationRows = sebRelRows.filter(sebRelRow => {
      return _.includes(placeSeqList, sebRelRow.place_seq);
    });

    const sebPlaceSeqList = sebRelationRows.map(row => row.place_seq);

    // Step2-1: 연결된 접속반의 현재 데이터를 추출
    const connectSeqList = _.map(sebRelationRows, 'connector_seq');
    const connectorRows = connectSeqList.length
      ? await powerModel.getTable('PW_CONNECTOR', {
          connector_seq: connectSeqList,
        })
      : [];

    // 접속반 현재 상태
    const connectorStatusRows = await powerModel.getConnectorStatus(
      _.map(connectorRows, 'connector_seq'),
    );

    const inverterSeqList = _(sebRelationRows)
      .map('inverter_seq')
      .union()
      .value();

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = inverterSeqList.length
      ? await powerModel.getTable('V_PW_INVERTER_STATUS', {
          inverter_seq: inverterSeqList,
        })
      : [];

    // 염전 상태 계측 센서 상태
    const salternStatusRows = await blockModel.getBlockStatus({
      tableName: 'saltern_sensor_data',
      uniqueColumn: 'saltern_sensor_data_seq',
      groupColumn: 'place_seq',
      whereColumn: 'place_seq',
      whereColumnValueList: sebPlaceSeqList,
    });

    // BU.CLI(salternStatusRows);

    // 수중 태양광 관계 순회
    _.forEach(sebRelationRows, sebRelRow => {
      const {
        connector_seq: cntSeq,
        connector_ch: cntCh,
        inverter_seq: ivtSeq,
        place_seq: placeSeq,
      } = sebRelRow;

      /** @type {SEB_RELATION} */
      const emptyStatus = {
        modulePvAmp: null,
        modulePvVol: null,
        modulePvKw: null,
        pvKw: null,
        gridKw: null,
        gridPf: null,
        powerCpKwh: null,
        water_level: null,
        salinity: null,
        module_rear_temp: null,
      };

      // 빈 데이터 삽입
      _.assign(sebRelRow, emptyStatus);

      // 채널 목록
      const { ampList, volList } = _.chain(cntCh)
        .thru(ch => BU.replaceAll(ch, ' ', ''))
        .split(',')
        .reduce(
          (base, ch) => {
            // 전류 Columns 목록
            base.ampList.push(`a_ch_${ch}`);
            // 전압 Columns 목록
            base.volList.push(`v_ch_${ch}`);
            return base;
          },
          { ampList: [], volList: [] },
        )
        .value();

      const cntStatusRow = _.find(connectorStatusRows, { connector_seq: cntSeq });
      // PV 전류 시간이 10분을 초과하였다면 처리하지 않음
      if (moment().diff(moment(cntStatusRow.writedate), 'minutes') <= 10) {
        // 합산 전류
        const pvAmp = _.chain(ampList)
          .map(ampCol => {
            return _.get(cntStatusRow, ampCol, null);
          })
          .sum()
          .round(1)
          .value();

        // 평균 전압
        const pvVol = _.chain(volList)
          .map(volCol => {
            return _.get(cntStatusRow, volCol, null);
          })
          .mean()
          .round(1)
          .value();

        sebRelRow.modulePvAmp = pvAmp;
        sebRelRow.modulePvVol = pvVol;
        sebRelRow.modulePvKw = _.chain(pvAmp)
          .multiply(pvVol)
          .divide(1000)
          .round(2)
          .value();

        // BU.CLIS(sebRelRow);

        sebRelRow.moduleEfficiency = _.chain(sebRelRow.modulePvKw)
          .divide(sebRelRow.power_amount)
          .multiply(100)
          .round(1)
          .value();
        // BU.CLI(sebRelRow.moduleEfficiency);
      }
      const foundInverterStatusIndex = _.findIndex(inverterStatusRows, { inverter_seq: ivtSeq });

      // 인버터 상태가 있는 경우
      if (foundInverterStatusIndex > -1) {
        const inverterStatusRow = inverterStatusRows[foundInverterStatusIndex];
        // 중복으로 들어가는 경우가 발생하기 때문에 인버터 상태 Rows에서 제거
        // _.pullAt(inverterStatusRows, [foundInverterStatusIndex]);

        // 의미없는 데이터일 경우 무시
        if (moment().diff(moment(inverterStatusRow.writedate), 'minutes') <= 10) {
          const pvAmp = _.get(inverterStatusRow, 'pv_a', null);
          const pvVol = _.get(inverterStatusRow, 'pv_v', null);
          const pvKw =
            _.isNumber(pvAmp) && _.isNumber(pvAmp)
              ? _.chain(pvAmp)
                  .multiply(pvVol)
                  .divide(1000)
                  .round(2)
                  .value()
              : null;

          sebRelRow.pvKw = pvKw;
          sebRelRow.gridKw = _.get(inverterStatusRow, 'power_kw', null);
          sebRelRow.gridEfficiency = _.chain(sebRelRow.gridKw)
            .divide(inverterStatusRow.amount)
            .multiply(100)
            .round(1)
            .value();
          sebRelRow.powerCpKwh = _.get(inverterStatusRow, 'power_cp_kwh', null);
        }
      }

      // BU.CLI(inverterStatusRow);

      const salternStatusRow = _.find(salternStatusRows, { place_seq: placeSeq });
      // 스마트 염전 센서 데이터의 계측 시간이 10분을 초과할 경우
      if (moment().diff(moment(_.get(salternStatusRow, 'writedate')), 'minutes') <= 10) {
        _.assign(
          sebRelRow,
          _.pick(salternStatusRow, ['water_level', 'salinity', 'brine_temp', 'module_rear_temp']),
        );
      }
    });

    _.set(req, 'locals.sebRelationRows', _.cloneDeep(sebRelationRows));

    const deviceProtocol = new DeviceProtocol();

    const { tableHeaderDom, tableBodyDom } = salternDom.makeMeasureStatusDom(
      sebRelationRows,
      deviceProtocol.getBlockStatusTable('outline'),
    );

    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    res.render('./UPSAS/status/outline', req.locals);
  }),
);

// 접속반
router.get(
  ['/:siteId/connector'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    const { siteId, mainWhere, subCategory } = req.locals.mainInfo;

    const deviceProtocol = new DeviceProtocol();
    // 현재 염전 상태를 포현할 BlockStatusTableOptions 가져옴
    const blockStatusTable = deviceProtocol.getBlockStatusTable(subCategory);

    /** @type {PW_RELATION_POWER[]} */
    const relationPowerRows = await refineModel.getTable('PW_RELATION_POWER', mainWhere);

    const connectorSeqList = _(relationPowerRows)
      .map('connector_seq')
      .union()
      .value();

    /** @type {CONNECTOR[]} */
    const connectorRows = connectorSeqList.length
      ? await powerModel.getTable('PW_CONNECTOR', {
          connector_seq: connectorSeqList,
        })
      : [];

    // 접속반 현재 상태
    const statusRows = await powerModel.getConnectorStatus(_.map(connectorRows, 'connector_seq'));

    // 접속반에 데이터를 붙임
    _.forEach(connectorRows, cntRow => {
      const statusRow = _.find(statusRows, { place_seq: cntRow.place_seq });

      // 스마트 염전 센서 데이터의 계측 시간이 10분을 초과할 경우
      if (statusRow && moment().diff(moment(statusRow.writedate), 'minutes') <= 10) {
        // 접속반 총합 전류 산출
        const sumAmp = _.chain(statusRow)
          .map((value, key) => {
            return _.includes(key, 'a_ch') && _.isNumber(value) ? value : null;
          })
          .sum()
          .round(1);

        // 접속반 평균 전압 산출
        const avgVol = _.chain(statusRow)
          .reduce((result, value, key) => {
            _.includes(key, 'v_ch') && result.push(value);
            return result;
          }, [])
          .mean()
          .round(1);

        // 접속반 채널별 데이터 및 전류 총합, 평균 전류를 포함한 객체 확장
        _.assign(cntRow, _.pick(statusRow, _.map(blockStatusTable, 'dataKey')), {
          sumAmp,
          avgVol,
        });
      }
    });

    // Status Table Dom 생성
    const { tableHeaderDom, tableBodyDom } = defaultDom.makeDynamicBlockTable({
      dataRows: connectorRows,
      blockTableOptions: blockStatusTable,
    });

    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    // console.time('refinedCharts');
    const refinedCharts = await refineModel.refineBlockCharts(searchRange, subCategory, siteId);
    // console.timeEnd('refinedCharts');

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const domTemplate = _.template(`
       <div class="lineChart_box default_area" id="<%= domId %>"></div>
   `);
    const divDomList = refinedCharts.map(refinedChart =>
      domTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', refinedCharts);

    res.render('./UPSAS/status/connector', req.locals);
  }),
);

// 인버터
router.get(
  ['/:siteId/inverter'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { mainWhere },
      viewPowerProfileRows,
    } = req.locals;

    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    const inverterStatusList = await refineModel.refineInverterStatus(inverterSeqList);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const inverterStatusListDom = domMakerInverter.makeInverterStatusList(inverterStatusList);

    _.set(req, 'locals.dom.inverterStatusListDom', inverterStatusListDom);

    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    // BU.CLI(momentFormat);
    /** @type {lineChartConfig} */
    const chartConfig = {
      domId: 'chart_div',
      title: '인버터 발전 현황',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    };

    // 동적 라인 차트를 생성
    const inverterLineChart = await refineModel.refineInverterChart(
      searchRange,
      inverterSeqList,
      chartConfig,
    );

    req.locals.inverterLineChart = inverterLineChart;
    // BU.CLIN(req.locals);
    res.render('./UPSAS/status/inverter', req.locals);
  }),
);

// 염전 상태 계측
router.get(
  ['/:siteId/saltern'],
  asyncHandler(async (req, res) => {
    /** @type {BlockModel} */
    const blockModel = global.app.get('blockModel');
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    const { siteId, mainWhere, subCategory } = req.locals.mainInfo;

    const deviceProtocol = new DeviceProtocol();
    // 현재 염전 상태를 포현할 BlockStatusTableOptions 가져옴
    const blockStatusTable = deviceProtocol.getBlockStatusTable(subCategory);

    /** @type {V_DV_PLACE[]} */
    const placeRows = await refineModel.getTable('V_DV_PLACE', mainWhere);

    const placeSeqList = _.map(placeRows, 'place_seq');

    /** @type {SEB_RELATION[]} 수중태양광 모듈과 관계된 접속반, 인버터, 장소 관계 목록 */
    const sebRelRows = await blockModel.getTable('SEB_RELATION');

    const sebRelationRows = sebRelRows.filter(sebRelRow => {
      return _.includes(placeSeqList, sebRelRow.place_seq);
    });

    const sebPlaceSeqList = sebRelationRows.map(row => row.place_seq);

    // 목록으로 표출할 장소 카테고리
    const salternPlaceClassId = ['salternBlock', 'brineWarehouse', 'reservoir'];

    // 실제적으로 출력할 염전 장소 Rows
    const salternPlaceRows = _.filter(placeRows, placeRow => {
      return _.includes(sebPlaceSeqList, placeRow.place_seq);
    });

    // 염전 상태 계측 센서 상태
    const salternStatusRows = await blockModel.getBlockStatus({
      tableName: 'saltern_sensor_data',
      uniqueColumn: 'saltern_sensor_data_seq',
      groupColumn: 'place_seq',
      whereColumn: 'place_seq',
      whereColumnValueList: sebPlaceSeqList,
    });

    // 염전 장소 Rows를 순회하면서 장소에 해당하는 Sensor Data를 Assign 처리
    _.forEach(salternPlaceRows, salternPlaRow => {
      const salternStatusRow = _.find(salternStatusRows, { place_seq: salternPlaRow.place_seq });

      const sebRelationRow = _.find(sebRelationRows, { place_seq: salternPlaRow.place_seq });

      if (sebRelationRow) {
        Object.assign(salternPlaRow, { seb_name: sebRelationRow.seb_name });
      }

      // 스마트 염전 센서 데이터의 계측 시간이 10분을 초과할 경우
      if (salternStatusRow && moment().diff(moment(salternStatusRow.writedate), 'minutes') <= 10) {
        _.assign(salternPlaRow, _.pick(salternStatusRow, _.map(blockStatusTable, 'dataKey')));
      }
    });

    // Status Table Dom 생성
    const { tableHeaderDom, tableBodyDom } = defaultDom.makeDynamicBlockTable({
      dataRows: salternPlaceRows,
      blockTableOptions: blockStatusTable,
    });

    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    // console.time('refinedCharts');
    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    const refinedCharts = await refineModel.refineBlockCharts(searchRange, subCategory, siteId);
    // console.timeEnd('refinedCharts');

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const domTemplate = _.template(`
       <div class="lineChart_box default_area" id="<%= domId %>"></div>
   `);
    const divDomList = refinedCharts.map(refinedChart =>
      domTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', refinedCharts);

    res.render('./UPSAS/status/saltern', req.locals);
  }),
);

// TODO: 손실 저하 요인
router.get(
  ['/:siteId/damage'],
  asyncHandler(async (req, res) => {
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {V_PW_PROFILE[]} powerProfileRows */
    const powerProfileRows = req.locals.viewPowerProfileRows;

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    /** @type {lineChartConfig} */
    const chartConfig = {
      domId: 'chart_div',
      title: '',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    };

    // 동적 라인 차트를 생성
    const inverterLineChart = await refineModel.refineInverterChart(
      searchRange,
      inverterSeqList,
      chartConfig,
    );

    req.locals.inverterLineChart = inverterLineChart;
    // BU.CLIN(req.locals);
    res.render('./UPSAS/status/damage', req.locals);
  }),
);

module.exports = router;

/**
 * @typedef {Object} SEB_RELATION
 * @property {number} place_seq
 * @property {number} inverter_seq
 * @property {number} connector_seq
 * @property {string} connector_ch
 * @property {string} seb_name
 * @property {string} manufacturer
 * @property {number} power_amount
 * @property {number} modulePvAmp
 * @property {number} modulePvVol
 * @property {number} modulePvKw
 * @property {number} pvKw
 * @property {number} gridKw
 * @property {number} gridPf
 * @property {number} powerCpKwh
 * @property {number} water_level
 * @property {number} salinity
 * @property {number} module_rear_temp
 */
