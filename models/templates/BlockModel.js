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

  /**
   * DB Table 동적 Query 생성 및 결과 반환
   * @param {dynamicQueryGuideInfo} dynamicQueryGuideInfo
   */
  async getDynamicBlockRows(dynamicQueryGuideInfo) {
    const { searchRange, pageInfo, dynamicQueryConfig, whereColumnInfo } = dynamicQueryGuideInfo;
    const {
      baseTableInfo,
      blockTableName,
      dbTableDynamicSqlConfig,
      dbTableDynamicSqlConfig: {
        amountColumnList = [],
        avgColumnList = [],
        evalExpressionList,
        intervalColumnList = [],
        maxColumnList = [],
        minColumnList = [],
      },
    } = dynamicQueryConfig;

    const selectDynamicSqlList = [];

    _.forEach(dbTableDynamicSqlConfig, (columnList, key) => {
      let dynamicSqlTemplate = '';

      switch (key) {
        case 'avgColumnList':
          dynamicSqlTemplate = _.template('AVG(<%= value %>) AS avg_<%= value %>');
          break;
        case 'maxColumnList':
          dynamicSqlTemplate = _.template('MAX(<%= value %>) AS max_<%= value %>');
          break;
        case 'minColumnList':
          dynamicSqlTemplate = _.template('MIN(<%= value %>) AS min_<%= value %>');
          break;
        case 'intervalColumnList':
          dynamicSqlTemplate = _.template(
            'MAX(<%= value %>) - MIN(<%= value %>) AS interval_<%= value %>',
          );
          break;
        case 'evalExpressionList':
          break;
        default:
          break;
      }

      // 계산식이 아닐 경우
      if (key !== 'evalExpressionList') {
        _.forEach(columnList, columnId => {
          selectDynamicSqlList.push(dynamicSqlTemplate({ value: columnId }));
        });
      }
    });

    // BU.CLI(selectDynamicSqlList);

    // return this.db.single(sql, null, false);
  }
}
module.exports = BlockModel;

/**
 * @typedef {Object} dynamicQueryGuideInfo
 * @property {searchRange} searchRange 검색 조건
 * @property {{page: number, pageListCount: number}} pageInfo 가져올 페이지
 * @property {{column: string, seqList: number[]}=} whereColumnInfo 가져올 특정 장소
 * @property {dynamicQueryConfig} dynamicQueryConfig 동적 SQL 생성 Query 생성 정보
 */
