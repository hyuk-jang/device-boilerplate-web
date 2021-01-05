const _ = require('lodash');
const moment = require('moment');
const mysql = require('mysql');

const { BM } = require('base-model-jh');
const { BU } = require('base-util-jh');

/**
 * @typedef {Object[]} weatherRowDataPacketList
 * @property {string} view_date 차트에 표현할 Date Format
 * @property {string} group_date 그룹 처리한 Date Format
 * @property {number} avg_sky 평균 운량
 */

class ControlModel extends BM {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    /** @type {{memberSeq: number, cmdUUID: string}[]} */
    this.reqCmdUserList = [];
  }

  /**
   * 사용자가 명령 요청에 성공하였을 경우 저장
   * @param {number} memberSeq
   * @param {contractCmdInfo} contractCmdInfo
   */
  addReqCmdUser(memberSeq, contractCmdInfo) {
    const { wrapCmdUUID } = contractCmdInfo;

    this.reqCmdUserList.findIndex(cmdUserInfo => cmdUserInfo.cmdUUID === wrapCmdUUID) <
      0 &&
      this.reqCmdUserList.push({
        memberSeq,
        cmdUUID: wrapCmdUUID,
      });
  }

  /**
   * 저장된 명령 사용자 정보가 있을 경우 반환하고 리스트에서 삭제
   * @param {string} wrapCmdUUID
   */
  getReqCmdUserSeq(wrapCmdUUID) {
    const foundIndex = this.reqCmdUserList.findIndex(
      cmdUserInfo => cmdUserInfo.cmdUUID === wrapCmdUUID,
    );
    // 사용자 명령 정보가 없을 경우 기본값은 null
    if (foundIndex < 0) {
      return null;
    }
    // 사용자 Seq 추출
    const { memberSeq } = this.reqCmdUserList[foundIndex];
    // 메모리에서 사용자 명령 정보 제거
    _.pullAt(this.reqCmdUserList, foundIndex);

    return memberSeq;
  }

  /**
   * 제어 이벤트를 명령 형식으로 변환하여 반환
   * @param {Object} where
   */
  async getCmdHistory(where) {
    /** @type {DV_CONTROL_CMD_HISTORY[]} */
    const controlCmdHistoryRows = await this.getTable('dv_control_cmd_history', where);

    return controlCmdHistoryRows.map(row => {
      const {
        cmd_uuid: wrapCmdUUID,
        cmd_format: wrapCmdFormat,
        cmd_type: wrapCmdType,
        cmd_id: wrapCmdId,
        cmd_name: wrapCmdName,
      } = row;

      /** @type {contractCmdInfo} */
      const convertInfo = {
        wrapCmdFormat,
        wrapCmdId,
        wrapCmdName,
        wrapCmdStep: '',
        wrapCmdType,
        wrapCmdUUID,
      };
      return convertInfo;
    });
  }

  /**
   * DBS에서 새로이 수행한 명령을 제어 이력 관리 테이블에 반영
   * @param {msFieldInfo} msFieldInfo
   * @param {contractCmdInfo[]} contractCmdList
   */
  insertCmdHistory(msFieldInfo, contractCmdList) {
    if (!contractCmdList.length) return false;

    const insertRows = _.map(contractCmdList, cmdInfo => {
      const { wrapCmdFormat, wrapCmdId, wrapCmdName, wrapCmdType, wrapCmdUUID } = cmdInfo;

      return {
        main_seq: msFieldInfo.main_seq,
        member_seq: this.getReqCmdUserSeq(wrapCmdUUID),
        cmd_uuid: wrapCmdUUID,
        cmd_format: wrapCmdFormat,
        cmd_id: wrapCmdId,
        cmd_name: wrapCmdName,
        cmd_type: wrapCmdType,
        start_date: new Date(),
      };
    });

    return this.setTables('dv_control_cmd_history', insertRows, false);
  }

  /**
   * DBS에서 완료한 명령 시각을 제어 이력 관리 테이블에 반영
   * @param {DV_CONTROL_CMD_HISTORY[]} cmdHistoryRows
   */
  completeCmdHistory(cmdHistoryRows) {
    if (!cmdHistoryRows.length) return false;

    // 명령 종료 날짜 입력
    cmdHistoryRows.forEach(cmdHistoryRow => {
      cmdHistoryRow.end_date = new Date();
    });

    // 명령 반영
    return this.updateTablesByPool(
      'dv_control_cmd_history',
      ['control_cmd_history_seq'],
      cmdHistoryRows,
      false,
    );
  }

  /**
   * 사용자가 요청한 명령에 대한 사용자의 정보를 제어 이력 테이블에 반영
   * @param {contractCmdInfo} contractCmdInfo
   * @param {number} memberSeq
   */
  updateCmdHistoryUser(contractCmdInfo, memberSeq) {
    const { wrapCmdUUID } = contractCmdInfo;
    // 사용자가 응답 명령을 처리하는 것은 현재시간을 기준으로 1분 전까지의 명령만 유효
    const sql = `
      UPDATE dv_control_cmd_history
      SET
            member_seq = ${mysql.escape(memberSeq)}
      WHERE 
            cmd_uuid = ${mysql.escape(wrapCmdUUID)}
        AND start_date >= DATE_ADD(NOW(), INTERVAL -2 MINUTE)
    `;
    return this.db.single(sql, null, false);
  }

  /**
   * 제어 이력 추출
   * @param {{page: number, pageListCount: number}} pageInfo
   * @param {MAIN} mainWhere
   * @return {{totalCount: number, reportRows: DV_CONTROL_CMD_HISTORY[]}} 총 갯수, 검색 결과 목록
   */
  async getCmdHistoryReport(pageInfo, mainWhere) {
    const { page = 1, pageListCount = 10 } = pageInfo;

    let sql = 'SELECT * FROM DV_CONTROL_CMD_HISTORY';
    const sqlWhereList = _.map(mainWhere, (value, key) => {
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
