const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    _.set(req, 'locals.menuNum', 0);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  ['/', '/main'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // 지점 Id를 불러옴
    const { siteId } = req.locals;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const pwProfileWhereInfo = _.eq(siteId, 'all') ? null : { main_seq: siteId };

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile', pwProfileWhereInfo, false);
    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');

    // Site 발전 현황 구성.
    // 인버터 총합 발전현황 그래프2개 (현재, 금일 발전량),
    let searchRange = biModule.getSearchRange('day');
    // 검색 조건이 일 당으로 검색되기 때문에 금월 날짜로 date Format을 지정하기 위해 day --> month 로 변경
    searchRange.searchType = 'month';
    const inverterMonthRows = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLIN(inverterMonthRows);
    // 금월 발전량
    const monthPower = webUtil.reduceDataList(inverterMonthRows, 'interval_power');
    BU.CLI(_.sum(_.map(inverterMonthRows, 'interval_power')));
    // 오늘자 발전 현황을 구할 옵션 설정(strStartDate, strEndDate 를 오늘 날짜로 설정하기 위함)
    // 검색 조건이 시간당으로 검색되기 때문에 금일 날짜로 date Format을 지정하기 위해 hour --> day 로 변경
    const cumulativePowerList = await biModule.getInverterCumulativePower(inverterSeqList);
    const cumulativePower = webUtil.calcValue(
      webUtil.reduceDataList(cumulativePowerList, 'max_c_kwh'),
      0.001,
      3,
    );

    // 누적 발전량
    // const cumulativePower = webUtil.calcValue(
    //   webUtil.reduceDataList(inverterMonthRows, 'max_c_kwh'),
    //   0.001,
    //   3,
    // );

    // 금일 발전 현황 데이터
    // searchRange = biModule.getSearchRange('min10');
    searchRange = biModule.getSearchRange('min10', '2018-11-01');

    const inverterTrend = await biModule.getInverterTrend(searchRange, inverterSeqList);
    // BU.CLI(inverterTrend);

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
    const viewInverterStatusRows = await biModule.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = [];

    // 인버터별 경사 일사량을 가져옴
    const INCLINED_SOLAR = 'inclinedSolar';
    const placeDataList = await biDevice.extendsPlaceDeviceData(
      viewPowerProfileRows,
      INCLINED_SOLAR,
    );

    // 인버터 현황 데이터 목록에 경사 일사량 데이터를 붙임.
    viewInverterStatusRows.forEach(inverterStatus => {
      const foundPlaceData = _.find(placeDataList, { place_seq: inverterStatus.place_seq });
      // BU.CLI(foundPlaceData);
      const foundProfile = _.find(viewPowerProfileRows, {
        inverter_seq: inverterStatus.inverter_seq,
      });
      // const mainName = _.get(foundProfile, 'm_name', '');
      // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
      const {
        ivt_target_name: subName,
        ivt_director_name: company = '',
        ivt_amount: amount,
      } = foundProfile;
      const siteName = `${subName || ''} ${_.round(amount)} kW급 ${
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

    const inverterStatusHtml = makeInverterStatusDom(viewInverterStatusRows);

    // 인버터에 붙어있는 경사 일사량을 구함
    const avgInclinedSolar = _(viewInverterStatusRows)
      .map(INCLINED_SOLAR)
      .meanBy();

    // 인버터 발전 현황 데이터 검증
    const validInverterDataList = webUtil.checkDataValidation(
      viewInverterStatusRows,
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
      [INCLINED_SOLAR]: avgInclinedSolar,
      hasOperationInverter: _.every(
        _.values(_.map(validInverterDataList, data => data.hasValidData)),
      ),
      hasAlarm: false, // TODO 알람 정보 작업 필요
    };
    // BU.CLI(chartData);

    req.locals.dailyPowerChartData = chartData;
    // req.locals.moduleStatusList = validModuleStatusList;
    req.locals.powerGenerationInfo = powerGenerationInfo;

    req.locals.inverterStatusHtml = inverterStatusHtml;
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

/**
 *
 * @param {V_INVERTER_STATUS[]} inverterStatusRows
 */
function makeInverterStatusDom(inverterStatusRows) {
  const inverterStatusTemplate = _.template(`
    <div class="box_5_in">
    <input class="input-tx" type="text" value="<%= siteName %>">
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전압</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_rs_v %>"><span>(v)</span></div>
    </div>
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전류</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_r_a %>"><span>(v)</span></div>
    </div>
  </div>
    `);
  const inverterStatusDom = inverterStatusRows.map(row => inverterStatusTemplate(row));

  return inverterStatusDom;
}

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
