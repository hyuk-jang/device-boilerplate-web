const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const domMakerMain = require('../../models/domMaker/mainDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
      viewPowerProfileRows,
    } = req.locals;

    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {WEATHER_DEVICE_DATA} */
    const weatherDeviceStatus = await weatherModel.getWeatherDeviceRow();

    /** @type {WC_KMA_DATA} */
    const weatherCastList = _.get(req, 'locals.weatherCastList');

    // 기상 계측 장치의 데이터가 유효할경우 저장
    moment().diff(moment(weatherDeviceStatus.writedate), 'minutes') >= 10
      ? _.set(req, 'locals.salternEnvInfo', {})
      : _.set(req, 'locals.salternEnvInfo', weatherDeviceStatus);

    // ********** Power 관련
    // 발전 현황을 나타내는 기본적인 정보
    const { powerGenerationInfo, validInverterDataList } = await refineModel.refineGeneralPowerInfo(
      siteId,
    );

    const searchRange = refineModel.createSearchRange({ searchInterval: 'min10' });

    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');
    // 인버터 평균 출력 현황 차트로 긁어옴
    const inverterLineChart = await refineModel.refineInverterChart(searchRange, inverterSeqList, {
      domId: 'daily_kw_graph',
      // title: '인버터 발전 현황',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        // groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    });

    // 인버터 현재 데이터 동적 생성 돔
    _.set(
      req,
      'locals.dom.inverterStatusListDom',
      domMakerMain.makeInverterStatusDom(validInverterDataList),
    );

    const deviceProtocol = new DeviceProtocol();
    _.set(
      req,
      'locals.dom.weatherCastTableDom',
      domMakerMain.makeWeatherCastTableDom(
        weatherCastList,
        deviceProtocol.getBlockStatusTable('weatherCast'),
      ),
    );

    req.locals.inverterLineChart = inverterLineChart;
    req.locals.powerGenerationInfo = powerGenerationInfo;
    req.locals.weatherCastList = weatherCastList;

    // BU.CLI(req.locals);
    res.render('./UPSAS/main/index', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/main/index', req.locals);
  }),
);

module.exports = router;
