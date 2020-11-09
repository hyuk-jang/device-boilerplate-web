require('./deviceProtocolFormat');

const CALC_TYPE = {
  // 평균 값
  AVG: 'AVG',
  // 시간 당 데이터로 환산 (searchRange 필요)
  AMOUNT: 'AMOUNT',
  // 두 날짜 간격 사이의 데이터 중 큰 값의 차
  INTERVAL_MAX: 'INTERVAL_MAX',
  // 구간 최소값
  MIN: 'MIN',
  // 구간 최대값
  MAX: 'MAX',
};

class DeviceProtocol {
  constructor() {
    this.BASE_KEY = {};

    this.CALC_TYPE = CALC_TYPE;
  }

  static get CALC_TYPE() {
    return CALC_TYPE;
  }

  /**
   * @return {string[]} 현 프로젝트에서 사용할 Sensor 목록, ND Id List
   */
  get pickedNodeDefIdList() {
    return [];
  }

  /**
   * @return {string[]} 내부 센서 ND ID 목록
   */
  get rowsNdIdList() {
    return [];
  }

  /**
   * @return {string[]} 외기 센서 ND ID 목록
   */
  get rowspanNdIdList() {
    return [];
  }

  /**
   * @desc App
   * @return {string[]} 앱 Master로 쓸 센서  ND ID 목록
   */
  get appMasterViewList() {
    return [];
  }

  /**
   * Main 화면에 나타낼 데이터 목록
   * @return {string[]} Node Def Id List
   */
  get mainViewList() {
    return [];
  }

  /**
   * 레포트 - 센서 페이지에서 나타낼 목록
   * @return {{key: string, protocol: string}[]} key: ND ID, protocol: CALC_TYPE
   */
  get senorReportProtocol() {
    return [];
  }

  /**
   * 트렌드 센서 생성 정보
   * @return {trendSensorDomConfig[]}
   */
  get trendSensorViewList() {
    return [];
  }

  /**
   * 트렌드 센서 생성 정보
   * @return {trendInverterDomConfig[]}
   */
  get trendInverterViewList() {
    return [];
  }

  /**
   * 인버터 레포트 생성 정보
   * @return {blockViewMakeOption[]}
   */
  get reportInverterViewList() {
    return [];
  }

  /**
   * 현황 생성 정보
   * @property {string} blockId
   * @return {blockViewMakeOption[]}
   */
  getBlockStatusTable(blockId) {}

  /**
   * 트렌드 생성 정보
   * @property {string} blockId
   * @return {blockTableInfo}
   */
  getBlockChart(blockId) {
    console.trace('getBlockTrendViews');
  }

  /**
   * 레포트 생성 정보
   * @param {string} blockId
   * @return {reportTableInfo}
   */
  getBlockReport(blockId) {}
}
module.exports = DeviceProtocol;
