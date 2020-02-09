const _ = require('lodash');
const moment = require('moment');
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
   * 새로 생성한 명령 생성
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
   * 완료한 명령 반영
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
}
module.exports = ControlModel;
