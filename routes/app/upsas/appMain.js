const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../../models/templates/web.util');

const commonUtil = require('../../../models/templates/common.util');
const sensorUtil = require('../../../models/templates/sensor.util');

const DeviceProtocol = require('../../../models/DeviceProtocol');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    BU.CLI('App Main Router');
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    // 모든 Site 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);
    // BU.CLI(powerProfileRows);

    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biDevice.getSensorProfile(mainWhere);

    // BU.CLI(viewSensorProfileRows);

    const deviceProtocol = new DeviceProtocol(siteId);
    const sensorDataInfo = {};
    deviceProtocol.mainViewList.forEach(ndKey => {
      const result = sensorUtil.calcSensorProfileRows(viewSensorProfileRows, {
        calcKey: ndKey,
        standardDate: moment('2018-11-12 09:19:00').toDate(),
      });
      _.assign(sensorDataInfo, { [ndKey]: result });
    });

    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');
    const inverterWhere = inverterSeqList.length ? { inverter_seq: inverterSeqList } : null;

    // Site 발전 현황 구성.
    // 인버터 총합 발전현황 그래프2개 (현재, 금일 발전량),
    let searchRange = biModule.createSearchRange({ searchType: 'months', searchInterval: 'month' });
    // BU.CLI(searchRange);
    // 검색 조건이 일 당으로 검색되기 때문에 금월 날짜로 date Format을 지정하기 위해 day --> month 로 변경
    const inverterStatisticsRows = await biModule.getInverterStatistics(
      searchRange,
      inverterSeqList,
    );

    // 금월 발전량 --> inverterMonthRows가 1일 단위의 발전량이 나오므로 해당 발전량을 전부 합산
    const monthPower = webUtil.reduceDataList(inverterStatisticsRows, 'interval_power');
    const cumulativePower = webUtil.calcValue(
      webUtil.reduceDataList(inverterStatisticsRows, 'max_c_kwh'),
      0.001,
      3,
    );

    // 금일 발전 현황 데이터
    searchRange = biModule.createSearchRange({
      searchType: 'days',
      searchInterval: 'hour',
    });
    // searchRange = biModule.createSearchRange({
    //   strStartDate: '2018-11-01',
    //   searchType: 'days',
    //   searchInterval: 'day',
    // });
    // BU.CLI(searchRange);
    // 인버터 트렌드 구함
    const inverterTrend = await biModule.getInverterTrend(searchRange, inverterSeqList);
    // BU.CLI(inverterTrend);
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

    // 인버터 현재 발전 현황
    /** @type {V_PW_INVERTER_STATUS[]} */
    const inverterStatusRows = await biModule.getTable('v_pw_inverter_status', inverterWhere);
    // 인버터 현황 데이터 목록에 경사 일사량 데이터를 붙임.
    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq: inverterSeq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(powerProfileRows, { inverter_seq: inverterSeq });
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

      // Inverter Status Row에 경사 일사량 확장
      _.assign(inverterStatus, {
        siteName,
      });
    });

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
      // co2: _.round(cumulativePower * 0.424, 3),
      isOperationInverter: _.chain(validInverterDataList)
        .map('hasValidData')
        .values()
        .every(Boolean)
        .value(),
      hasAlarm: false, // TODO 알람 정보 작업 필요
    };

    const returnJson = {
      headerInfo: req.locals.headerInfo,
      containerInfo: {
        powerGenerationInfo,
        growthEnv: sensorDataInfo,
      },
    };

    // BU.CLI(returnJson);
    res.json(returnJson);
  }),
);

module.exports = router;
