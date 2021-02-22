const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');

const commonUtil = require('../../models/templates/common.util');
const webUtil = require('../../models/templates/web.util');

const reportDom = require('../../models/domMaker/reportDom');
const salternDom = require('../../models/domMaker/salternDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

const SolarPowerCalc = require('../../models/templates/SolarPowerCalc');

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';
// const DEFAULT_CATEGORY = 'inverter';

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
    const { siteId } = req.locals.mainInfo;
    const { subCategory = subCategoryList[0].subCategory } = req.params;

    // console.time('Trend Middleware');
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    // req.query 값 비구조화 할당
    const {
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      searchOption = DEFAULT_SEARCH_OPTION,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // BU.CLI(req.query);

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });
    // const searchRange = biModule.createSearchRange({
    //   searchType: 'range',
    //   searchInterval: 'day',
    //   strStartDate: '2020-04-01',
    //   strEndDate: '2020-05-30',
    //   // strEndDate: '2020-12-31',
    // });

    // BU.CLI(searchRange);

    // BU.CLI(subCategoryList);
    // 레포트 페이지에서 기본적으로 사용하게 될 정보
    const trendInfo = {
      siteId,
      subCategory,
      subCategoryName: _.chain(subCategoryList)
        .find({ subCategory })
        .get('btnName', '')
        .value(),
      strStartDateInputValue: searchRange.strStartDateInputValue,
      strEndDateInputValue: searchRange.strEndDateInputValue,
      searchType,
      searchInterval,
    };

    _.set(req, 'locals.trendInfo', trendInfo);
    _.set(req, 'locals.searchRange', searchRange);
    // console.timeEnd('Trend Middleware');
    next();
  }),
);

// 효율 분석
router.get(
  ['/', '/:siteId', '/:siteId/efficiency'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { mainWhere, siteId, subCategoryId },
      viewPowerProfileRows,
      searchRange,
    } = req.locals;

    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    /** @type {AnalysisModel} */
    const analysisModel = global.app.get('analysisModel');

    /** @type {MAIN} */
    const mainRow = await weatherModel.getTableRow('main', mainWhere);

    // TODO: 인버터 데이터 추출
    const inverterPowerRows = await analysisModel.getInverterPower(searchRange, [1]);
    // BU.CLI(inverterPowerRows);

    // 기상청 날씨 추출(sky를 cloud로 환산처리 적용)
    const refineWeatherCastRows = await weatherModel.getRefineWeatherCast(searchRange, [
      mainRow.weather_location_seq,
    ]);

    // const weatherDeviceRows = await weatherModel.getWeatherTrend(searchRange, siteId);

    const solarPowerCalc = new SolarPowerCalc();

    // BU.CLI(refineWeatherCastRows);
    // 일사량 예측
    const moduleCount = 1;
    const solarArrayCapacity = 33.3;
    const calcCapacity = 15;
    refineWeatherCastRows.forEach((wcRow, index) => {
      // inverterPowerRows[index].predict = 'predict';
      // inverterPowerRows[index].interval_power
      // wcRow.realDailyPowerKwh = _.get(inverterPowerRows[index], 'interval_power', '');
      wcRow.realDailyPowerKwh =
        (_.get(inverterPowerRows[index], 'interval_power', '') / calcCapacity) * 0.3;
      // wcRow.predict = 'predict';
      wcRow.module_efficiency = 18.9;
      wcRow.module_square = 1.63 * moduleCount;

      const { ds, pds, horizontalSolar, inclinedSoalr } = solarPowerCalc.getPredictSolar(
        wcRow,
      );

      wcRow.ds = ds;
      wcRow.pds = pds;
      wcRow.horizontalSolar = horizontalSolar;
      wcRow.inclinedSoalr = inclinedSoalr;

      // 일사량 * 0.85 * 용량
      wcRow.predictDailyPower = solarPowerCalc.calcSolarPower(inclinedSoalr, 0.3);
      // 발전량 예측
      // wcRow.predictDailyPower2 = solarPowerCalc.getPredictPower(wcRow);
      solarPowerCalc.getPredictPower(wcRow);
    });

    /** @type {lineChartConfig[]} */
    const chartOptions = [
      {
        domId: 'test1',
        chartOption: {
          dateKey: 'group_date',
          selectKey: 'realDailyPowerKwh',
        },
        toFixed: 2,
        yAxisList: [
          {
            yTitle: '발전량',
            dataUnit: 'kWh',
          },
        ],
        title: '실측 발전량',
      },
      {
        domId: 'test',
        chartOption: {
          // groupKey: 'predict',
          dateKey: 'group_date',
          selectKey: 'predictDailyPower',
        },
        toFixed: 2,
        yAxisList: [
          {
            yTitle: '발전량',
            dataUnit: 'kWh',
          },
        ],
        title: '예측 발전량',
      },

      {
        domId: 'test3',
        chartOption: {
          dateKey: 'group_date',
          selectKey: 'preEarthPowerKw',
        },
        toFixed: 2,
        yAxisList: [
          {
            yTitle: '발전량',
            dataUnit: 'kWh',
          },
        ],
        title: '예측 발전량 2',
      },
      // {
      //   domId: 'test3',
      //   chartOption: {
      //     dateKey: 'group_date',
      //     selectKey: 'ds',
      //   },
      //   toFixed: 2,
      //   yAxisList: [
      //     {
      //       yTitle: '발전량',
      //       dataUnit: 'kWh',
      //     },
      //   ],
      //   title: 'ds',
      // },
      // {
      //   domId: 'test3',
      //   chartOption: {
      //     dateKey: 'group_date',
      //     selectKey: 'pds',
      //   },
      //   toFixed: 2,
      //   yAxisList: [
      //     {
      //       yTitle: '발전량',
      //       dataUnit: 'kWh',
      //     },
      //   ],
      //   title: 'ps',
      // },
      {
        domId: 'test2',
        chartOption: {
          dateKey: 'group_date',
          selectKey: 'horizontalSolar',
          colorKey: 'red',
        },
        toFixed: 2,
        yAxisList: [
          {
            yTitle: '실측 일사량',
            dataUnit: 'Wh/㎡',
          },
        ],
        title: '예측 일사량',
      },
    ];

    const chartList = chartOptions.map(opt =>
      webUtil.makeDynamicLineChart(opt, refineWeatherCastRows.concat(inverterPowerRows)),
    );

    // FIXME: 개좃같은 하아... 모르겟다 머하는 짓인지
    chartList[0].series[0].yAxis = 0;
    const realChart = chartList[0];

    realChart.series.push(chartList[1].series[0]);
    realChart.series.push(chartList[2].series[0]);

    chartList[3].series[0].yAxis = 1;
    realChart.series.push(chartList[3].series[0]);

    // chartList[4].series[0].yAxis = 1;
    // realChart.series.push(chartList[4].series[0]);

    // chartList[4].series[0].yAxis = 1;
    // realChart.series.push(chartList[5].series[0]);

    // realChart.yAxis.push({
    //   yTitle: '일사량',
    //   dataUnit: 'Wh',
    // });

    const realCharts = [chartList[0]];

    const domTemplate = _.template(`
      <div class="lineChart_box default_area" id="<%= domId %>"></div>
  `);

    // 모든 센서 정보가 없다면 표시 하지 않음
    realCharts.forEach(chartInfo => {
      const { series = [] } = chartInfo;
      series.every(seriesInfo => _.get(seriesInfo, 'data', []).length === 0) &&
        (chartInfo.series = []);
    });

    const chartDomList = realCharts
      .map(refinedChart =>
        domTemplate({
          domId: refinedChart.domId,
        }),
      )
      .join('');

    _.set(req, 'locals.dom.chartDomList', chartDomList);

    _.set(req, 'locals.chartList', realCharts);

    // BU.CLIN(req.locals);

    res.render('./trend/trend', req.locals);

    // TODO: 기온, 일사량 추출
    // 효율 18.9%, 면적 1.613㎡, 개수 1EA로 하여 발전량 예측
    // res.send('hi');
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
    let powerTrendRows = await analysisModel.getInverterTrend(
      searchRange,
      inverterSeqList,
    );

    // 4. 발전 시작 및 종료 시간 구함
    const { sDate, eDate } = analysisModel.getStartEndDate(powerTrendRows);
    searchRange.strStartDate = sDate;
    searchRange.strEndDate = eDate;

    // 5. 기상 데이터 추출
    let weatherTrendRows = await weatherModel.getWeatherTrend(searchRange, siteId);

    // 6. 인버터 목록에 따라 발전량 차트 생성,
    let gPowerTrendRows = _.groupBy(powerTrendRows, 'inverter_seq');
    let powerChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number}`,
      color: colorTable1[index],
      data: _.get(gPowerTrendRows, invRow.inverter_seq.toString(), []).map(row => [
        commonUtil.convertDateToUTC(row.group_date),
        row.avg_power_kw,
      ]),
    }));

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
    let envReportRows = await analysisModel.getEnvReport(
      searchRange,
      'inverter_seq',
      siteId,
    );
    let gEnvReportRows = _.groupBy(envReportRows, 'inverter_seq');

    // 2. 날짜 데이터를 UTC로 변환 (수온으로 분석)
    let colorIndex = -1;
    let envBrineTempChart = _.map(gEnvReportRows, (envRows, strInvSeq) => {
      const invRow = inverterRows.find(row => row.inverter_seq === Number(strInvSeq));
      colorIndex += 1;
      return {
        name: `${invRow.install_place} ${invRow.serial_number} 수온`,
        color: colorTable1[colorIndex],
        data: envRows.map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_brine_temp,
        ]),
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
      strStartDate: moment().subtract(3, 'day').format('YYYY-MM-DD'),
      strEndDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
    });

    // 2. 발전량 레포트 추출
    powerTrendRows = await analysisModel.getInverterTrend(searchRange, inverterSeqList);

    // 4. 기상 데이터 추출
    weatherTrendRows = await weatherModel.getWeatherTrend(searchRange, siteId);
    // 5. 인버터 목록에 따라 발전량 차트 생성,
    gPowerTrendRows = _.groupBy(powerTrendRows, 'inverter_seq');
    powerChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number}`,
      color: colorTable1[index],
      data: gPowerTrendRows[invRow.inverter_seq.toString()].map(row => [
        commonUtil.convertDateToUTC(row.group_date),
        row.avg_power_kw,
      ]),
    }));

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
        data: envRows.map(row => [
          commonUtil.convertDateToUTC(row.group_date),
          row.avg_brine_temp,
        ]),
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

    // const siteId = 2;

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
    const inverterSeqList = [1];
    // _(powerProfileRows)
    //   .filter(_.isNumber(subCategoryId) ? { inverter_seq: subCategoryId } : null)
    //   .map('inverter_seq')
    //   .value();

    /** @type {PW_INVERTER[]} */
    const inverterRows = await analysisModel.getTable('PW_INVERTER', {
      inverter_seq: inverterSeqList,
    });

    const generalAnalysisRows = await analysisModel
      .getGeneralReport(searchRange, siteId)
      .filter(row => inverterSeqList.includes(row.inverter_seq));

    // FIXME: 육상
    const {
      setWaterLevel,
      regressionB1 = 1,
      regressionB2 = 34,
      regressionB3 = 0,
      regressionK = 1,
    } = req.query;

    // FIXME: 수중
    // const {
    //   setWaterLevel,
    //   regressionB1 = 0.945,
    //   regressionB2 = 11.2,
    //   regressionB3 = -0.19,
    //   regressionK = 0.88,
    // } = req.query;

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
    let powerChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number} 발전량`,
      color: colorTable2[index],
      data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
        commonUtil.convertDateToUTC(row.group_date),
        row.t_power_kw,
      ]),
    }));

    // 예측 발전량 차트 생성
    const predictPowerChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number} 예측 발전량`,
      color: colorTable2[index],
      dashStyle: 'ShortDot',
      data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
        // typeof row.group_date === 'string' && row.group_date.length
        //   ? Date.parse(row.group_date.toISOString())
        //   : '',
        commonUtil.convertDateToUTC(row.group_date),
        row.preEarthPowerKw,
      ]),
    }));

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
    let envChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number} 모듈 온도`,
      color: colorTable2[index],
      data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
        commonUtil.convertDateToUTC(row.group_date),
        row.avg_module_rear_temp,
      ]),
    }));

    // 예측 모듈 온도 차트 생성
    const predictEnvChartData = inverterRows.map((invRow, index) => ({
      name: `${invRow.install_place} ${invRow.serial_number} 예측 모듈 온도`,
      color: colorTable2[index],
      dashStyle: 'ShortDot',
      data: _.get(gGeneralAnalysisRows, invRow.inverter_seq.toString(), []).map(row => [
        commonUtil.convertDateToUTC(row.group_date),
        row.preWaterModuleTemp,
      ]),
    }));

    envChartData = envChartData.concat(...predictEnvChartData);
    _.set(req.locals, 'chartInfo.dailyEnvChart', envChartData);

    // 발전 분석 레포트
    const analysisReport = analysisModel.makeAnalysisReport({
      generalAnalysisRows,
      weatherTrendRows,
    });

    _.set(req.locals, 'analysisReport', analysisReport);

    // 이상 상태 요인 분석 조건
    const condi = {
      UP: 1,
      DOWN: 0,
    };

    const condiImpRank = {
      NONE: -1,
      TOTAL: 0,
      ABNORMAL: 1,
    };

    const abnormalCondition = {
      // 일사량 500, 수위 1cm 이상, 발전량 오차율 10% 이상 --> 출력 이상
      inverter: [
        {
          key: 'avg_horizontal_solar',
          name: '일사량',
          threshold: 500,
          condition: condi.UP,
          impRank: condiImpRank.TOTAL,
        },
        {
          key: 'avg_water_level',
          name: '수위',
          threshold: 1,
          condition: condi.UP,
          impRank: condiImpRank.TOTAL,
        },
        {
          key: 'waterPowerlossRate',
          name: '수중태양광 오차율',
          threshold: 10,
          condition: condi.UP,
          impRank: condiImpRank.ABNORMAL,
        },
      ],
    };

    // const abnormalOption = {
    //   NORMAL: {
    //     abnormalCode: 0,
    //     abnormalTxt: '정상',
    //     abnormalClass: 'color_white',
    //   },
    //   CAUTION: {
    //     abnormalCode: 1,
    //     abnormalTxt: '주의',
    //     abnormalClass: 'color_yellow',
    //   },
    //   WARNING: {
    //     abnormalCode: 2,
    //     abnormalTxt: '정상',
    //     abnormalClass: 'color_red',
    //   },
    // };

    /** *********** 인버터 출력 이상 ************ */
    // 일사량 500, 수위 1cm 이상, 발전량 오차율 10% 이상 --> 출력 이상
    const { inverter: invAbnormals } = abnormalCondition;

    // 이상 조건에 맞는 function 생성
    const isSampleCondition = (abnormals, rowData, condiRank = condiImpRank.NONE) => {
      const result = _.filter(abnormals, { impRank: condiRank }).every(abnormalInfo => {
        const { condition, key, threshold } = abnormalInfo;

        return condition === condi.UP
          ? rowData[key] >= threshold
          : rowData[key] <= threshold;
      });

      return result;
    };

    const abnormalStatus = {
      NORMAL: 0,
      CAUTION: 1,
      WARNING: 2,
    };

    // 1. 그루핑 인버터 별로 순회
    const resultInvAbnormalList = _.map(gGeneralAnalysisRows, (rows, inverterSeq) => {
      // 인버터 항목 별로 데이터 유효성 검증 카운팅 (totalSample, abnormalSample)
      const resultSample = rows.reduce(
        (resultSampleInfo, row) => {
          resultSampleInfo.totalDataCnt += 1;

          // 표본 검출 식에 부합되는 표본 추출
          const isTotalSample = isSampleCondition(invAbnormals, row, condiImpRank.TOTAL);

          if (isTotalSample) {
            // 검색 표본 수 1 증가
            resultSampleInfo.totalSampleCnt += 1;
            resultSampleInfo.lossRates.push(row.waterPowerlossRate);
            // 조건에 부합하고 오차 조건에 부합할 경우
            if (isSampleCondition(invAbnormals, row, condiImpRank.ABNORMAL)) {
              resultSampleInfo.abnormalSampleCnt += 1;
            }
          }
          return resultSampleInfo;
        },
        { lossRates: [], totalDataCnt: 0, totalSampleCnt: 0, abnormalSampleCnt: 0 },
      );
      // 조건에 부합하는 표본 중 이상이 발생한 표본의 백분율을 구함
      const { abnormalSampleCnt, totalSampleCnt } = resultSample;

      // 이상 분표율
      const abnormalRate = _.round((abnormalSampleCnt / totalSampleCnt) * 100, 1);

      // 손실률
      const lossRate = _.round(_.mean(resultSample.lossRates), 1);

      /** @type {V_PW_PROFILE} */
      const powerProfile = _.find(viewPowerProfileRows, {
        inverter_seq: Number(inverterSeq),
      });

      let abnormalCode = abnormalStatus.NORMAL;

      // 3. 손실률 10% 이상일 경우 '주의', 20 % 이상일 경우 '경고'
      if (lossRate >= 20) {
        abnormalCode = abnormalStatus.WARNING;
      } else if (lossRate >= 10) {
        abnormalCode = abnormalStatus.CAUTION;
      }

      return Object.assign(resultSample, {
        abnormalRate,
        abnormalCode,
        lossRate,
        targetName: powerProfile.inverterName,
      });
    });
    // 이상 상태가 아닌 것은 제외

    _.set(req, 'locals.abnormalInfo.resultInvAbnormalList', resultInvAbnormalList);

    // FIXME: 직렬 모듈 간 출력 이상 (확장 고려하지 않음)
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    // 접속반 동적 Data Block Rows 결과 요청
    const { dataRows } = await refineModel.getDynamicBlockRows(
      searchRange,
      'connector',
      siteId,
      // 11:00 < 시간 < 14:00
      'DATE_FORMAT(writedate,"%H") > 10 AND DATE_FORMAT(writedate,"%H") < 14',
    );

    // powerList >>> 7월 3일 접속반 수리 후 직렬 모듈 출력 (보정계수 CF: 최종 출력에 곱함)
    // correctionFactors >> 접속반 수리 전 CF 값
    const smPowerCorrectionFactors = [
      {
        connect_seq: 1,
        powerList: [3.14905, 3.20618, 3.32102, 3.60305, 3.44786, 3.52664],
        correctionFactors: [1, 1.091205008, 1.002042691, 1, 1.137727653, 1.14592685],
      },
      {
        connect_seq: 2,
        powerList: [3.0779, 3.10621, 3.21509, 3.67203, 3.17296, 3.23082],
        correctionFactors: [1.006446436, 1.050119695, 1, 1, 1.200593341, 1.195742863],
      },
      {
        connect_seq: 3,
        powerList: [3.08601, 3.0566, 3.4065, 1, 1, 1],
        correctionFactors: [1.134012605, 1.10022687, 1, 1, 1.045678874, 1.288405729],
      },
      {
        connect_seq: 4,
        powerList: [3.33578, 3.19695, 3.38519, 3.43784, 3.26321, 3.07895],
        correctionFactors: [1, 1.093602146, 1.009609306, 1, 1.124762257, 1.138987325],
      },
    ];

    // 시작일이 접속반 수리 이후라면 보정계수 재계산

    const mStartDate = moment(BU.convertTextToDate(searchRange.strStartDate));
    if (mStartDate.format('YYYY-MM') > '2020-06') {
      // 직렬 모듈 간 출력 보정 계수를 구함
      smPowerCorrectionFactors.forEach(smPowerCorrectionFactorInfo => {
        const { powerList } = smPowerCorrectionFactorInfo;
        // 수중 증발지는 1개당 3채널이므로 3개씩 끊어서 부여
        const firstMaxPower = _.max(powerList.slice(0, 3));
        const secondMaxPower = _.max(powerList.slice(3));

        smPowerCorrectionFactorInfo.correctionFactors = powerList.map((power, index) => {
          const maxPower = index < 3 ? firstMaxPower : secondMaxPower;
          return maxPower / power;
        });
      });
    }

    // const resultSmAbnormalList = _.chain(dataRows)
    //   // 일사량 700 이상이 아닌 값 제거
    //   .reject(row =>
    //     _.chain(generalAnalysisRows)
    //       .find({ group_date: row.group_date })
    //       .get('avg_horizontal_solar', 0)
    //       .thru(solar => solar < 700)
    //       .value(),
    //   )
    //   // 접속반 별로 그루핑
    //   .groupBy('connector_seq')
    //   // 전류, 전압, 전력 평균 치 계산
    //   .map((rows, connectSeq) => {
    //     const power1Ch = _(rows).map('p_ch_1').mean();
    //     const power2Ch = _(rows).map('p_ch_2').mean();
    //     const power3Ch = _(rows).map('p_ch_3').mean();
    //     const power4Ch = _(rows).map('p_ch_4').mean();
    //     const power5Ch = _(rows).map('p_ch_5').mean();
    //     const power6Ch = _(rows).map('p_ch_6').mean();

    //     // 접속반 출력 보정계수 가져옴
    //     const { correctionFactors } = _.find(smPowerCorrectionFactors, {
    //       connect_seq: Number(connectSeq),
    //     });

    //     const powerList = [power1Ch, power2Ch, power3Ch, power4Ch, power5Ch, power6Ch];
    //     // 탄력적 직렬 모듈 출력 보정
    //     const correctionPowerList = powerList.map((p, idx) => p * correctionFactors[idx]);

    //     const firstSectionMaxPower = _.max(correctionPowerList.slice(0, 3));
    //     const secondSectionMaxPower = _.max(correctionPowerList.slice(3));
    //     // 직렬 모듈 이상 분석
    //     const smPowerList = correctionPowerList.map((power, index) => {
    //       const maxPower = index < 3 ? firstSectionMaxPower : secondSectionMaxPower;
    //       const powerRate = (power / maxPower) * 100;

    //       const powerCh = index + 1;
    //       let abnormalCode = abnormalStatus.NORMAL;
    //       let abnormalTxt = '정상';
    //       let abnormalStatusCss = 'color_white';

    //       if (powerRate < 80) {
    //         abnormalCode = abnormalStatus.WARNING;
    //         abnormalTxt = '이상';
    //         abnormalStatusCss = 'color_red';
    //       } else if (powerRate < 90) {
    //         abnormalCode = abnormalStatus.CAUTION;
    //         abnormalTxt = '주의';
    //         abnormalStatusCss = 'color_yellow';
    //       }

    //       return {
    //         powerCh,
    //         power: _.round(power, 2),
    //         powerRate: _.round(powerRate, 1),
    //         abnormalCode,
    //         abnormalTxt,
    //         abnormalStatusCss,
    //       };
    //     });

    //     const systemName = powerProfileRows.find(row => row.connector_seq === Number(connectSeq))
    //       .cnt_target_name;

    //     return {
    //       systemName,
    //       smPowerList,
    //     };
    //   })
    //   // 추출 데이터 순회하면서 SEB_RELATION에서 정의한 CH 별로 전류 상대 비율 계산 (p_ratio_ch_1)
    //   .value();

    // _.set(req, 'locals.abnormalInfo.resultSmAbnormalList', resultSmAbnormalList);

    // FIXME: '인버터 결함' 메뉴 신설 및 일사량 100 이상, 인버터 Fault --> 발전 이상

    // TODO: 이상상태 요인 종합 분석
    // 출력 이상 별 이상 요인 분석

    res.render('./UPSAS/analysis/powerPrediction', req.locals);
  }),
);

module.exports = router;
