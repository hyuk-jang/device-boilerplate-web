const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const domMakerMain = require('../../models/domMaker/mainDom');

const commonUtil = require('../../models/templates/common.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

require('../../models/jsdoc/domGuide');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {WEATHER_DEVICE_DATA} */
    const weatherDeviceStatus = await weatherModel.getWeatherDeviceRow();

    // 기상 계측 장치의 데이터가 유효할경우 저장
    moment().diff(moment(weatherDeviceStatus.writedate), 'minutes') >= 10
      ? _.set(req, 'locals.salternEnvInfo', {})
      : _.set(req, 'locals.salternEnvInfo', weatherDeviceStatus);

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    /** @type {V_PW_PROFILE[]} powerProfileRows */
    const powerProfileRows = req.locals.viewPowerProfileRows;

    // ********** Power 관련
    /** @type {WC_KMA_DATA} */
    const weatherCastList = _.get(req, 'locals.weatherCastList');
    // BU.CLI(searchRangeInfo);

    // 발전 현황을 나타내는 기본적인 정보
    const { powerGenerationInfo, validInverterDataList } = await refineModel.refineGeneralPowerInfo(
      siteId,
    );

    const searchRange = refineModel.createSearchRange({ searchInterval: 'min10' });

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

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

    // const weatherDeviceRows = await weatherModel.getWeatherDeviceAverage(searchRange);

    // BU.CLIN(inverterLineChart, 4);
    // BU.CLIN(weatherDeviceRows);

    // 인버터 현재 데이터 동적 생성 돔
    _.set(
      req,
      'locals.dom.inverterStatusListDom',
      domMakerMain.makeInverterStatusDom(validInverterDataList),
    );

    // TODO: 기상 환경 정보 동적 생성 돔
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
