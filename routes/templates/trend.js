const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

// const BiModule = require('../models/BiModule.js');
const webUtil = require('../models/web.util');
const excelUtil = require('../models/excel.util');
const PowerModel = require('../models/PowerModel');
const BiDevice = require('../models/BiDevice');

const defaultRangeFormat = 'min10';
module.exports = app => {
  const initSetter = app.get('initSetter');
  const powerModel = new PowerModel(initSetter.dbInfo);
  const biDevice = new BiDevice(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }
      _.set(req, 'locals.menuNum', 5);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await powerModel.getTable(
        'v_upsas_profile',
        { main_seq: user.main_seq },
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await powerModel.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      /** @type {V_MEMBER} */
      const userInfo = req.locals.user;

      /** @type {V_UPSAS_PROFILE[]} */
      let viewPowerProfileList = req.locals.viewPowerProfile;

      const deviceType = 'inverter';
      const deviceListType = 'inverter';

      // 장비 선택 seq (all, number)

      let deviceSeqList = [];
      if (BU.isNumberic(req.query.device_seq)) {
        deviceSeqList = Number(req.query.device_seq);
        viewPowerProfileList = _.filter(viewPowerProfileList, { inverter_seq: deviceSeqList });
      } else {
        deviceSeqList = _.map(viewPowerProfileList, 'inverter_seq');
      }

      // BU.CLIS(deviceType, deviceListType, deviceSeq);
      // Search 타입을 지정
      const searchType = req.query.search_type ? req.query.search_type : defaultRangeFormat;
      // 지정된 SearchType으로 설정 구간 정의
      let searchRange = powerModel.getSearchRange(
        searchType,
        req.query.start_date,
        req.query.end_date,
      );
      // BU.CLI(searchRange);
      // 검색 조건이 기간 검색이라면 검색 기간의 차를 구하여 실제 searchType을 구함.
      if (searchType === 'range') {
        const realSearchType =
          searchType === 'range'
            ? powerModel.convertSearchTypeWithCompareDate(
                searchRange.strEndDate,
                searchRange.strStartDate,
              )
            : searchType;
        if (realSearchType === 'hour') {
          searchRange = powerModel.getSearchRange(
            defaultRangeFormat,
            req.query.start_date,
            req.query.end_date,
          );
        } else {
          searchRange.searchType = realSearchType;
          searchRange.searchInterval = realSearchType;
        }
      }
      // BU.CLIS(req.query, searchRange);

      // 장비 선택 리스트 가져옴
      const deviceList = await powerModel.getInverterList(deviceSeqList);
      // BU.CLI(deviceList);

      // 차트 제어 및 자질 구래한 데이터 모음
      const searchOption = {
        device_type: deviceType,
        device_list_type: deviceListType,
        device_seq: deviceSeqList,
        device_list: deviceList,
        search_range: searchRange,
        search_type: searchType,
      };
      // BU.CLI(searchOption);

      /** searchRange를 기준으로 검색 Column Date를 정함  */
      const betweenDatePoint = BU.getBetweenDatePoint(
        searchRange.strBetweenEnd,
        searchRange.strBetweenStart,
        searchRange.searchInterval,
      );

      // 모듈 뒷면 온도 데이터 가져옴
      // const {sensorChartData, sensorTrend} = ;
      const moduleRearTemperatureChartInfo = await biDevice.getDeviceChart(
        viewPowerProfileList,
        'moduleRearTemperature',
        searchRange,
        betweenDatePoint,
      );

      // BU.CLI(moduleRearTemperatureChartInfo.sensorChartData)

      // 수온을 가져옴
      const brineTemperatureChartInfo = await biDevice.getDeviceChart(
        viewPowerProfileList,
        'brineTemperature',
        searchRange,
        betweenDatePoint,
      );

      // 장치 관련 차트 정보 객체
      const deviceChartInfo = {
        moduleRearTemperatureChartInfo,
        brineTemperatureChartInfo,
      };

      // 인버터 차트
      const {
        inverterPowerChartData,
        inverterTrend,
        viewInverterStatusList,
      } = await powerModel.getInverterChart(searchOption, searchRange, betweenDatePoint);
      // BU.CLI(inverterTrend);
      // 차트 Range 지정
      const powerChartData = { range: betweenDatePoint.shortTxtPoint, series: [] };
      // 차트 합침
      powerChartData.series = inverterPowerChartData.series;
      // BU.CLI(powerChartData)

      // /** 차트를 표현하는데 필요한 Y축, X축, Title Text 설정 객체 생성 */
      const chartDecoration = webUtil.makeChartDecoration(searchRange);

      // 기상계측 Trend 및 차트 데이터
      const {
        weatherChartData,
        weatherTrend,
        weatherChartOptionList,
      } = await powerModel.getWeatherChart(searchRange, betweenDatePoint, userInfo.main_seq);
      // 기상청 날씨 정보
      const weatherCastRowDataPacketList = await powerModel.getWeatherCastAverage(
        searchRange,
        userInfo.weather_location_seq,
      );
      // 수위
      const waterLevelDataPacketList = await powerModel.getWaterLevel(
        searchRange,
        searchOption.device_seq,
      );
      // 달력
      const calendarCommentList = await powerModel.getCalendarComment(
        searchRange,
        userInfo.main_seq,
      );
      // BU.CLI(calendarCommentList);
      // BU.CLI(viewInverterPacketList);
      const createExcelOption = {
        calendarCommentList,
        viewInverterStatusList,
        inverterTrend,
        powerChartData,
        powerChartDecoration: chartDecoration,
        waterLevelDataPacketList,
        weatherCastRowDataPacketList,
        weatherTrend,
        weatherChartOptionList,
        searchRange,
        deviceChartInfo,
        // mrtTrend: moduleRearTemperatureChartInfo.sensorTrend,
        // mrtSensorChartData: moduleRearTemperatureChartInfo.sensorChartData,
      };

      const workSheetInfo = excelUtil.makeChartDataToExcelWorkSheet(createExcelOption);
      const excelContents = excelUtil.makeExcelWorkBook(workSheetInfo.sheetName, [workSheetInfo]);
      // let excelContents = excelUtil.makeExcelWorkBook(workSheetInfo.sheetName, [workSheetInfo]);

      // 발전량 차트에 일사량 차트 추가 및 환경 차트에서 일사량 차트 제거
      // BU.CLI(weatherChartData);
      // BU.CLI(weatherChartOptionList)
      weatherChartOptionList.forEach(weatherChartInfo => {
        if (weatherChartInfo.selectKey.includes('solar')) {
          const removedList = _.remove(weatherChartData.series, series =>
            _.eq(series.name, weatherChartInfo.name),
          );
          if (removedList.length) {
            powerChartData.series = _.concat(powerChartData.series, removedList);
          }
        }
      });

      // _.forEach(weatherChartData.series, (series, index) => {
      //   powerChartData.series = _.concat(powerChartData.series, _.pullAt(weatherChartData.series, 0));
      // })

      // TEST Water Level Add Chart Code Start *****************
      const chartOption = {
        selectKey: 'water_level',
        dateKey: 'group_date',
        groupKey: 'target_name',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      };

      webUtil.addKeyToReport(
        waterLevelDataPacketList,
        viewInverterStatusList,
        'chart_color',
        'inverter_seq',
      );
      webUtil.addKeyToReport(
        waterLevelDataPacketList,
        viewInverterStatusList,
        'chart_sort_rank',
        'inverter_seq',
      );
      webUtil.addKeyToReport(
        waterLevelDataPacketList,
        viewInverterStatusList,
        'target_name',
        'inverter_seq',
      );
      let testWeatherInfoPacketList = [];
      if (['min', 'min10', 'hour'].includes(searchRange.searchType)) {
        betweenDatePoint.fullTxtPoint.forEach(date => {
          waterLevelDataPacketList.forEach(currentItem => {
            const addObj = {
              target_name: currentItem.target_name,
              water_level: currentItem.water_level,
              chart_color: currentItem.chart_color,
              chart_sort_rank: currentItem.chart_sort_rank,
              group_date: date,
            };
            testWeatherInfoPacketList.push(addObj);
          });
        });
      } else {
        testWeatherInfoPacketList = waterLevelDataPacketList;
      }
      const testWeatherInfoChart = webUtil.makeStaticChartData(
        testWeatherInfoPacketList,
        betweenDatePoint,
        chartOption,
      );

      testWeatherInfoChart.series = _.concat(testWeatherInfoChart.series, weatherChartData.series);
      // TEST Water Level Add Chart Code End *****************

      // 모듈 수온에 육상 모듈 온도를 더하기 위한 작업
      const earthModuleMrtChartSeries = _.filter(
        moduleRearTemperatureChartInfo.sensorChartData.series,
        seriesInfo => _.includes(seriesInfo.name, '육상'),
      );

      brineTemperatureChartInfo.sensorChartData.series = _.concat(
        earthModuleMrtChartSeries,
        brineTemperatureChartInfo.sensorChartData.series,
      );

      // BU.CLI(sensorChartData)
      req.locals.searchOption = searchOption;
      req.locals.powerChartData = powerChartData;
      req.locals.mrtChartData = moduleRearTemperatureChartInfo.sensorChartData;
      req.locals.btChartData = brineTemperatureChartInfo.sensorChartData;
      req.locals.chartDecorator = chartDecoration;
      req.locals.weatherChartData = testWeatherInfoChart;
      req.locals.workBook = excelContents;
      return res.render('./trend/trend.html', req.locals);
    }),
  );

  // router.use(asyncHandler(async (err, req, res) => {
  //   // BU.log('Err', err);
  //   res.status(500).send(err);
  // }));

  return router;
};
