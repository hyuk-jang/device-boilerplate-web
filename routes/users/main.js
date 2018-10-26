const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     BU.CLI('main Middle ware');
//     _.set(req, 'locals.menuNum', 1);

//     // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
//     next();
//   }),
// );

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    const user = _.get(req, 'user', {});
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    _.set(req, 'locals.menuNum', 0);

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    const siteList = _(viewPowerProfileRows)
      .groupBy('main_seq')
      .map((profileRows, strMainSeq) => {
        // BU.CLI(profileRows);
        const totalAmount = _.round(
          _(profileRows)
            .map('ivt_amount')
            .sum(),
        );
        const siteMainName = _.get(_.head(profileRows), 'm_name', '');
        const siteName = `${totalAmount}kW급 테스트배드 (${siteMainName})`;
        return { siteid: strMainSeq, name: siteName };
      });

    _.set(req, 'locals.siteList', siteList);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // BU.CLI(req.user);

    const user = _.get(req, 'user', {});

    // 지점 Id를 불러옴
    const { siteid = req.user.main_seq } = req.query;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const pwProfileWhereInfo = _.eq(siteid, 'all') ? null : { main_seq: siteid };

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile', pwProfileWhereInfo, false);
    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');
    // BU.CLI(viewPowerProfileRows.length);

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(
      _.head(viewPowerProfileRows).weather_location_seq,
    );
    // BU.CLI(currWeatherCastInfo);

    // Site 발전 현황 구성.
    // 인버터 총합 발전현황 그래프2개 (현재, 금일 발전량),
    let searchRange = biModule.getSearchRange('day');
    // 검색 조건이 일 당으로 검색되기 때문에 금월 날짜로 date Format을 지정하기 위해 day --> month 로 변경
    searchRange.searchType = 'month';
    const inverterMonthRows = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLIN(inverterMonthRows);
    // 금월 발전량
    const monthPower = webUtil.reduceDataList(inverterMonthRows, 'interval_power');
    // 누적 발전량
    const cumulativePower = webUtil.calcValue(
      webUtil.reduceDataList(inverterMonthRows, 'max_c_kwh'),
      0.001,
      3,
    );
    // BU.CLIS(monthPower, cumulativPower);

    // 금일 발전 현황 데이터
    // searchRange = biModule.getSearchRange('min10');
    searchRange = biModule.getSearchRange('min10', '2018-10-25');

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
        calcMaxKey: 'max_c_kwh',
        calcMinKey: 'min_c_kwh',
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

    // 금일 발전량
    const dailyPower = webUtil.calcValue(
      webUtil.reduceDataList(inverterTrend, 'interval_power'),
      0.001,
      2,
    );
    // BU.CLI(dailyPower);

    const chartOption = { selectKey: 'interval_power', dateKey: 'group_date', hasArea: true };
    // BU.CLI(inverterTrend)
    const chartData = webUtil.makeDynamicChartData(inverterTrend, chartOption);
    // BU.CLI(chartData);

    webUtil.applyScaleChart(chartData, 'day');
    webUtil.mappingChartDataName(chartData, '인버터 시간별 발전량');

    // 인버터 현재 발전 현황
    /** @type {V_PW_INVERTER_STATUS[]} */
    const inverterDataList = await biModule.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });

    // 인버터 발전 현황 데이터 검증
    const validInverterDataList = webUtil.checkDataValidation(
      inverterDataList,
      new Date(),
      'writedate',
    );

    // 설치 인버터 총 용량
    const ivtAmount = _(viewPowerProfileRows)
      .map('ivt_amount')
      .sum();
    const powerGenerationInfo = {
      currKw: webUtil.calcValue(
        webUtil.calcValidDataList(validInverterDataList, 'power_kw', false),
        1,
        3,
      ),
      currKwYaxisMax: _.round(ivtAmount),
      dailyPower: dailyPower === '' ? 0 : dailyPower,
      monthPower,
      cumulativePower,
      co2: _.round(cumulativePower * 0.424, 3),
      solarRadiation: '',
      hasOperationInverter: _.every(
        _.values(_.map(validInverterDataList, data => data.hasValidData)),
      ),
      hasAlarm: false, // TODO 알람 정보 작업 필요
    };
    // BU.CLI(chartData);

    req.locals.siteId = siteid;
    req.locals.dailyPowerChartData = chartData;
    req.locals.currWeatherCastInfo = currWeatherCastInfo;
    // req.locals.moduleStatusList = validModuleStatusList;
    req.locals.powerGenerationInfo = powerGenerationInfo;

    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/ess',
  asyncHandler(async (req, res) => {
    console.log(global.app.get('dbInfo'));
    return res.render('./templates/ESS/index.ejs', req.locals);
  }),
);

module.exports = router;

// router.get('/intersection', (req, res) => {
//   const grade = _.get(req, 'user.grade');
//   switch (grade) {
//     case 'admin':
//       router.use('/admin', admin);
//       res.redirect('/admin');
//       break;
//     case 'manager':
//       router.use('/manager', manager);
//       res.redirect('/manager');
//       break;
//     default:
//       break;
//   }
// });
