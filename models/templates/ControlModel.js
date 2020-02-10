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
        cmd_uuid: wrapCmdUUID,
        cmd_format: wrapCmdFormat,
        cmd_id: wrapCmdId,
        cmd_name: wrapCmdName,
        cmd_type: wrapCmdType,
        start_date: new Date(),
      };
    });

    return this.setTables('dv_control_cmd_history', insertRows, true);
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
      true,
    );
  }

  /**
   * 사용자가 요청한 명령에 대한 사용자의 정보를 제어 이력 테이블에 반영
   * @param {contractCmdInfo} contractCmdInfo
   * @param {number} memberSeq
   */
  async updateCmdHistoryUser(contractCmdInfo, memberSeq) {
    const { wrapCmdUUID } = contractCmdInfo;
    // 사용자가 응답 명령을 처리하는 것은 현재시간을 기준으로 1분 전까지의 명령만 유효
    const sql = `
      UPDATE dv_control_cmd_history
      SET
            member_seq = ${mysql.escape(memberSeq)}
      WHERE 
            cmd_uuid = ${mysql.escape(wrapCmdUUID)}
        AND start_date >= DATE_ADD(NOW(), INTERVAL -1 MINUTE)
    `;
    return this.db.single(sql, null, true);
  }
}
module.exports = ControlModel;
