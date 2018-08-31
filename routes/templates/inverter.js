const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const {BU, DU} = require('base-util-jh');

const BiModule = require('../models/BiModule.js');
const webUtil = require('../models/web.util');

// TEST
const tempSacle = require('../temp/tempSacle');

module.exports = app => {
  const initSetter = app.get('initSetter');
  const biModule = new BiModule(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }
      _.set(req, 'locals.menuNum', 4);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await biModule.getTable(
        'v_upsas_profile',
        {main_seq: user.main_seq},
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Array.<{photovoltaic_seq:number, connector_ch: number, pv_target_name:string, pv_manufacturer: string, cnt_target_name: string, ivt_target_name: string, install_place: string, writedate: Date, amp: number, vol: number, hasOperation: boolean }>
  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // BU.CLI('inverter', req.locals)
      /** @type {V_MEMBER} */
      const userInfo = req.locals.user;
      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfileList = req.locals.viewPowerProfile;
      // console.time('getTable')

      const inverterSeqList = _.map(viewPowerProfileList, 'inverter_seq');

      /** @type {V_INVERTER_STATUS[]} */
      const viewInverterStatusList = await biModule.getTable('v_inverter_status', {
        inverter_seq: inverterSeqList,
      });

      let searchRange = biModule.getSearchRange('min10');
      // searchRange.searchInterval = 'day';
      const waterLevelDataPacket = await biModule.getWaterLevel(searchRange, inverterSeqList);

      // 기상 관측 장비 트렌드를 가져옴
      const weatherDeviceTrend = await biModule.getWeatherTrend(searchRange, userInfo.main_seq);

      // weatherDeviceTrend[0].total_interval_inclined_solar
      // 수평 일사량
      const dailyHorizontalSolar = _(weatherDeviceTrend)
        .map('total_interval_solar')
        .sum();
      // 경사 일사량
      const dailyInclinedSolar = _(weatherDeviceTrend)
        .map('total_interval_inclined_solar')
        .sum();

      // TEST 모듈 가중치 적용 계산
      viewInverterStatusList.forEach(viewInverterStatusInfo => {
        const foundIt = _.find(tempSacle.inverterScale, {
          inverter_seq: viewInverterStatusInfo.inverter_seq,
        });
        // currentItem.in_a = _.round(foundIt.scale * currentItem.in_a, 1);
        viewInverterStatusInfo.in_w = _.round(foundIt.scale * viewInverterStatusInfo.in_w, 1);
        // currentItem.out_a = _.round(foundIt.scale * currentItem.out_a, 1);
        viewInverterStatusInfo.out_w = _.round(foundIt.scale * viewInverterStatusInfo.out_w, 1);
        // currentItem.d_wh = _.round(foundIt.scale * currentItem.d_wh, 0);
        // currentItem.c_wh = _.round(foundIt.scale * currentItem.c_wh, 0);
        viewInverterStatusInfo.daily_power_wh = _.round(
          foundIt.scale * viewInverterStatusInfo.daily_power_wh,
          0,
        );
      });

      // 인버터 현황 목록을 순회
      _.forEach(viewInverterStatusList, inverterStatusInfo => {
        const waterLevelData = _.find(waterLevelDataPacket, {
          inverter_seq: inverterStatusInfo.inverter_seq,
        });
        const foundInverterStatusInfo = _.find(viewInverterStatusList, {
          inverter_seq: inverterStatusInfo.compare_inverter_seq,
        });

        const foundViewPowerProfileInfo = _.find(viewPowerProfileList, {
          inverter_seq: inverterStatusInfo.inverter_seq,
        });

        // 장소 관계에 따라 수평 일사량 or 경사 일사량 총량 정의
        const dailySolarWh = foundViewPowerProfileInfo.place_id.includes('SEB')
          ? dailyHorizontalSolar
          : dailyInclinedSolar;
        // 모듈 발전 효율 검증.
        let modulePowerEfficiency = _.round(
          (inverterStatusInfo.daily_power_wh / (dailySolarWh * 0.975 * 1.65 * 6)) * 100,
          1,
        );
        modulePowerEfficiency = _.isNaN(modulePowerEfficiency) ? '' : modulePowerEfficiency;

        // 추가할 확장 정보 정의
        const addValueInfo = {
          waterLevel:
            waterLevelData && _.isNumber(waterLevelData.water_level)
              ? waterLevelData.water_level
              : '',
          compareEfficiency: _.round(
            (_.get(inverterStatusInfo, 'daily_power_wh') /
              _.get(foundInverterStatusInfo, 'daily_power_wh')) *
              100,
            1,
          ),
          modulePowerEfficiency,
        };

        // 확장 실행
        _.assign(inverterStatusInfo, addValueInfo);
      });

      // 데이터 검증
      const validInverterStatus = webUtil.checkDataValidation(
        viewInverterStatusList,
        new Date(),
        'writedate',
      );
      // BU.CLI(_.map(viewInverterStatus, 'daily_power_wh'));
      /** 인버터 메뉴에서 사용 할 데이터 선언 및 부분 정의 */
      const refinedInverterStatus = webUtil.refineSelectedInverterStatus(validInverterStatus);
      // BU.CLI(refinedInverterStatus);

      // let searchRange = biModule.getSearchRange('hour', '2018-03-10');
      searchRange = biModule.getSearchRange('min10');
      const inverterPowerList = await biModule.getInverterPower(searchRange, inverterSeqList);
      // BU.CLI(inverterPowerList);
      const chartOption = {
        selectKey: 'out_w',
        dateKey: 'view_date',
        groupKey: 'ivt_target_id',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      };

      const chartData = webUtil.makeDynamicChartData(inverterPowerList, chartOption);
      // BU.CLI(chartData);

      /* Scale 적용 */
      chartData.series.forEach(currentItem => {
        const foundIt = _.find(tempSacle.inverterScale, {
          target_id: currentItem.name,
        });
        currentItem.data.forEach((data, index) => {
          currentItem.data[index] = data === '' ? '' : Number((data * foundIt.scale).scale(1, 1));
        });
      });

      // BU.CLI(refinedInverterStatus);
      webUtil.mappingChartDataName(chartData, viewInverterStatusList, 'target_id', 'target_name');

      req.locals.inverterStatus = refinedInverterStatus;
      req.locals.chartDataObj = chartData;
      req.locals.powerInfo = {
        measureTime: `${BU.convertDateToText(new Date(), '', 4)}:00`,
      };
      // BU.CLI(req.locals.powerInfo);

      return res.render('./inverter/inverter.html', req.locals);
    }),
  );

  router.use(
    asyncHandler(async (err, req, res) => {
      BU.CLI('Err', err);
      res.status(500).send(err);
    }),
  );

  return router;
};
