const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const moment = require('moment');
const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const INCLINED_SOLAR = 'inclinedSolar';

const SensorProtocol = require('../../models/SensorProtocol');

const commonUtil = require('../../models/templates/common.util');
const sensorUtil = require('../../models/templates/sensor.util');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biModule.getTable('v_dv_sensor_profile');
    /** @type {V_DV_PLACE_RELATION[]} */
    const viewPlaceRelationRows = await biModule.getTable('v_dv_place_relation');

    const placeNormalSeqList = sensorUtil.getPlaceRelationSeqList(viewPlaceRelationRows, {
      place_id: 'TB_N',
    });

    const placeCoolingSeqList = sensorUtil.getPlaceRelationSeqList(viewPlaceRelationRows, {
      place_id: 'TB_C',
    });

    const cpKwhSeqList = sensorUtil.getPlaceRelationSeqList(viewPlaceRelationRows, {
      nd_target_id: 'powerCpKwh',
    });

    const normalSensorProfileRows = _.filter(viewSensorProfileRows, row =>
      _.includes(placeNormalSeqList, row.node_seq),
    );

    const coolingSensorProfileRows = _.filter(viewSensorProfileRows, row =>
      _.includes(placeCoolingSeqList, row.node_seq),
    );

    const sensorProtocol = new SensorProtocol();

    // 센서 평균 합산
    const currSensorDataInfo = {};
    sensorProtocol.mainEanViewList.forEach(ndKey => {
      const result = sensorUtil.calcSensorProfileRows(viewSensorProfileRows, {
        calcKey: ndKey,
      });
      _.assign(currSensorDataInfo, { [ndKey]: result });
    });

    // 일반 센서
    const currNormalSensorDataInfo = {};
    sensorProtocol.mainEanViewList.forEach(ndKey => {
      const result = sensorUtil.calcSensorProfileRows(normalSensorProfileRows, {
        calcKey: ndKey,
      });
      _.assign(currNormalSensorDataInfo, { [ndKey]: result });
    });

    // 냉각형 센서
    const currCoolingSensorDataInfo = {};
    sensorProtocol.mainEanViewList.forEach(ndKey => {
      const result = sensorUtil.calcSensorProfileRows(coolingSensorProfileRows, {
        calcKey: ndKey,
      });
      _.assign(currCoolingSensorDataInfo, { [ndKey]: result });
    });

    // 금일 발전량
    const normalCpKwhSeq = sensorUtil.getPlaceRelationSeqList(viewPlaceRelationRows, {
      place_id: 'TB_N',
      nd_target_id: 'powerCpKwh',
    })[0];
    const coolingCpKwhSeq = sensorUtil.getPlaceRelationSeqList(viewPlaceRelationRows, {
      place_id: 'TB_C',
      nd_target_id: 'powerCpKwh',
    })[0];

    let searchRange = biModule.createSearchRange({
      searchType: 'days',
      searchInterval: 'day',
    });
    const dailyReport = await biDevice.getSensorReport(searchRange, cpKwhSeqList, 2);

    const dailyPowerInfo = {
      cooling: _.get(_.find(dailyReport, { node_seq: coolingCpKwhSeq }), 'interval_data'),
      normal: _.get(_.find(dailyReport, { node_seq: normalCpKwhSeq }), 'interval_data'),
    };

    searchRange = biModule.createSearchRange({
      searchType: 'months',
      searchInterval: 'month',
    });

    const monthReport = await biDevice.getSensorReport(searchRange, cpKwhSeqList, 2);

    const powerInfo = {
      currPvW: currSensorDataInfo.pvW,
      dailyKwh: _.sum(_.values(dailyPowerInfo)),
      monthKwh: _.sum(_.map(monthReport, 'interval_data')),
      cpKwh: _.sum(_.map(monthReport, 'max_data')),
    };

    req.locals.powerInfo = powerInfo;
    req.locals.dailyPowerInfo = dailyPowerInfo;

    req.locals.currSensorDataInfo = currSensorDataInfo;
    req.locals.currNormalSensorDataInfo = currNormalSensorDataInfo;
    req.locals.currCoolingSensorDataInfo = currCoolingSensorDataInfo;

    res.render('./templates/Ean/main/main', req.locals);
  }),
);

module.exports = router;
