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
  async getMemberReport(pageInfo, memberWhere) {
    // const MAX
    const { page = 1, pageListCount = 10 } = pageInfo;

    let sql = 'SELECT * FROM V_MEMBER';
    const sqlWhereList = _.map(memberWhere, (value, key) => {
      const realValue = _.isString(value) ? `'${value}'` : value;
      return `${key} = ${realValue}`;
    });

    if (sqlWhereList.length) {
      sql += ` WHERE ${sqlWhereList.join(' AND ')}`;
    }

    sql += ' ORDER BY member_seq DESC';

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성
    const mainQuery = `${sql}\n LIMIT ${(page - 1) * pageListCount}, ${pageListCount}`;

    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      reportRows: resMainQuery,
    };
  }

  /**
   * 회원 정보 수정 이력 추출
   * @param {{page: number, pageListCount: number}} pageInfo
   * @return {{totalCount: number, reportRows: []}} 총 갯수, 검색 결과 목록
   */
  async getMemberEditHistoryReport(pageInfo) {
    // const MAX
    const { page = 1, pageListCount = 10 } = pageInfo;

    let sql = 'SELECT * FROM V_MEMBER_EDIT_HISTORY ';
    sql += ' ORDER BY member_edit_history_seq DESC';

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성
    const mainQuery = `${sql}\n LIMIT ${(page - 1) * pageListCount}, ${pageListCount}`;

    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    /** @type {Object[]} */
    const resMainQuery = await this.db.single(mainQuery, '', false);

    // 변경 전, 변경 후 0, 1 은 X, O로 변경
    _.forEach(resMainQuery, row => {
      const { prev_value: pValue, curr_value: cValue } = row;
      // 변경 전
      pValue === '0' && _.set(row, 'prev_value', 'X');
      pValue === '1' && _.set(row, 'prev_value', 'O');
      // 변경 후
      cValue === '0' && _.set(row, 'curr_value', 'X');
      cValue === '1' && _.set(row, 'curr_value', 'O');
    });

    return {
      totalCount,
      reportRows: resMainQuery,
    };
  }
}
module.exports = AdminModel;
