const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

class AdminModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
    this.weatherModel = new WeatherModel(dbInfo);
  }

  /**
   * 회원 정보 추출
   * @param {{page: number, pageListCount: number}} pageInfo
   * @param {MEMBER} memberWhere
   * @return {{totalCount: number, reportRows: []}} 총 갯수, 검색 결과 목록
   */
  getMemberReport(pageInfo, memberWhere) {
    // const MAX
    const { page = 1, pageListCount = 10 } = pageInfo;

    const { grade, is_account_lock } = memberWhere;

    const where = {};

    const accountStatusList = ['all', 'manager', 'owner', 'guest', ''];

    const sql = 'SELEC';
  }
}
module.exports = AdminModel;
