const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');

const commonUtil = require('../../models/templates/common.util');
const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

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
    btnName: '예측분석',
  },
];

// trend middleware
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    // req.param 값 비구조화 할당
    const { siteId } = req.locals.mainInfo;
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    next();
  }),
);

router.get(
  ['/', '/:siteId', '/:siteId/efficiency'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
      viewPowerProfileRows,
      subCategory,
      searchRange,
    } = req.locals;

    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {AnalysisModel} */
    const analysisModel = global.app.get('analysisModel');
    // console.time('금일 발전 효율 트렌드');
    // ----------------- 금일 발전 효율 트렌드
    // 1. 금일 검색 구간 정의
    let dailySearchRange = analysisModel.createSearchRange({
      // FIXME: 1일전 테스트
      // strStartDate: moment()
      //   .subtract(1, 'day')
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
      dataKey: 'avg_power_eff',
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
        dashStyle: 'ShortDot',
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
    let envReportRows = await analysisModel.getEnvReport(dailySearchRange);

    // 2. 날짜 데이터를 UTC로 변환 (모듈 온도로 분석)
    let envModuleTempChart = _(envReportRows)
      .groupBy('install_place')
      .map((envRows, installPlace) => {
        return {
          name: `${installPlace} 모듈 온도`,
          data: envRows.map(row => {
            return [commonUtil.convertDateToUTC(row.group_date), row.avg_module_rear_temp];
          }),
          dashStyle: 'ShortDash',
        };
      })
      .value();

    // 3. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    let envBrineTempChart = {
      name: '수중 0도 수온',
      data: _(envReportRows)
        .filter(envRow => envRow.target_category === mType.WATER_0)
        .map(envRow => [commonUtil.convertDateToUTC(envRow.group_date), envRow.avg_brine_temp])
        .value(),
      dashStyle: 'ShortDot',
    };

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_temp',
        name: '외기온도',
        dashStyle: 'ShortDashDot',
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
      dataKey: 't_interval_power_eff',
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
    console.time('getPowerEffReport');
    dailyPowerEffRows = await analysisModel.getPowerEffReport(dailySearchRange);
    console.timeEnd('getPowerEffReport');
    // 4. 발전 효율이 시작 및 종료 시간 구함
    const { sDate: sMaxDate, eDate: eMaxDate } = analysisModel.getStartEndDate(dailyPowerEffRows);
    dailySearchRange.strStartDate = sMaxDate;
    dailySearchRange.strEndDate = eMaxDate;

    // 5. 발전 효율을 카테고리 별로 분류하고 chartData에 맞게 데이터 변환
    moduleEfficiencyChart = analysisModel.makePowerEfficiencyChart(dailyPowerEffRows, {
      dataKey: 'avg_power_eff',
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
        yAxis: 1,
        dashStyle: 'ShortDot',
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
          name: `${installPlace} 모듈 온도`,
          data: envRows.map(row => {
            return [commonUtil.convertDateToUTC(row.group_date), row.avg_module_rear_temp];
          }),
          dashStyle: 'ShortDash',
        };
      })
      .value();

    // 3. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    envBrineTempChart = {
      name: '수중 0도 수온',
      data: _(envReportRows)
        .filter(envRow => envRow.target_category === mType.WATER_0)
        .map(envRow => [commonUtil.convertDateToUTC(envRow.group_date), envRow.avg_brine_temp])
        .value(),
      dashStyle: 'ShortDot',
    };

    // 4. 금일 환경 변화 추이 데이터 전송
    weatherCharts = analysisModel.makeChartData(weatherDeviceRows, [
      {
        dataKey: 'avg_temp',
        name: '외기온도',
        dashStyle: 'ShortDashDot',
      },
    ]);

    dailyEnvChart = envModuleTempChart.concat(envBrineTempChart, ...weatherCharts);

    _.set(req.locals, 'chartInfo.dailyMaxEnvChart', dailyEnvChart);
    // console.timeEnd('최대 환경 변화 추이');
    // BU.CLIN(dailyPowerEffRows);
    // TODO: 4. 해당 일의 발전 효율이 최대치일때의 순간 데이터를 구함
    let maxPeakEfficiencyInfo = _.maxBy(dailyPowerEffRows, row => {
      return row.target_category === mType.WATER_0 && row.avg_power_eff;
    });
    // BU.CLIN(maxPeakEfficiencyInfo);

    // 2. 해당 날의 Search Range 생성
    dailySearchRange.searchType = 'range';
    dailySearchRange.searchInterval = 'min';
    dailySearchRange.strStartDate = moment(maxPeakEfficiencyInfo.group_date).format(
      'YYYY-MM-DD HH:mm',
    );
    dailySearchRange.strEndDate = moment(maxPeakEfficiencyInfo.group_date)
      .add(10, 'minute')
      .format('YYYY-MM-DD HH:mm');
    // const maxPeakSearchRange = analysisModel.createSearchRange({
    //   searchType: 'range',
    //   searchInterval: 'min',
    //   strStartDate: moment(maxPeakEfficiencyInfo.group_date),
    //   strEndDate: moment(maxPeakEfficiencyInfo.group_date).add(10, 'minute'),
    // });

    // BU.CLIN(maxPeakSearchRange);

    // BU.CLI(dailySearchRange);

    dailyPowerEffRows = await analysisModel.getPowerEffReport(dailySearchRange, 'inverter_seq');

    envReportRows = await analysisModel.getEnvReport(dailySearchRange, 'inverter_seq');

    // 6. 기상 계측 정보 구함
    weatherDeviceRows = await weatherModel.getWeatherTrend(dailySearchRange, siteId);

    // 모듈 중에서도 가장 높은 순간을 찾음
    maxPeakEfficiencyInfo = _.maxBy(dailyPowerEffRows, row => {
      return row.target_category === mType.WATER_0 && row.avg_power_eff;
    });

    // 발전 효율 최대 순간
    const maxPeakPowerRows = dailyPowerEffRows.filter(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );

    const maxPeakWeatherRow = weatherDeviceRows.find(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );

    const maxPeakEnvRows = envReportRows.filter(
      row => row.group_date === maxPeakEfficiencyInfo.group_date,
    );

    // BU.CLIS(maxPeakPowerRows, maxPeakEnvRows, maxPeakWeatherRow);

    //  _.chain(dailyPowerEffRows)
    //   .maxBy(row => row.target_category === mType.WATER_0 && row.avg_power_eff)
    //   .thru(maxPeakRow => {
    //     return dailyPowerEffRows.map(row => row.group_date === maxPeakRow.group_date);
    //   }).value();

    // ----------------- 발전 효율 최대순간 분석

    // BU.CLI(req.locals);
    res.render('./UPSAS/analysis/efficiency', req.locals);
  }),
);

router.get(
  ['/', '/:siteId', '/:siteId/:prediction'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
      viewPowerProfileRows,
    } = req.locals;

    // BU.CLI(req.locals);
    res.render('./UPSAS/analysis/prediction', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./UPSAS/main/index', req.locals);
  }),
);

module.exports = router;
