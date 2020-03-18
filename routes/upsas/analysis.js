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

    const effSearchRange = analysisModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    // 금일 발전 효율 트렌드
    // 1. 발전 효율 구함
    const effReportRows = await analysisModel.getEffReport(effSearchRange);

    // 2. 발전 효율이 시작하는 시간 구함
    const startEffDate = _(effReportRows)
      .sortBy('group_date')
      .head().group_date;

    // 3. 100kW 일사량 트렌드 구하고 일사 데이터를 발전 효율이 시작하는 시간부터 자름

    const weatherDeviceRows = await weatherModel
      .getWeatherTrend(effSearchRange, siteId)
      .filter(wddRow => wddRow.group_date >= startEffDate);

    // 4. 발전 효율을 카테고리 별로 분류하고 chartData에 맞게 데이터 변환 후 반환
    const moduleEfficiencyChart = _(effReportRows)
      .groupBy('install_place')
      .map((moduleEffRows, installPlace) => {
        return {
          name: installPlace,
          data: moduleEffRows.map(effRow => {
            return [commonUtil.convertDateToUTC(effRow.group_date), effRow.module_eff];
          }),
        };
      })
      .value();

    // 5. 금일 발전 효율 차트(발전량, 일사량) 병합
    const dailyPowerChart = moduleEfficiencyChart.concat({
      name: '일사량',
      yAxis: 1,
      // 날짜 데이터를 UTC로 변환하고 chartData에 맞게 반환
      data: weatherDeviceRows.map(wddRow => [
        commonUtil.convertDateToUTC(wddRow.group_date),
        wddRow.avg_solar,
      ]),
      dashStyle: 'shortdot',
    });

    _.set(req.locals, 'chartInfo.dailyPowerChart', dailyPowerChart);

    // 금일 환경 변화 추이
    // TODO: 1. 100kW 온도 트렌드 구함

    // TODO: 2. 비교군 모듈 온도, 수온 구함
    // TODO: 3. 발전 효율이 시작하는 구간부터 자름
    const envReportRows = await analysisModel
      .getEnvReport(effSearchRange)
      .filter(row => row.group_date >= startEffDate);

    // TODO: 4. 날짜 데이터를 UTC로 변환
    // 모듈 온도로 분석
    const envModuleTempChart = _(envReportRows)
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

    // 수온으로 분석
    const envBrineTempChart = {
      name: '수중 0도 모듈 온도',
      data: _(envReportRows)
        .filter(envRow => envRow.target_category === '100kw')
        .map(envRow => [commonUtil.convertDateToUTC(envRow.group_date), envRow.avg_brine_temp])
        .value(),
      dashStyle: 'shortdot',
    };

    // TODO: 5. 금일 환경 변화 추이 데이터 전송
    const dailyEnvChart = envModuleTempChart.concat(envBrineTempChart, {
      name: '외기온도',
      // yAxis: 1,
      // 날짜 데이터를 UTC로 변환하고 chartData에 맞게 반환
      data: weatherDeviceRows.map(wddRow => [
        commonUtil.convertDateToUTC(wddRow.group_date),
        wddRow.avg_temp,
      ]),
      dashStyle: 'ShortDashDot',
    });

    _.set(req.locals, 'chartInfo.dailyEnvChart', dailyEnvChart);

    // 지난 3일 효율 분석
    // TODO: 1. 지난 3일동안의 발전 효율을 구함 (1일 합산)

    // TODO: 2. 발전 효율이 가장 높게 나온 날의 발전 효율 트렌드 구함

    // TODO: 3. 발전 효율이 가장 높게 나온 날의 환경 변화 추이 트렌드 구함

    // TODO: 4. 해당 일의 발전 효율이 최대치일때의 순간 데이터를 구함

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
