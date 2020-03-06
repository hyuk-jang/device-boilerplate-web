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
   * @param {dynamicQueryRowsGuideInfo} dynamicQueryGuideInfo
   */
  getDynamicBlockRows(dynamicQueryGuideInfo) {
    try {
      const { searchRange, dynamicQueryConfig, whereColumnInfo } = dynamicQueryGuideInfo;

      // 동적 Query 생성을 위한 Table 정보
      const {
        baseTableInfo: { fromToKeyTableList, writeDateKey = 'writedate' },
        blockTableName,
        dbTableDynamicSqlConfig,
      } = dynamicQueryConfig;

      const staticSelectQueryList = _.map(fromToKeyTableList, 'toKey');

      let sqlBlockWhere = '';
      if (!_.isEmpty(whereColumnInfo)) {
        if (whereColumnInfo.seqList.length) {
          sqlBlockWhere = ` AND ${whereColumnInfo.column} IN (${whereColumnInfo.seqList})`;
        } else {
          throw new RangeError(`whereColumnInfo key: ${whereColumnInfo.column} length 0`);
        }
      }

      const selectDynamicQueryList = [];

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
          case 'expressionList':
            dynamicSqlTemplate = _.template('<%= expression %> AS <%= columnId %>');
            break;
          default:
            break;
        }

        // 계산식이 아닐 경우
        if (key !== 'expressionList') {
          _.forEach(columnList, columnId => {
            selectDynamicQueryList.push(dynamicSqlTemplate({ value: columnId }));
          });
        } else {
          // 계산식을 활용한 컬럼이 있을 경우 적용
          _.forEach(columnList, expressionInfo => {
            let { expression } = expressionInfo;
            const { columnId, scale, toFixed = 1 } = expressionInfo;

            if (_.isNumber(scale)) {
              expression = `(${expression}) * ${scale}`;
            }
            if (_.isNumber(toFixed)) {
              expression = `ROUND(${expression}, ${toFixed})`;
            }

            selectDynamicQueryList.push(
              dynamicSqlTemplate({
                expression,
                columnId,
              }),
            );
          });
        }
      });

      const {
        selectGroupDate,
        selectViewDate,
        firstGroupByFormat,
      } = this.convertSearchRangeToDBFormat(searchRange, writeDateKey);

      const mainSql = `
        SELECT
                ${staticSelectQueryList.toString()},
                ${selectViewDate},
                ${selectGroupDate},
                ${_.join(selectDynamicQueryList, ',\n')},
                COUNT(*) AS row_count
        FROM ${blockTableName}
        WHERE ${writeDateKey} >= "${searchRange.strStartDate}" and ${writeDateKey} <"${
        searchRange.strEndDate
      }"
        ${sqlBlockWhere}
        GROUP BY ${firstGroupByFormat}, ${staticSelectQueryList.toString()}
        ORDER BY ${staticSelectQueryList.toString()}, ${writeDateKey}
      `;

      // BU.CLI(mainSql);
      return this.db.single(mainSql, null, false);
    } catch (error) {
      return [];
    }
  }

  /**
   * DB Table 동적 Query 생성 및 결과 반환
   * @param {dynamicQueryRowsGuideInfo} dynamicQueryGuideInfo
   * @param {boolean=} isMergeByDate staticSelectQueryList를 무시하고 writeDate으로 GroupBy 처리 여부
   */
  getDynamicBlockReportRowsQuery(dynamicQueryGuideInfo, isMergeByDate = false) {
    const { searchRange, dynamicQueryConfig, whereColumnInfo } = dynamicQueryGuideInfo;

    const { strStartDate, strEndDate } = searchRange;

    // 동적 Query 생성을 위한 Table 정보
    const {
      baseTableInfo: { fromToKeyTableList, writeDateKey = 'writedate' },
      blockTableName,
      dbTableDynamicSqlConfig,
    } = dynamicQueryConfig;

    const {
      divideTimeNumber,
      selectGroupDate,
      selectViewDate,
      groupByFormat,
      firstGroupByFormat,
    } = this.convertSearchRangeToDBFormat(searchRange, writeDateKey);

    // 검색 조건은 있으나 seqList가 없다면 유효하지 않은 질의로 판단
    if (_.isObject(whereColumnInfo) && whereColumnInfo.seqList.length === 0) {
      return '';
    }

    const staticSelectQueryList = _.map(fromToKeyTableList, 'toKey');
    const sqlBlockWhere = _.isEmpty(whereColumnInfo)
      ? ''
      : ` AND ${whereColumnInfo.column} IN (${whereColumnInfo.seqList})`;

    const firstDynamicQueryList = [];
    const secondDynamicQueryList = [];

    _.forEach(dbTableDynamicSqlConfig, (columnList, key) => {
      let firstQueryTemplate = '';
      let secondQueryTemplate = '';

      switch (key) {
        case 'avgColumnList':
          firstQueryTemplate = 'AVG(<%= columnId %>) AS avg_<%= columnId %>';
          secondQueryTemplate = 'AVG(avg_<%= columnId %>) AS avg_<%= columnId %>';
          break;
        case 'avgSumColumnList':
          firstQueryTemplate = 'AVG(<%= columnId %>) AS avg_<%= columnId %>';
          secondQueryTemplate = 'SUM(avg_<%= columnId %>) AS avg_sum_<%= columnId %>';
          break;
        case 'maxColumnList':
          firstQueryTemplate = 'MAX(<%= columnId %>) AS max_<%= columnId %>';
          secondQueryTemplate = 'MAX(max_<%= columnId %>) AS max_<%= columnId %>';
          break;
        case 'maxSumColumnList':
          firstQueryTemplate = 'MAX(<%= columnId %>) AS max_<%= columnId %>';
          secondQueryTemplate = 'SUM(max_<%= columnId %>) AS max_sum_<%= columnId %>';
          break;
        case 'minColumnList':
          firstQueryTemplate = 'MIN(<%= columnId %>) AS min_<%= columnId %>';
          secondQueryTemplate = 'MIN(min_<%= columnId %>) AS min_<%= columnId %>';
          break;
        case 'intervalColumnList':
          firstQueryTemplate =
            'MAX(<%= columnId %>) - MIN(<%= columnId %>) AS interval_<%= columnId %>';
          secondQueryTemplate = 'SUM(interval_<%= columnId %>) AS interval_<%= columnId %>';
          break;
        case 'amountColumnList':
          firstQueryTemplate = `AVG(<%= columnId %>) / ${divideTimeNumber} AS amount_<%= columnId %>`;
          secondQueryTemplate = 'SUM(amount_<%= columnId %>) AS amount_<%= columnId %>';
          break;
        case 'expressionList':
          firstQueryTemplate = '<%= expression %> AS <%= columnId %>';
          secondQueryTemplate = firstQueryTemplate;
          break;
        default:
          break;
      }

      firstQueryTemplate = _.template(firstQueryTemplate);
      secondQueryTemplate = _.template(secondQueryTemplate);

      // 계산식이 아닐 경우
      if (key === 'expressionList') {
        // 계산식을 활용한 컬럼이 있을 경우 적용
        _.forEach(columnList, expressionInfo => {
          let { firstExpression } = expressionInfo;
          const { columnId, scale, toFixed = 1, secondExpression } = expressionInfo;

          if (_.isNumber(scale)) {
            firstExpression = `(${firstExpression}) * ${scale}`;
          }
          if (_.isNumber(toFixed)) {
            firstExpression = `ROUND(${firstExpression}, ${toFixed})`;
          }

          firstDynamicQueryList.push(
            firstQueryTemplate({
              expression: firstExpression,
              columnId,
            }),
          );

          secondDynamicQueryList.push(
            secondQueryTemplate({
              expression: secondExpression,
              columnId,
            }),
          );
        });
      } else {
        _.forEach(columnList, columnId => {
          firstDynamicQueryList.push(firstQueryTemplate({ columnId }));
          secondDynamicQueryList.push(secondQueryTemplate({ columnId }));
        });
      }
    });

    const mainSql = `
        SELECT
              ${isMergeByDate ? '' : `${staticSelectQueryList.toString()}, `}
              ${selectViewDate},
              ${selectGroupDate},
              ${_.join(secondDynamicQueryList, ',\n')},
              COUNT(*) AS row_count
        FROM 
        (
          SELECT
                  ${staticSelectQueryList.toString()},
                  ${writeDateKey},
                  ${_.join(firstDynamicQueryList, ',\n')},
                  COUNT(*) AS row_count
          FROM ${blockTableName}
          WHERE ${writeDateKey} >= "${strStartDate}" AND ${writeDateKey} <"${strEndDate}"
          ${sqlBlockWhere}
          GROUP BY ${firstGroupByFormat}, ${staticSelectQueryList.toString()}
          ORDER BY ${staticSelectQueryList.toString()}, ${writeDateKey}
        ) AS main_rows
        GROUP BY ${isMergeByDate ? '' : `${staticSelectQueryList.toString()}, `} ${groupByFormat}
      `;

    // BU.CLI(mainSql);
    return mainSql;
    // return this.db.single(mainSql, null, true);
  }

  /**
   * Report
   * @param {dynamicQueryRowsGuideInfo} dynamicQueryGuideInfo createSearchRange() Return 객체
   * @param {pageInfo} pageInfo
   * @return {{totalCount: number, reportRows: []}} 총 갯수, 검색 결과 목록
   */
  async getDynamicReport(dynamicQueryGuideInfo, pageInfo) {
    const returnValue = {
      totalCount: 0,
      reportRows: [],
    };

    const sql = this.getDynamicBlockReportRowsQuery(dynamicQueryGuideInfo, true);

    if (sql.length === 0) {
      return returnValue;
    }

    const { page = 1, pageListCount = 10 } = pageInfo;
    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;

    const mainQuery = `${sql}\n LIMIT ${(page - 1) * pageListCount}, ${pageListCount}`;

    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    returnValue.totalCount = _.head(resTotalCountQuery).total_count;
    returnValue.reportRows = await this.db.single(mainQuery, '', false);

    return returnValue;
  }

  /**
   * Report
   * @param {dynamicQueryRowsGuideInfo} dynamicQueryGuideInfo createSearchRange() Return 객체
   */
  getDynamicTrend(dynamicQueryGuideInfo) {
    const sql = this.getDynamicBlockReportRowsQuery(dynamicQueryGuideInfo);

    return this.db.single(sql);
  }
}
module.exports = BlockModel;

// const reg = /[a-zA-Z]/;
// _.forEach(columnList, calculate => {
//   let finalMsg = '';
//   let tempBuffer = '';
//   for (let i = 0; i < calculate.length; i += 1) {
//     const thisChar = calculate.charAt(i);
//     if (reg.test(thisChar)) {
//       tempBuffer += thisChar;
//     } else {
//       if (tempBuffer !== '') {
//         finalMsg += `deviceData['${tempBuffer}']`;
//         tempBuffer = '';
//       }
//       finalMsg += thisChar;
//     }
//     if (calculate.length === i + 1 && tempBuffer !== '') {
//       finalMsg += `deviceData['${tempBuffer}']`;
//     }
//   }
//   resultCalculate = Number(Number(eval(finalMsg)).toFixed(toFixed));
//   resultCalculate = _.isNaN(resultCalculate) ? 0 : resultCalculate;
// });
