const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const domMakerMain = require('../../models/domMaker/mainDom');

const sensorUtil = require('../../models/templates/sensor.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId, mainWhere },
    } = req.locals;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');
    // ********** Power 관련
    // console.time('refineGeneralPowerInfo');
    // 발전 현황을 나타내는 기본적인 정보
    const {
      powerGenerationInfo,
      validInverterDataList,
    } = await refineModel.refineGeneralPowerInfo(siteId);
    // console.timeEnd('refineGeneralPowerInfo');

    // ********** Sensor 관련
    /** @type {V_DV_NODE_DEF[]} */
    const viewNodeDefRows = await biModule.getTable('v_dv_node_def');
    // console.time('getSensorProfile');
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biDevice.getSensorProfile(mainWhere);
    // console.timeEnd('getSensorProfile');

    const deviceProtocol = new DeviceProtocol(siteId);

    const sensorDataInfo = {};
    // 생육환경 현황을 만들기 위한 센서 돔 재료 정보 목록 생성
    const sensorStatusList = [];
    deviceProtocol.mainViewList.forEach(ndId => {
      // ndId가 동일한 Node Define List를 가져옴
      const nodeDefRow = _.find(viewNodeDefRows, { nd_target_id: ndId });
      if (nodeDefRow) {
        // Nd Def 정보에서 Node Name, DataUnit을 가져옴
        /** @type {domMainSensor} */
        const sensorStatus = {
          ndId,
          ndName: BU.replaceAll(nodeDefRow.nd_target_name, ' ', ''),
          dataUnit: nodeDefRow.data_unit,
          value: sensorUtil.calcSensorProfileRows(viewSensorProfileRows, {
            calcKey: ndId,
            // standardDate: moment('2018-11-12 09:19:00').toDate(),
          }),
        };
        sensorStatusList.push(sensorStatus);
      }

      const result = sensorUtil.calcSensorProfileRows(viewSensorProfileRows, {
        calcKey: ndId,
        // standardDate: moment('2018-11-12 09:19:00').toDate(),
      });
      _.assign(sensorDataInfo, { [ndId]: result });
    });

    // searchRange = biModule.createSearchRange({
    //   strStartDate: '2018-11-01',
    //   searchType: 'days',
    //   searchInterval: 'day',
    // });
    // BU.CLI(searchRange);
    // 인버터 트렌드 구함
    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    _.set(
      req,
      'locals.dom.sensorStatusListDom',
      domMakerMain.makeSensorStatusDom(sensorStatusList),
    );
    // 인버터 현재 데이터 동적 생성 돔
    _.set(
      req,
      'locals.dom.inverterStatusListDom',
      domMakerMain.makeInverterStatusDom(validInverterDataList),
    );

    // req.locals.dailyPowerChartData = chartData;
    // req.locals.moduleStatusList = validModuleStatusList;
    req.locals.powerGenerationInfo = powerGenerationInfo;
    req.locals.growthEnv = sensorDataInfo;
    // BU.CLI(req.locals);
    res.render('./main/index', req.locals);
  }),
);

module.exports = router;
