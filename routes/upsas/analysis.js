const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');

const commonUtil = require('../../models/templates/common.util');

const reportDom = require('../../models/domMaker/reportDom');
const salternDom = require('../../models/domMaker/salternDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

const mType = {
  EARTH_30: 'earth30angle',
  EARTH_0: 'earth0angle',
  WATER_0: 'water0angle',
};

const DEFAULT_CATEGORY = 'efficiency';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'efficiency',
    btnName: '효율분석',
  },
  {
    subCategory: 'prediction',
    btnName: '발전분석',
  },
  {
    subCategory: 'powerPrediction',
    btnName: '발전 예측 및 분석',
  },
];

const colorTable1 = ['greenyellow', 'violet', 'gold', 'aliceblue'];
const colorTable2 = ['blue', 'purple', 'gray', 'orange'];

// analysis middleware
router.get(
  [
    '/',
    '/:siteId',
    '/:siteId/:subCategory',
    '/:siteId/:subCategory/:subCategoryId',
    '/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    // req.param 값 비구조화 할당
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    const isMonitoringMode = req.user.user_id === 'vip' ? 1 : 0;
    _.set(req, 'locals.isMonitoringMode', isMonitoringMode);

    next();
  }),
);

// 효율 분석
router.get(
  ['/', '/:siteId', '/:siteId/efficiency'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
    } = req.locals;

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {AnalysisModel} */
    const analysisModel = global.app.get('analysisModel');
    // console.time('금일 발전 효율 트렌드');
    // ----------------- 금일 발전 효율 트렌드
    // 1. 금일 검색 구간 정의
    let dailySearchRange = analysisModel.createSearchRange({
      // FIXME: 날짜 변경 시 수정 (기본값 1)
      // strStartDate: moment()
      //   .subtract(11, 'day')
      //   .format('YYYY-MM-DD'),
      searchType: 'days',
      searchInterval: 'min10',
    });
    // 2. 발전 효율 구함
    let dailyPowerEffRows = await analysisModel.getPowerEffReport(dailySearchRange);

    // 3. 발전 효율의 시작 및 종료 시간 구함
    const { sDate, eDate } = analysisModel.getStartEndDate(dailyPowerEffRows);
    dailySearchRange.strStartDate = sDate;
    dailySearchRange.strEndDate = eDate;

    // 4. 발전 효율을 카테고리 별로 분류하고 chartData에 맞게 데이터 변환 후 반환
    let moduleEfficiencyChart = analysisModel.makePowerEfficiencyChart(dailyPowerEffRows, {
      // groupKey: 'inverter_seq',
      dataKey: 'avg_power_eff',
      colorTable: colorTable1,
    });

    // 4. 기상 계측 데이터를 구하고 일사량 차트 데이터 생성
    // console.time('weater_1');
    let weatherDeviceRows = await weatherModel.getWeatherTrend(dailySearchRange, siteId);
    // console.timeEnd('weater_1');
    let weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_solar',
        name: '일사량',
        yAxis: 1,
        color: 'red',
        dashStyle: 'ShortDash',
      },
    ]);

    // 5. 금일 발전 효율 차트(발전량, 일사량) 병합
    let dailyPowerChart = moduleEfficiencyChart.concat(weatherCharts);
    // 6. req 객체에 발전 효율 차트 정보 정의
    _.set(req.locals, 'chartInfo.dailyPowerChart', dailyPowerChart);
    // console.timeEnd('금일 발전 효율 트렌드');

    // console.time('금일 환경 변화 추이');
    // ----------------- 금일 환경 변화 추이
    // 1. 비교군 모듈 온도, 수온 구함
    // console.time('getEnvReport');
    let envReportRows = await analysisModel.getEnvReport(dailySearchRange);
    // console.timeEnd('getEnvReport');

    // 2. 날짜 데이터를 UTC로 변환 (모듈 온도로 분석)
    let envModuleTempChart = _(envReportRows)
      .groupBy('install_place')
      .map((envRows, installPlace) => {
        return {
          sortIndex: envRows[0].chart_sort_rank,
          name: `${installPlace} 모듈 온도`,
          data: envRows.map(row => {
            return [commonUtil.convertDateToUTC(row.group_date), row.avg_module_rear_temp];
          }),
        };
      })
      .sortBy('sortIndex')
      .forEach((chartData, index) => {
        chartData.color = colorTable1[index];
      });

    // 3. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    let envBrineTempChart = {
      name: '시스템 수온',
      color: 'skyblue',
      data: _(envReportRows)
        .filter(envRow => envRow.target_category === mType.WATER_0)
        .map(envRow => [commonUtil.convertDateToUTC(envRow.group_date), envRow.avg_brine_temp])
        .value(),
    };

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_temp',
        name: '외기 온도',
        color: 'red',
      },
    ]);

    let dailyEnvChart = envModuleTempChart.concat(envBrineTempChart, ...weatherCharts);

    _.set(req.locals, 'chartInfo.dailyEnvChart', dailyEnvChart);
    // console.timeEnd('금일 환경 변화 추이');

    // console.time('지난 3일 효율 분석');
    // ----------------- 지난 3일 효율 분석
    // 1. 지난 3일 Search Range 정의
    const prevSearchRange = analysisModel.createSearchRange({
      searchType: 'range',
      searchInterval: 'day',
      // FIXME: 날짜 변경 시 수정 (기본값 3, 1)
      strStartDate: moment()
        .subtract(3, 'day')
        .format('YYYY-MM-DD'),
      strEndDate: moment()
        .subtract(1, 'day')
        .format('YYYY-MM-DD'),
    });

    // 2. 지난 3일동안의 발전 효율 구함 (1일 합산)
    const prevPowerEffRows = await analysisModel.getPowerEffReport(prevSearchRange);

    // 3. 구간 발전량을 데이터 Key 로 하여 모듈 효율 분석
    const prevRangePowerEffChart = analysisModel.makePowerEfficiencyChart(prevPowerEffRows, {
      dataKey: 'peak_power_eff',
      colorTable: colorTable1,
    });

    // 4. req 객체에 할당
    _.set(req.locals, 'chartInfo.prevRangePowerEffChart', prevRangePowerEffChart);
    // console.timeEnd('지난 3일 효율 분석');

    // console.time('최대 발전 효율 차트 생성');
    // ----------------- 최대 발전 효율 차트 생성
    // 1. 수중태양광 발전 효율이 가장 높게 나온 날의 발전 효율 트렌드 구함
    const maxDailyPowerEff = _.maxBy(prevPowerEffRows, row => {
      return row.target_category === mType.WATER_0 && row.t_interval_power_eff;
    });
    // 2. 해당 날의 Search Range 생성
    dailySearchRange = analysisModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
      strStartDate: moment(maxDailyPowerEff.group_date),
    });

    // 3. 발전 효율 데이터 구함
    // console.time('getPowerEffReport');
    dailyPowerEffRows = await analysisModel.getPowerEffReport(dailySearchRange);
    // console.timeEnd('getPowerEffReport');
    // 4. 발전 효율이 시작 및 종료 시간 구함
    const { sDate: sMaxDate, eDate: eMaxDate } = analysisModel.getStartEndDate(dailyPowerEffRows);
    dailySearchRange.strStartDate = sMaxDate;
    dailySearchRange.strEndDate = eMaxDate;

    // 5. 발전 효율을 카테고리 별로 분류하고 chartData에 맞게 데이터 변환
    moduleEfficiencyChart = analysisModel.makePowerEfficiencyChart(dailyPowerEffRows, {
      dataKey: 'avg_power_eff',
      colorTable: colorTable1,
      // dateKey: 'group'
      // groupKey: 'inverter_seq',
      // nameKeys: ['install_place', 'serial_number'],
    });
    // 6. 기상 계측 정보 구함
    weatherDeviceRows = await weatherModel.getWeatherTrend(dailySearchRange, siteId);
    // 7. 최대 발전효율 일사량 차트 데이터 생성
    weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_solar',
        name: '일사량',
        color: 'red',
        yAxis: 1,
        dashStyle: 'ShortDash',
      },
    ]);
    // 8. 최대 발전 효율 차트(발전량, 일사량) 병합
    dailyPowerChart = moduleEfficiencyChart.concat(weatherCharts);

    // 9. req 객체에 차트 정보 및 검색 구간 정보 할당
    _.set(req.locals, 'chartInfo.dailyMaxPowerChart', dailyPowerChart);
    _.set(req.locals, 'searchRangeInfo.dailyMaxSR', dailySearchRange);
    // console.timeEnd('최대 발전 효율 차트 생성');

    // console.time('최대 환경 변화 추이');
    // ----------------- 최대 환경 변화 추이
    // 1. 비교군 모듈 온도, 수온 구함
    envReportRows = await analysisModel.getEnvReport(dailySearchRange);

    // 2. 날짜 데이터를 UTC로 변환 (모듈 온도로 분석)
    envModuleTempChart = _(envReportRows)
      .groupBy('install_place')
      .map((envRows, installPlace) => {
        return {
          sortIndex: envRows[0].chart_sort_rank,
          name: `${installPlace} 모듈 온도`,
          data: envRows.map(row => {
            return [commonUtil.convertDateToUTC(row.group_date), row.avg_module_rear_temp];
          }),
        };
      })
      .sortBy('sortIndex')
      .forEach((chartData, index) => {
        chartData.color = colorTable1[index];
      });

    // 3. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    envBrineTempChart = {
      name: '시스템 수온',
      color: 'skyblue',
      data: _(envReportRows)
        .filter(envRow => envRow.target_category === mType.WATER_0)
        .map(envRow => [commonUtil.convertDateToUTC(envRow.group_date), envRow.avg_brine_temp])
        .value(),
    };

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_temp',
        name: '외기 온도',
        color: 'red',
      },
    ]);

    dailyEnvChart = envModuleTempChart.concat(envBrineTempChart, ...weatherCharts);

    _.set(req.locals, 'chartInfo.dailyMaxEnvChart', dailyEnvChart);
    // console.timeEnd('최대 환경 변화 추이');
    // BU.CLIN(dailyPowerEffRows);

    // ----------------- 발전 효율 최대 순간 분석
    // 1. 해당 일의 발전 효율이 최대치일때의 순간 데이터를 구함
    let maxPeakEfficiencyInfo = _.maxBy(dailyPowerEffRows, row => {
      return row.target_category === mType.WATER_0 && row.avg_power_eff;
    });

    // 2. 해당 순간의 Search Range 생성(10분 구간 탐색)
    dailySearchRange.searchType = 'range';
    dailySearchRange.searchInterval = 'min';
    dailySearchRange.strStartDate = moment(maxPeakEfficiencyInfo.group_date).format(
      'YYYY-MM-DD HH:mm',
    );
    dailySearchRange.strEndDate = moment(maxPeakEfficiencyInfo.group_date)
      .add(10, 'minute')
      .format('YYYY-MM-DD HH:mm');

    // 3. 인버터 Seq를 기준으로 발전, 환경 레포트 추출, 기상 계측 정보 추출
    dailyPowerEffRows = await analysisModel.getPowerEffReport(dailySearchRange, 'inverter_seq');
    envReportRows = await analysisModel.getEnvReport(dailySearchRange, 'inverter_seq');
    weatherDeviceRows = await weatherModel.getWeatherTrend(dailySearchRange, siteId);

    // 4. 순간 범위(10분 중) 중에서도 가장 높은 순간을 찾음
    maxPeakEfficiencyInfo = _.maxBy(dailyPowerEffRows, row => {
      return row.target_category === mType.WATER_0 && row.avg_power_eff;
    });

    _.set(req, 'locals.maxPeakEfficiencyInfo', maxPeakEfficiencyInfo);

    // 5. 발전 효율 최대 순간 데이터(발전, 환경, 기상) 추출
    const maxPeakPowerRows = dailyPowerEffRows.filter(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );

    const maxPeakEnvRows = envReportRows.filter(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );
    const maxPeakWeatherRow = weatherDeviceRows.find(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );
    // 6. 순간 데이터 목록(발전, 환경, 기상) 중에서 날짜가 동일한 객체끼리 병합
    const maxPeakDataList = _.map(maxPeakPowerRows, powerRow => {
      const envRow = maxPeakEnvRows.find(
        row => row.inverter_seq === powerRow.inverter_seq && row.group_date === powerRow.group_date,
      );
      return Object.assign(powerRow, envRow, maxPeakWeatherRow);
    });

    const deviceProtocol = new DeviceProtocol();
    // 7. 병합된 데이터를 Table Dom 으로 변환
    const { tableHeaderDom, tableBodyDom } = salternDom.makeAnalysisStatusDom(
      maxPeakDataList,
      deviceProtocol.getBlockStatusTable('analysis'),
    );
    // 8. Req 객체에 발전 현황 정보와 테이블 정보 정의
    _.set(req, 'locals.maxPeakEnvRows', maxPeakDataList);
    _.set(req, 'locals.dom.tableHeaderDom', tableHeaderDom);
    _.set(req, 'locals.dom.tableBodyDom', tableBodyDom);

    // BU.CLI(req.locals);
    res.render('./UPSAS/analysis/efficiency', req.locals);
  }),
);

// 발전 분석
router.get(
  ['/:siteId/prediction'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { mainWhere, siteId },
      viewPowerProfileRows,
    } = req.locals;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {AnalysisModel} */
    const analysisModel = global.app.get('analysisModel');

    // ----------------- 금일 발전 효율 트렌드

    // 1. 검색 구간 정의
    let searchRange = analysisModel.createSearchRange({
      // FIXME: 1일전 테스트, 서비스시 제거
      // strStartDate: moment()
      //   .subtract(11, 'day')
      //   .format('YYYY-MM-DD'),
      searchType: 'days',
      searchInterval: 'min10',
    });
    // 2. 검색 인버터 정의
    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    /** @type {PW_INVERTER[]} */
    const inverterRows = await analysisModel.getTable('PW_INVERTER', {
      inverter_seq: inverterSeqList,
    });

    // 3. 발전량 레포트 추출
    let powerTrendRows = await analysisModel.getInverterTrend(searchRange, inverterSeqList);

    // 4. 발전 시작 및 종료 시간 구함
    const { sDate, eDate } = analysisModel.getStartEndDate(powerTrendRows);
    searchRange.strStartDate = sDate;
    searchRange.strEndDate = eDate;

    // 5. 기상 데이터 추출
    let weatherTrendRows = await weatherModel.getWeatherTrend(searchRange, siteId);

    // 6. 인버터 목록에 따라 발전량 차트 생성,
    let gPowerTrendRows = _.groupBy(powerTrendRows, 'inverter_seq');
    let powerChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number}`,
        color: colorTable1[index],
        data: _.get(gPowerTrendRows, invRow.inverter_seq.toString(), []).map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_power_kw,
        ]),
      };
    });

    // 7. 기상-일사량 데이터 차트에 삽입
    let weatherCharts = analysisModel.makeChartData(weatherTrendRows, [
      {
        dataKey: 'avg_solar',
        name: '일사량',
        yAxis: 1,
        color: 'red',
        dashStyle: 'ShortDash',
      },
    ]);
    powerChartData = powerChartData.concat(weatherCharts);
    _.set(req.locals, 'chartInfo.dailyPowerData', powerChartData);

    // ----------------- 금일 환경 변화 추이
    // 1. 비교군 모듈 온도, 수온 구함
    let envReportRows = await analysisModel.getEnvReport(searchRange, 'inverter_seq', siteId);
    let gEnvReportRows = _.groupBy(envReportRows, 'inverter_seq');

    // 2. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    let colorIndex = -1;
    let envBrineTempChart = _.map(gEnvReportRows, (envRows, strInvSeq) => {
      const invRow = inverterRows.find(row => row.inverter_seq === Number(strInvSeq));
      colorIndex += 1;
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 수온`,
        color: colorTable1[colorIndex],
        data: envRows.map(row => [commonUtil.convertDateToUTC(row.group_date), row.avg_brine_temp]),
      };
    });

    // 3. 날짜 데이터를 UTC로 변환 (모듈 온도로 분석)
    colorIndex = -1;
    let envModuleTempChart = _.map(gEnvReportRows, (envRows, strInvSeq) => {
      const invRow = inverterRows.find(row => row.inverter_seq === Number(strInvSeq));
      colorIndex += 1;
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 수위`,
        color: colorTable1[colorIndex],
        dashStyle: 'ShortDash',
        yAxis: 1,
        data: envRows.map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_water_level,
        ]),
      };
    });

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherTrendRows, [
      {
        dataKey: 'avg_temp',
        name: '외기 온도',
        color: 'red',
        dashStyle: 'ShortDot',
      },
    ]);

    const dailyEnvChart = envBrineTempChart.concat(...weatherCharts, envModuleTempChart);

    _.set(req.locals, 'chartInfo.dailyEnvChart', dailyEnvChart);

    // ----------------- 기간 발전 효율 트렌드

    // 1. 검색 구간 정의
    searchRange = analysisModel.createSearchRange({
      searchType: 'range',
      searchInterval: 'min10',
      // FIXME: 날짜 변경 시 수정 (기본값 3, 1)
      strStartDate: moment()
        .subtract(3, 'day')
        .format('YYYY-MM-DD'),
      strEndDate: moment()
        .subtract(1, 'day')
        .format('YYYY-MM-DD'),
    });

    // 2. 발전량 레포트 추출
    powerTrendRows = await analysisModel.getInverterTrend(searchRange, inverterSeqList);

    // 4. 기상 데이터 추출
    weatherTrendRows = await weatherModel.getWeatherTrend(searchRange, siteId);
    // 5. 인버터 목록에 따라 발전량 차트 생성,
    gPowerTrendRows = _.groupBy(powerTrendRows, 'inverter_seq');
    powerChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number}`,
        color: colorTable1[index],
        data: gPowerTrendRows[invRow.inverter_seq.toString()].map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_power_kw,
        ]),
      };
    });

    // 6. 기상-일사량 데이터 차트에 삽입
    weatherCharts = analysisModel.makeChartData(weatherTrendRows, [
      {
        dataKey: 'avg_solar',
        name: '일사량',
        yAxis: 1,
        color: 'red',
        dashStyle: 'ShortDash',
      },
    ]);
    powerChartData = powerChartData.concat(weatherCharts);
    _.set(req.locals, 'chartInfo.rangePowerChart', powerChartData);

    // ----------------- 금일 환경 변화 추이
    // 1. 비교군 모듈 온도, 수온 구함
    envReportRows = await analysisModel.getEnvReport(searchRange, 'inverter_seq', siteId);
    gEnvReportRows = _.groupBy(envReportRows, 'inverter_seq');

    // 2. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    colorIndex = -1;
    envBrineTempChart = _.map(gEnvReportRows, (envRows, strInvSeq) => {
      const invRow = inverterRows.find(row => row.inverter_seq === Number(strInvSeq));
      colorIndex += 1;
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 수온`,
        color: colorTable1[colorIndex],
        data: envRows.map(row => [commonUtil.convertDateToUTC(row.group_date), row.avg_brine_temp]),
      };
    });

    // 3. 날짜 데이터를 UTC로 변환 (모듈 온도로 분석)
    colorIndex = -1;
    envModuleTempChart = _.map(gEnvReportRows, (envRows, strInvSeq) => {
      const invRow = inverterRows.find(row => row.inverter_seq === Number(strInvSeq));
      colorIndex += 1;
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 수위`,
        color: colorTable1[colorIndex],
        dashStyle: 'ShortDash',
        yAxis: 1,
        data: envRows.map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_water_level,
        ]),
      };
    });

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherTrendRows, [
      {
        dataKey: 'avg_temp',
        name: '외기 온도',
        color: 'red',
        dashStyle: 'ShortDot',
      },
    ]);

    const rangeEnvChart = envBrineTempChart.concat(...weatherCharts, envModuleTempChart);

    _.set(req.locals, 'chartInfo.rangeEnvChart', rangeEnvChart);
    // console.timeEnd('금일 환경 변화 추이');

    // BU.CLI(req.locals);
    res.render('./UPSAS/analysis/prediction', req.locals);
  }),
);

// 발전 예측 및 손실 저하 분석
router.get(
  ['/:siteId/powerPrediction', '/:siteId/powerPrediction/:subCategoryId'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { mainWhere, siteId, subCategoryId },
      viewPowerProfileRows,
      searchRange,
    } = req.locals;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(viewPowerProfileRows, mainWhere);

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {AnalysisModel} */
    const analysisModel = global.app.get('analysisModel');

    // 인버터 사이트 목록 돔 추가
    const inverterSiteDom = reportDom.makeInverterSiteDom(
      powerProfileRows,
      subCategoryId,
      'cnt_target_name',
    );

    _.set(req, 'locals.dom.subSelectBoxDom', inverterSiteDom);

    // 인버터 Seq 목록
    const inverterSeqList = _(powerProfileRows)
      .filter(_.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null)
      .map('inverter_seq')
      .value();

    /** @type {PW_INVERTER[]} */
    const inverterRows = await analysisModel.getTable('PW_INVERTER', {
      inverter_seq: inverterSeqList,
    });

    const generalAnalysisRows = await analysisModel
      .getGeneralReport(searchRange, siteId)
      .filter(row => inverterSeqList.includes(row.inverter_seq));

    const {
      setWaterLevel,
      regressionB1 = 0.945,
      regressionB2 = 11.2,
      regressionB3 = -0.19,
      regressionK = 0.88,
    } = req.query;

    const regressionInfo = {
      setWaterLevel,
      regressionB1,
      regressionB2,
      regressionB3,
      regressionK,
    };

    _.set(req, 'locals.regressionInfo', regressionInfo);

    // 발전량 예측 정제
    analysisModel.refineGeneralAnalysis(generalAnalysisRows, regressionInfo);

    // 인버터 별로 그루핑
    const gGeneralAnalysisRows = _.groupBy(generalAnalysisRows, 'inverter_seq');

    // 손실저하 요인 분석 Table Rows 생성
    const lossAnalysisRows = analysisModel.makeLossAnalysisReport(
      generalAnalysisRows,
      regressionInfo.regressionK,
    );

    _.set(req.locals, 'lossAnalysisRows', lossAnalysisRows);

    // 실측 발전량 차트 생성
    let powerChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 발전량`,
        color: colorTable2[index],
        data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.t_power_kw,
        ]),
      };
    });

    // 예측 발전량 차트 생성
    const predictPowerChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 예측 발전량`,
        color: colorTable2[index],
        dashStyle: 'ShortDot',
        data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.preWaterPowerKw,
        ]),
      };
    });

    // 5. 기상 데이터 추출
    const weatherTrendRows = await weatherModel.getWeatherTrend(searchRange, siteId);

    // 7. 기상-일사량 데이터 차트에 삽입
    const weatherCharts = analysisModel.makeChartData(weatherTrendRows, [
      {
        dataKey: 'avg_solar',
        name: '일사량',
        yAxis: 1,
        color: 'red',
      },
    ]);

    powerChartData = powerChartData.concat(...predictPowerChartData, weatherCharts);
    _.set(req.locals, 'chartInfo.dailyPowerData', powerChartData);

    // 모듈 온도 차트 생성
    let envChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 모듈 온도`,
        color: colorTable2[index],
        data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_module_rear_temp,
        ]),
      };
    });

    // 예측 모듈 온도 차트 생성
    const predictEnvChartData = inverterRows.map((invRow, index) => {
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 예측 모듈 온도`,
        color: colorTable2[index],
        dashStyle: 'ShortDot',
        data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.preWaterModuleTemp,
        ]),
      };
    });

    envChartData = envChartData.concat(...predictEnvChartData);
    _.set(req.locals, 'chartInfo.dailyEnvChart', envChartData);

    // 발전 분석 레포트
    const analysisReport = analysisModel.makeAnalysisReport({
      generalAnalysisRows,
      weatherTrendRows,
    });

    _.set(req.locals, 'analysisReport', analysisReport);

    // TODO: 인버터 출력 이상
    // 일사량 500, 수위 1cm 이상, 발전량 오차율 10% 이상 --> 출력 이상

    // TODO: 직렬 모듈 간 출력 이상
    // 시간 11:00 ~ 14:00 이전, 일사량 700 이상, 출력비 90% 이하 --> 출력 이상

    // FIXME: '인버터 결함' 메뉴 신설 및 일사량 100 이상, 인버터 Fault --> 발전 이상

    // TODO: 이상상태 요인 종합 분석
    // 출력 이상 별 이상 요인 분석

    res.render('./UPSAS/analysis/powerPrediction', req.locals);
  }),
);

module.exports = router;
