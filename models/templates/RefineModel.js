const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
// const Promise = require('bluebird');
const BiModule = require('./BiModule');
const PowerModel = require('./PowerModel');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

class RefineModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
    this.powerModel = new PowerModel(dbInfo);
    this.weatherModel = new WeatherModel(dbInfo);
  }

  /**
   * 발전 현황을 나타내는 기본적인 정보 계산
   * @param {number=} siteId
   */
  async refineGeneralPowerInfo(siteId) {
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await this.getTable('v_pw_profile', mainWhere);

    // 연결된 모든 인버터 Seq 목록 추출
    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');

    // 인버터 검색 Where 절
    const inverterWhere = inverterSeqList.length ? { inverter_seq: inverterSeqList } : null;

    // 인버터 월간 정보 추출
    const monthSearchRange = this.createSearchRange({
      searchType: 'months',
      searchInterval: 'month',
    });

    const monthInverterStatusRows = await this.getInverterStatistics(
      monthSearchRange,
      inverterSeqList,
    );

    // console.timeEnd('getInverterStatistics');
    // 금월 발전량 --> inverterMonthRows가 1일 단위의 발전량이 나오므로 해당 발전량을 전부 합산
    const monthPower = webUtil.reduceDataList(monthInverterStatusRows, 'interval_power');

    /** @type {V_PW_INVERTER_STATUS[]} */
    const inverterStatusRows = await this.getTable('v_pw_inverter_status', inverterWhere);

    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq: inverterSeq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(viewPowerProfileRows, { inverter_seq: inverterSeq });
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

    // BU.CLI(inverterStatusRows);

    // 인버터 발전 현황 데이터 검증
    const validInverterDataList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    // 설치 인버터 총 용량
    const ivtAmount = _(viewPowerProfileRows)
      .map('ivt_amount')
      .sum();

    // Curr PV 전력
    const pvKw = webUtil.calcValue(
      webUtil.calcValidDataList(validInverterDataList, 'pv_kw', false),
      1,
      3,
    );
    // Curr Power 전력
    const currKw = webUtil.calcValue(
      webUtil.calcValidDataList(validInverterDataList, 'power_kw', false),
      1,
      2,
    );

    // 금일 발전량
    const dailyPower = _(inverterStatusRows)
      .map('daily_power_kwh')
      .sum();

    // Curr Power 전력
    const cumulativePower = webUtil.calcValue(
      webUtil.calcValidDataList(validInverterDataList, 'power_cp_kwh', true),
      0.001,
      3,
    );

    // 현재 발전 효율
    const currPf = _.isNumber(pvKw) && _.isNumber(currKw) ? _.round((currKw / pvKw) * 100, 1) : '-';

    const powerGenerationInfo = {
      currKw,
      currPf: _.isNaN(currPf) ? '-' : currPf,
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
    };

    return { powerGenerationInfo, validInverterDataList };
  }

  /**
   * 인버터 차트 뽑아옴
   * @param {number[]=} inverterSeqList
   */
  async refineInverterStatus(inverterSeqList) {
    const inverterWhere = inverterSeqList.length ? { inverter_seq: inverterSeqList } : null;

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await this.powerModel.getTable(
      'v_pw_inverter_status',
      inverterWhere,
    );

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = await this.powerModel.makeInverterNameList(inverterSeqList);

    _(inverterStatusRows).forEach(statusRow => {
      statusRow.siteName = _.get(
        _.find(inverterSiteNameList, {
          inverter_seq: Number(statusRow.inverter_seq),
        }),
        'siteName',
        '',
      );
    });

    // 데이터 검증
    const validInverterStatusList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    /** 인버터 메뉴에서 사용 할 데이터 선언 및 부분 정의 */
    const refinedInverterStatusList = webUtil.refineSelectedInverterStatus(validInverterStatusList);

    return refinedInverterStatusList;
  }

  /**
   * 인버터 차트 뽑아옴
   * @param {searchRange} searchRange
   * @param {number[]=} inverterSeqList
   * @param {lineChartConfig} lineChartConfig
   */
  async refineInverterChart(searchRange, inverterSeqList, lineChartConfig) {
    const inverterPowerList = await this.powerModel.getInverterPower(searchRange, inverterSeqList);

    const inverterSiteNameList = await this.powerModel.makeInverterNameList(inverterSeqList);

    // 동적 라인 차트를 생성
    const inverterLineChart = webUtil.makeDynamicLineChart(lineChartConfig, inverterPowerList);

    inverterLineChart.series.forEach(chartInfo => {
      chartInfo.name = _.get(
        _.find(inverterSiteNameList, {
          inverter_seq: Number(chartInfo.name),
        }),
        'siteName',
        chartInfo.name,
      );
    });

    return inverterLineChart;
  }
}
module.exports = RefineModel;
