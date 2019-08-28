const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const salternDom = require('../../models/domMaker/salternDom');

const sensorUtil = require('../../models/templates/sensor.util');
const excelUtil = require('../../models/templates/excel.util');
const commonUtil = require('../../models/templates/common.util');

const webUtil = require('../../models/templates/web.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

/* GET users listing. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');
    /** @type {BlockModel} */
    const blockModel = global.app.get('blockModel');

    // Site Sequence.지점 Id를 불러옴
    const { siteId, mainWhere } = req.locals.mainInfo;

    // TODO: Step1: SEB_RELATION에서 main_seq를 충족하는 rows 추출
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationRows = await powerModel.getTable('V_DV_PLACE_RELATION', mainWhere);

    const sebPlaceSeqList = _(placeRelationRows)
      .filter({ pd_target_id: 'solarEvaporationBlock' })
      .map('place_seq')
      .union()
      .value();

    /** @type {SEB_RELATION[]}  */
    const sebRelationRows = await powerModel.getTable('SEB_RELATION', {
      place_seq: sebPlaceSeqList,
    });

    // Step2-1: 연결된 접속반의 현재 데이터를 추출
    const connectorRows = await powerModel.getTable('PW_CONNECTOR', {
      connector_seq: _.map(sebRelationRows, 'connector_seq'),
    });

    // 접속반 현재 상태
    const connectorStatusRows = await powerModel.getConnectorStatus(
      _.map(connectorRows, 'connector_seq'),
    );

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await powerModel.getTable('V_PW_INVERTER_STATUS', {
      inverter_seq: _(sebRelationRows)
        .map('inverter_seq')
        .union()
        .value(),
    });
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
        pvAmp: null,
        pvVol: null,
        pvKw: null,
        gridPf: null,
        gridKw: null,
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
      if (moment().diff(moment(cntStatusRow.writedate), 'minutes') >= 10) {
        // 합산 전류
        const pvAmp = _(ampList)
          .map(ampCol => {
            return _.get(cntStatusRow, ampCol, null);
          })
          .sum();

        // 평균 전압
        const pvVol = _.chain(volList)
          .map(volCol => {
            return _.get(cntStatusRow, volCol, null);
          })
          .mean()
          .round(1)
          .value();

        sebRelRow.pvAmp = pvAmp;
        sebRelRow.pvVol = pvVol;
        sebRelRow.pvKw = _.chain(pvAmp)
          .multiply(pvVol)
          .divide(1000)
          .round(2)
          .value();
      }
      const foundInverterStatusIndex = _.findIndex(inverterStatusRows, { inverter_seq: ivtSeq });

      // 인버터 상태가 있는 경우
      if (foundInverterStatusIndex > -1) {
        const inverterStatusRow = inverterStatusRows[foundInverterStatusIndex];
        // 중복으로 들어가는 경우가 발생하기 때문에 인버터 상태 Rows에서 제거
        _.pullAt(inverterStatusRows, [foundInverterStatusIndex]);

        // 의미없는 데이터일 경우 무시
        if (moment().diff(moment(inverterStatusRow.writedate), 'minutes') >= 10) {
          sebRelRow.gridKw = _.get(inverterStatusRow, 'power_kw', null);
          sebRelRow.powerCpKwh = _.get(inverterStatusRow, 'power_cp_kwh', null);
        }
      }

      _.set(req, 'locals.sebRelationRows', _.cloneDeep(sebRelationRows));

      BU.CLI(sebRelationRows);

      // BU.CLI(inverterStatusRow);

      const salternStatusRow = _.find(salternStatusRows, { place_seq: placeSeq });
      // 스마트 염전 센서 데이터의 계측 시간이 10분을 초과할 경우
      if (moment().diff(moment(salternStatusRow.writedate), 'minutes') >= 10) {
        _.assign(
          sebRelRow,
          _.pick(salternStatusRow, ['water_level', 'salinity', 'module_rear_temp']),
        );
      }
    });

    // BU.CLI(sebRelationRows);

    const deviceProtocol = new DeviceProtocol();

    const { tableHeaderDom, tableBodyDom } = salternDom.makeMeasureStatusDom(
      sebRelationRows,
      deviceProtocol.reportMeasureViewList,
    );

    _.set(req, 'locals.dom.headerDom', tableHeaderDom);
    _.set(req, 'locals.dom.bodyDom', tableBodyDom);

    res.render('./UPSAS/status/measureStatus', req.locals);
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
 * @property {number} pvAmp
 * @property {number} pvVol
 * @property {number} pvKw
 * @property {number} gridPf
 * @property {number} gridKw
 * @property {number} powerCpKwh
 * @property {number} water_level
 * @property {number} salinity
 * @property {number} module_rear_temp
 */
