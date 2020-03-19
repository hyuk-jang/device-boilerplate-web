const _ = require('lodash');

const mysql = require('mysql');

const { BU } = require('base-util-jh');
const moment = require('moment');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const commonUtil = require('./common.util');
const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

module.exports = class extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
    this.weatherModel = new WeatherModel(dbInfo);
  }

  /* ****************************************************
   ********             데이터 정제
   **************************************************** */
  /**
   * 발전 효율 차트 생성
   * @param {[]} powerEffRows
   * @param {Object} option
   * @param {string} option.dataKey 차트에 뿌릴 데이터 Key
   * @param {string} option.dateKey 차트에 추출할 날짜 Key
   * @param {string=} option.groupKey Rows를 그루핑할 Key
   * @param {string[]=} option.nameKeys 이름을 부여할 Key List
   * @param {Object} option.mergeInfo 2차 병합이 필요할 경우
   * @param {string=} option.mergeInfo.mergeKey 데이터 병합할 Key
   * @param {string=} option.mergeInfo.mergeType AVG, SUM, MAX
   */
  makePowerEfficiencyChart(powerEffRows, option) {
    const {
      dataKey,
      dateKey = 'group_date',
      groupKey = 'install_place',
      nameKeys = [groupKey],
    } = option;

    return _.chain(powerEffRows)
      .groupBy(groupKey)
      .map(powerRows => {
        return {
          name: nameKeys.map(nKey => powerRows[0][nKey]).join(' '),
          data: powerRows.map(row => [commonUtil.convertDateToUTC(row[dateKey]), row[dataKey]]),
        };
      })
      .value();
  }

  /**
   *
   * @param {{}[]} dataRows
   * @param {Object[]} selectOptions 차트로 만들 정보
   * @param {string} selectOptions.dataKey 차트로 만들 Data Key
   * @param {string} selectOptions.name 차트 라인 이름
   * @param {number=} selectOptions.yAxis 차트 y축 방향
   * @param {string=} selectOptions.color 차트 라인 색상
   * @param {string=} selectOptions.dashStyle 차트 라인 스타일
   */
  makeChartData(dataRows, selectOptions) {
    return selectOptions.map(selectInfo => {
      const { dataKey, name, color = null, dashStyle, yAxis = 0 } = selectInfo;

      return {
        name,
        color,
        dashStyle,
        yAxis,
        data: dataRows.map(wddRow => [
          commonUtil.convertDateToUTC(wddRow.group_date),
          _.get(wddRow, dataKey, ''),
        ]),
      };
    });
  }

  /**
   * group_date로 묶었을 때 가장 이른 시각과 늦은 시각을 각각 반환
   * @param {[{}]} rows
   * @param {string} dateKey 날짜로 묶을 키
   * @return {{sDate: string, eDate: string}}
   */
  getStartEndDate(rows, dateKey = 'group_date') {
    const sortedRows = _.sortBy(rows, dateKey);
    const { group_date: sDate } = _.head(sortedRows) || {};
    const { group_date: eDate } = _.last(sortedRows) || {};
    return { sDate, eDate };
  }

  /* ****************************************************
   ********                 SQL
   **************************************************** */

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @param {string=} effType 검색 조건. target_category or inverter_seq
   * @return {Promise.<{inverter_seq: number, target_category: string, install_place: string, chart_sort_rank: number, t_amount: number, t_power_kw: number, t_interval_power_cp_kwh: number, t_interval_power_eff: number, group_date: string}[]>}
   * @example
   * effType: target_category = 육상 0도, 육상 30도, 수중 0도
   * effType: inverter_seq = 육상 0도(A~B), 육상 30도(A~B), 수중 0도(A~D)
   */
  getPowerEffReport(searchRange, effType = 'target_category') {
    const { selectGroupDate, selectViewDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
      SELECT
            inverter_seq, serial_number, target_category, install_place, chart_sort_rank, 
            ROUND(SUM(amount), 2) t_amount,
            ROUND(SUM(avg_power_kw) , 4) AS t_power_kw,
            ROUND(SUM(avg_power_kw) / SUM(amount) * 100, 2) AS avg_power_eff,
            ROUND(SUM(interval_power_cp_kwh) , 4) AS t_interval_power_cp_kwh,
            ROUND(SUM(interval_power_cp_kwh) / SUM(amount) * 100, 2) AS t_interval_power_eff,
            group_date
      FROM
        (
        SELECT 
              inv_tbl.inverter_seq, serial_number, target_category, install_place, amount, chart_sort_rank,
              inv_data.writedate,
              AVG(inv_data.power_kw) AS avg_power_kw,
              MAX(inv_data.power_cp_kwh) - MIN(inv_data.power_cp_kwh) AS interval_power_cp_kwh,
              ${selectViewDate},
              ${selectGroupDate}
        FROM pw_inverter_data inv_data
        JOIN 
          (
          SELECT
            * 
          FROM pw_inverter inv
          WHERE inv.target_category IN ('water0angle', 'earth30angle', 'earth0angle')
          ) inv_tbl
        ON inv_tbl.inverter_seq = inv_data.inverter_seq
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
         AND inv_data.inverter_seq IN (inv_tbl.inverter_seq)
        GROUP BY ${effType}, group_date, inverter_seq
        ) final
      GROUP BY ${effType}, group_date
    `;

    return this.db.single(sql, null, false);
  }

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @param {string=} effType 검색 조건. target_category or inverter_seq
   * @param {number=} mainSeq
   * @return {Promise.<{inverter_seq: number, seb_name: string, target_category: string, install_place: string, serial_number: string, avg_water_level: number, avg_salinity: number, avg_module_rear_temp:number, avg_brine_temp:number, group_date: string}[]>}
   */
  getEnvReport(searchRange, effType = 'target_category', mainSeq) {
    const { selectGroupDate, selectViewDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
        SELECT 
            ssd.place_seq, sub_tbl.inverter_seq, sub_tbl.seb_name, sub_tbl.target_category, sub_tbl.install_place, sub_tbl.serial_number,
            ROUND(AVG(ssd.water_level), 1)  AS avg_water_level,
            ROUND(AVG(ssd.salinity), 1) AS avg_salinity,
            ROUND(AVG(ssd.module_rear_temp), 1) AS avg_module_rear_temp,
            ROUND(AVG(ssd.brine_temp), 1) AS avg_brine_temp,
            ${selectViewDate},
            ${selectGroupDate}
        FROM saltern_sensor_data ssd
        JOIN 
          (
          SELECT
                sb.*,
                inv.target_category, inv.install_place, inv.serial_number, inv.amount,
                main.main_seq
          FROM seb_relation sb
          JOIN pw_relation_power rp
          ON rp.inverter_seq = sb.inverter_seq
          JOIN pw_inverter inv
          ON inv.inverter_seq = sb.inverter_seq
          JOIN main
          ON main.main_seq = rp.main_seq
          ${_.isNumber(mainSeq) ? `WHERE rp.main_seq = ${mysql.escape(mainSeq)}` : ''}
          ) sub_tbl
         ON sub_tbl.place_seq = ssd.place_seq
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
         AND ssd.place_seq IN (sub_tbl.place_seq)
         AND sub_tbl.target_category IN ('water0angle', 'earth30angle', 'earth0angle')
        GROUP BY sub_tbl.${effType}, group_date
    `;

    return this.db.single(sql, null, false);
  }
};
