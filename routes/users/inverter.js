const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    _.set(req, 'locals.menuNum', 1);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // 지점 Id를 불러옴
    const { siteId } = req.locals;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const pwProfileWhereInfo = _.eq(siteId, 'all') ? null : { main_seq: siteId };

    // Power 현황 테이블에서 선택한 Site에 속해있는 인버터 목록을 가져옴
    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile', pwProfileWhereInfo, false);
    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');
    // const placeSeqList = _.map(viewPowerProfileRows, 'place_seq');

    // 인버터별 경사 일사량을 가져옴
    const INCLINED_SOLAR = 'inclinedSolar';
    const placeDataList = await biDevice.extendsPlaceDeviceData(
      viewPowerProfileRows,
      INCLINED_SOLAR,
    );

    /** @type {V_INVERTER_STATUS[]} */
    const viewInverterStatusRows = await biModule.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = [];

    // 인버터 현황 데이터 목록에 경사 일사량 데이터를 붙임.
    viewInverterStatusRows.forEach(inverterStatus => {
      const foundPlaceData = _.find(placeDataList, { place_seq: inverterStatus.place_seq });
      // BU.CLI(foundPlaceData);
      const foundProfile = _.find(viewPowerProfileRows, {
        inverter_seq: inverterStatus.inverter_seq,
      });
      const mainName = _.get(foundProfile, 'm_name', '');
      // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
      const {
        ivt_target_name: subName,
        ivt_director_name: company = '',
        ivt_amount: amount,
      } = foundProfile;
      const siteName = `${mainName} ${subName || ''} ${_.round(amount)} kW급 ${
        _.isString(company) && company.length ? company : ''
      }`;

      inverterSiteNameList.push({
        inverter_seq: inverterStatus.inverter_seq,
        siteName,
      });

      _.assign(inverterStatus, {
        [INCLINED_SOLAR]: _.get(foundPlaceData, INCLINED_SOLAR, null),
        siteName,
      });
    });

    BU.CLI(viewInverterStatusRows);

    // 데이터 검증
    const validInverterStatusList = webUtil.checkDataValidation(
      viewInverterStatusRows,
      new Date(),
      'writedate',
    );

    /** 인버터 메뉴에서 사용 할 데이터 선언 및 부분 정의 */
    const refinedInverterStatusList = webUtil.refineSelectedInverterStatus(validInverterStatusList);

    // const searchRange = biModule.getSearchRange('min10');
    const searchRange = biModule.getSearchRange('min10', '2018-11-01');
    const inverterPowerList = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLI(inverterPowerList);
    const chartOption = {
      selectKey: 'avg_grid_kw',
      dateKey: 'view_date',
      groupKey: 'inverter_seq',
      colorKey: 'chart_color',
      sortKey: 'chart_sort_rank',
    };

    const chartData = webUtil.makeDynamicChartData(inverterPowerList, chartOption);

    chartData.series.forEach(chartInfo => {
      chartInfo.name = _.get(
        _.find(inverterSiteNameList, { inverter_seq: Number(chartInfo.name) }),
        'siteName',
        '',
      );
    });

    // BU.CLI(chartData);
    // webUtil.mappingChartDataName(chartData, viewPowerProfileRows, 'target_id', 'target_name');

    req.locals.inverterStatusList = refinedInverterStatusList;
    req.locals.outputByTimeChart = chartData;
    req.locals.powerInfo = {
      measureTime: `실시간 인버터 모니터링 측정시간 : ${moment().format('YYYY-MM-DD HH:SS')}:00`,
    };
    // BU.CLIN(req.locals);
    res.render('./inverter/inverter', req.locals);
  }),
);

module.exports = router;
