const _ = require('lodash');

const mysql = require('mysql');

const { BU } = require('base-util-jh');
const moment = require('moment');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

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

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @return {Promise.<{target_category: string, install_place: string, t_amount: number, t_power_kw: number, group_date: string}[]>}
   */
  getEffReport(searchRange) {
    const { selectGroupDate, selectViewDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
      SELECT
            target_category, install_place, ROUND(SUM(amount), 2)  t_amount,
            ROUND(SUM(avg_power_kw) , 4) AS t_power_kw,
            ROUND(SUM(avg_power_kw) / SUM(amount) * 100, 2) AS module_eff,
            group_date
      FROM
        (
        SELECT 
              inv_tbl.inverter_seq, inv_tbl.target_category, inv_tbl.install_place, inv_tbl.amount, 
              inv_data.writedate,
              AVG(inv_data.power_kw) AS avg_power_kw,
              ${selectViewDate},
              ${selectGroupDate}
        FROM pw_inverter_data inv_data
        JOIN 
          (
          SELECT
            * 
          FROM pw_inverter inv
          WHERE inv.target_category IN ('100kw', 'earth30angle', 'earth0angle')
          ) inv_tbl
        ON inv_tbl.inverter_seq = inv_data.inverter_seq
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
         AND inv_data.inverter_seq IN (inv_tbl.inverter_seq)
        GROUP BY target_category, group_date, inverter_seq
        ) final
      GROUP BY target_category, group_date
    `;

    return this.db.single(sql, null, false);
  }

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @param {number=} mainSeq
   * @return {Promise.<{target_category: string, install_place: string, t_amount: number, t_power_kw: number, group_date: string}[]>}
   */
  getEnvReport(searchRange, mainSeq) {
    const { selectGroupDate, selectViewDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
        SELECT 
            ssd.place_seq, sub_tbl.seb_name, sub_tbl.target_category, sub_tbl.install_place,
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
                inv.target_category, inv.install_place, inv.amount,
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
         AND sub_tbl.target_category IN ('100kw', 'earth30angle', 'earth0angle')
        GROUP BY sub_tbl.target_category, group_date
    `;

    return this.db.single(sql, null, false);
  }
};
