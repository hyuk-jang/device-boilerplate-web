const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
// const Promise = require('bluebird');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

class BlockModel extends BiModule {
  /**
   *
   * @param {Object} blockStatusConfig 테이블 명
   * @param {string} blockStatusConfig.tableName 테이블 명
   * @param {string} blockStatusConfig.uniqueColumn status를 구성할 정렬 최우선 key
   * @param {string=} blockStatusConfig.groupColumn 그루핑할 key. 기본 place_seq
   * @param {string} blockStatusConfig.whereColumn where 처리할 column 이름
   * @param {number[]} blockStatusConfig.whereColumnValueList column
   */
  getBlockStatus(blockStatusConfig) {
    const {
      tableName,
      uniqueColumn,
      groupColumn = 'place_Seq',
      whereColumn = '',
      whereColumnValueList = [],
    } = blockStatusConfig;

    const where =
      whereColumn.length && whereColumnValueList.length
        ? ` WHERE ${whereColumn} IN (${whereColumnValueList})`
        : '';

    const sql = `
      SELECT 
        main.*
      FROM ${tableName} main
      INNER JOIN
      (
        SELECT MAX(${uniqueColumn}) AS ${uniqueColumn}
        FROM ${tableName}
        GROUP BY ${groupColumn}
      ) temp
      ON main.${uniqueColumn} = temp.${uniqueColumn}
      ${where}
    `;

    return this.db.single(sql, null, false);
  }
}
module.exports = BlockModel;
