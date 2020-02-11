const _ = require('lodash');

const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');

class ControlModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
  }

  async getCommandHistoryReport(pageInfo, memberWhere) {
    const { page = 1, pageListCount = 10 } = pageInfo;

    let sql = 'SELECT * FROM DV_CONTROL_CMD_HISTORY';
    const sqlWhereList = _.map(memberWhere, (value, key) => {
      const realValue = _.isString(value) ? `'${value}'` : value;
      return `${key} = ${realValue}`;
    });

    if (sqlWhereList.length) {
      sql += ` WHERE ${sqlWhereList.join(' AND ')}`;
    }

    sql += ' ORDER BY control_cmd_history_seq DESC';

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
}
module.exports = ControlModel;
