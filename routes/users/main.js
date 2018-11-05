const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const INCLINED_SOLAR = 'inclinedSolar';

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId = req.user.main_seq } = req.params;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    // Site 발전 현황 구성.
    // 인버터 총합 발전현황 그래프2개 (현재, 금일 발전량),
    let searchRange = biModule.getSearchRange('day');
    // 검색 조건이 일 당으로 검색되기 때문에 금월 날짜로 date Format을 지정하기 위해 day --> month 로 변경
    searchRange.searchType = 'month';
    const inverterMonthRows = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLIN(inverterMonthRows);
    // 금월 발전량
    const monthPower = webUtil.reduceDataList(inverterMonthRows, 'interval_power');
    // BU.CLI(_.sum(_.map(inverterMonthRows, 'interval_power')));
    const cumulativePowerList = await biModule.getInverterCumulativePower(inverterSeqList);
    const cumulativePower = webUtil.calcValue(
      webUtil.reduceDataList(cumulativePowerList, 'max_c_kwh'),
      0.001,
      3,
    );

    // 금일 발전 현황 데이터
    // searchRange = biModule.getSearchRange('min10');
    searchRange = biModule.getSearchRange('min10', '2018-11-01');

    // 인버터 트렌드 구함
    const inverterTrend = await biModule.getInverterTrend(searchRange, inverterSeqList);

    // 구한 인버터 Trend는 grouping 구간의 최대 최소 값이므로 오차가 발생. 따라서 이전 grouping 최대 값끼리 비교 연산 필요.
    webUtil.refineDataRows(searchRange, inverterTrend, {
      calcMaxKey: 'max_c_kwh',
      calcMinKey: 'min_c_kwh',
      resultKey: 'interval_power',
      groupKey: 'inverter_seq',
      rangeOption: {
        dateKey: 'group_date',
        minRequiredCountKey: 'total_count',
      },
    });

    // 금일 발전량
    const dailyPower = webUtil.calcValue(
      webUtil.reduceDataList(inverterTrend, 'interval_power'),
      1,
      2,
    );

    // 차트를 생성하기 위한 옵션.
    const chartOption = { selectKey: 'interval_power', dateKey: 'group_date', hasArea: true };
    // 데이터 현황에 따라 동적 차트 궝
    const chartData = webUtil.makeDynamicChartData(inverterTrend, chartOption);

    // 일별 차트로 구성
    webUtil.applyScaleChart(chartData, 'day');
    webUtil.mappingChartDataName(chartData, '인버터 시간별 발전량');

    // 인버터 현재 발전 현황
    /** @type {V_PW_INVERTER_STATUS[]} */
    const inverterStatusRows = await biModule.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });

    // 인버터별 경사 일사량을 가져옴
    const powerProfileRowsWithExtendedSolar = await biDevice.extendsPlaceDeviceData(
      powerProfileRows,
      INCLINED_SOLAR,
    );

    // 인버터 현황 데이터 목록에 경사 일사량 데이터를 붙임.
    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq, place_seq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(powerProfileRows, { inverter_seq });
      // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
      const {
        m_name: mainName = '',
        ivt_target_name: subName,
        ivt_director_name: company = '',
        ivt_amount: amount,
      } = foundProfile;
      const siteName = `${mainName} ${subName || ''} ${_.round(amount)} kW급 ${
        _.isString(company) && company.length ? company : ''
      }`;

      // 경사 일사량 구함
      const foundIncludedInclinedSolarRow = _.chain(powerProfileRowsWithExtendedSolar)
        .find({ place_seq })
        .get('INCLINED_SOLAR', null)
        .value();

      // Inverter Status Row에 경사 일사량 확장
      _.assign(inverterStatus, {
        [INCLINED_SOLAR]: foundIncludedInclinedSolarRow,
        siteName,
      });
    });

    // 인버터에 붙어있는 경사 일사량을 구함
    const avgInclinedSolar = _.round(
      _(inverterStatusRows)
        .map(INCLINED_SOLAR)
        .meanBy(),
    );

    // 인버터 발전 현황 데이터 검증
    const validInverterDataList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    // 설치 인버터 총 용량
    const ivtAmount = _(powerProfileRows)
      .map('ivt_amount')
      .sum();

    const powerGenerationInfo = {
      currKw: webUtil.calcValue(
        webUtil.calcValidDataList(validInverterDataList, 'power_kw', false),
        1,
        3,
      ),
      currKwYaxisMax: _.round(ivtAmount),
      dailyPower,
      monthPower,
      cumulativePower,
      co2: _.round(cumulativePower * 0.424, 3),
      [INCLINED_SOLAR]: avgInclinedSolar,
      hasOperationInverter: _.chain(validInverterDataList)
        .map('hasValidData')
        .values()
        .every(Boolean)
        .value(),
      hasAlarm: false, // TODO 알람 정보 작업 필요
    };
    // BU.CLI(chartData);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 데이터 동적 생성 돔
    const inverterStatusListDom = domMakerMain.makeInverterStatusDom(inverterStatusRows);

    _.set(req, 'locals.dom.inverterStatusListDom', inverterStatusListDom);

    req.locals.dailyPowerChartData = chartData;
    // req.locals.moduleStatusList = validModuleStatusList;
    req.locals.powerGenerationInfo = powerGenerationInfo;
    // BU.CLI(req.locals);
    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./main/index', req.locals);
  }),
);

// router.get(
//   '/ess',
//   asyncHandler(async (req, res) => {
//     console.log(global.app.get('dbInfo'));
//     return res.render('./templates/ESS/index.ejs', req.locals);
//   }),
// );

module.exports = router;
