const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

const BiModule = require('../models/BiModule.js');
const BiDevice = require('../models/BiDevice');
const webUtil = require('../models/web.util');

// TEST
const tempSacle = require('../temp/tempSacle');

module.exports = app => {
  const initSetter = app.get('initSetter');
  const biModule = new BiModule(initSetter.dbInfo);
  const biDevice = new BiDevice(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }

      _.set(req, 'locals.menuNum', 1);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await biModule.getTable(
        'v_upsas_profile',
        { main_seq: user.main_seq },
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // NOTE : SQL문의 수정이 잦아지는 관계로 대표 Method로 처리. 성능을 위해서라면 차후 튜닝 필요
      // 당월 발전량을 구하기 위한 옵션 설정 (strStartDate, strEndDate 를 당월로 설정하기 위함)
      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfileList = req.locals.viewPowerProfile;

      const inverterSeqList = _.map(viewPowerProfileList, 'inverter_seq');
      const photovoltaicSeqList = _.map(viewPowerProfileList, 'photovoltaic_seq');

      // console.time('0');
      let searchRange = biModule.getSearchRange('day');
      // 검색 조건이 일 당으로 검색되기 때문에 금월 날짜로 date Format을 지정하기 위해 day --> month 로 변경
      searchRange.searchType = 'month';
      const inverterPowerByMonth = await biModule.getInverterPower(searchRange, inverterSeqList);
      const monthPower = webUtil.calcValue(
        webUtil.reduceDataList(inverterPowerByMonth, 'interval_power'),
        0.001,
        1,
      );

      // 오늘자 발전 현황을 구할 옵션 설정(strStartDate, strEndDate 를 오늘 날짜로 설정하기 위함)
      // 검색 조건이 시간당으로 검색되기 때문에 금일 날짜로 date Format을 지정하기 위해 hour --> day 로 변경
      const cumulativePowerList = await biModule.getInverterCumulativePower(inverterSeqList);
      const cumulativePower = webUtil.calcValue(
        webUtil.reduceDataList(cumulativePowerList, 'max_c_wh'),
        0.000001,
        3,
      );

      // console.timeEnd('0');
      // console.time('0.5');
      // 금일 발전 현황 데이터
      searchRange = biModule.getSearchRange('min10');
      // searchRange = biModule.getSearchRange('min10', '2018-08-12');

      const inverterTrend = await biModule.getInverterTrend(searchRange, inverterSeqList);

      // 하루 데이터(10분 구간)는 특별히 데이터를 정제함.
      if (
        searchRange.searchType === 'min' ||
        searchRange.searchType === 'min10' ||
        searchRange.searchType === 'hour'
      ) {
        let maxRequiredDateSecondValue = 0;
        switch (searchRange.searchType) {
          case 'min':
            maxRequiredDateSecondValue = 120;
            break;
          case 'min10':
            maxRequiredDateSecondValue = 1200;
            break;
          case 'hour':
            maxRequiredDateSecondValue = 7200;
            break;
          default:
            break;
        }
        const calcOption = {
          calcMaxKey: 'max_c_wh',
          calcMinKey: 'min_c_wh',
          resultKey: 'interval_power',
          groupKey: 'inverter_seq',
          rangeOption: {
            dateKey: 'group_date',
            maxRequiredDateSecondValue,
            minRequiredCountKey: 'total_count',
            minRequiredCountValue: 9,
          },
        };
        webUtil.calcRangePower(inverterTrend, calcOption);
      }

      const dailyPower = _.round(
        webUtil.reduceDataList(inverterTrend, 'interval_power') * 0.001,
        2,
      );

      const chartOption = { selectKey: 'interval_power', dateKey: 'view_date', hasArea: true };
      const chartData = webUtil.makeDynamicChartData(inverterTrend, chartOption);

      // BU.CLI(chartData);
      // BU.CLI(inverterPowerList);
      webUtil.applyScaleChart(chartData, 'day');
      webUtil.mappingChartDataName(chartData, '인버터 시간별 발전량');

      biModule.getTable('v_dv_sensor_data');

      // console.timeEnd('0.5');

      // console.time('1');
      // 접속반 현재 발전 현황
      let moduleStatus = await biModule.getModuleStatus(photovoltaicSeqList);
      moduleStatus = _.sortBy(moduleStatus, 'chart_sort_rank');

      // 장소에 관련된 현재 모든 장치 데이터

      const weatherDeviceStatus = await biModule.getWeather(photovoltaicSeqList);
      // 인버터 발전 현황 데이터 검증
      const validWeatherDeviceStatus = webUtil.checkDataValidation(
        weatherDeviceStatus,
        new Date(),
        'writedate',
      );
      const validWeatherDevice = _.head(validWeatherDeviceStatus);

      // TEST 구간
      // BU.CLI(moduleStatus);
      // BU.CLI(tempSacle);
      moduleStatus.forEach(currentItem => {
        const foundIt = _.find(tempSacle.moduleScale, {
          photovoltaic_seq: currentItem.photovoltaic_seq,
        });
        currentItem.vol = _.round(currentItem.vol * _.get(foundIt, 'scale'), 1);
      });

      // 접속반 발전 현황 데이터 검증
      // BU.CLI(moduleStatus);
      const validModuleStatusList = webUtil.checkDataValidation(
        moduleStatus,
        new Date(),
        'writedate',
      );
      validModuleStatusList.forEach(moduleInfo => {
        const moduleData = moduleInfo.data;
        moduleData.module_name = `${moduleData.install_place} ${moduleData.target_name} (${
          moduleData.module_type
        })`;
      });

      // console.timeEnd('1');
      // BU.CLI(validModuleStatusList);
      // 금일 발전 현황
      // 인버터 현재 발전 현황
      const inverterDataList = await biModule.getTable('v_inverter_status', {
        inverter_seq: inverterSeqList,
      });

      // 인버터 데이터 목록에 모듈 온도를 확장
      await biDevice.extendsPlaceDeviceData(inverterDataList, 'moduleRearTemperature');
      // BU.CLI(inverterDataList);

      const earthModuleTemp = _(inverterDataList)
        .filter({ install_place: '육상' })
        .map('moduleRearTemperature')
        .mean();

      const waterModuleTemp = _(inverterDataList)
        .filter({ install_place: '수중' })
        .map('moduleRearTemperature')
        .mean();
      // BU.CLIS(earthModuleTemp, waterModuleTemp)
      // 인버터 발전 현황 데이터 검증
      const validInverterDataList = webUtil.checkDataValidation(
        inverterDataList,
        new Date(),
        'writedate',
      );

      // 설치 인버터 총 용량
      const pv_amount = _(viewPowerProfileList)
        .map('pv_amount')
        .sum();
      const powerGenerationInfo = {
        currKw: webUtil.calcValue(
          webUtil.calcValidDataList(validInverterDataList, 'out_w', false),
          0.001,
          3,
        ),
        currKwYaxisMax: _.round(_.multiply(pv_amount, 0.001)),
        dailyPower: dailyPower === '' ? 0 : dailyPower,
        monthPower,
        cumulativePower,
        co2: _.round(cumulativePower * 0.424, 3),
        earthModuleTemp: _.isNumber(earthModuleTemp) ? _.round(earthModuleTemp, 1) : '',
        waterModuleTemp: _.isNumber(waterModuleTemp) ? _.round(waterModuleTemp, 1) : '',
        solarRadiation: _.get(validWeatherDevice, 'hasValidData')
          ? validWeatherDevice.data.solar
          : '',
        hasOperationInverter: _.every(
          _.values(_.map(validInverterDataList, data => data.hasValidData)),
        ),
        hasAlarm: false, // TODO 알람 정보 작업 필요
      };
      // BU.CLI(chartData);
      req.locals.dailyPowerChartData = chartData;
      req.locals.moduleStatusList = validModuleStatusList;
      req.locals.powerGenerationInfo = powerGenerationInfo;

      // BU.CLI(validModuleStatusList);

      return res.render('./main/index.html', req.locals);
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
