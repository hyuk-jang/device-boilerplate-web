const _ = require('lodash');
const {BM} = require('base-model-jh');
const {BU} = require('base-util-jh');

require('../../../module/default-intelligence');

/**
 * @typedef {Object[]} weatherRowDataPacketList
 * @property {string} view_date 차트에 표현할 Date Format
 * @property {string} group_date 그룹 처리한 Date Format
 * @property {number} avg_sky 평균 운량
 */

class BiModule extends BM {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;
  }

  /**
   * 에러 내역
   * @param {searchRange} searchRange  검색 옵션
   * @param {number} mainSeq
   * @return {{comment: string, is_error: number}[]} SQL 실행 결과
   */
  getCalendarComment(searchRange, mainSeq) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
      SELECT
        cal.comment,
        cal.is_error,
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate}
        FROM calendar cal
        WHERE main_seq = ${mainSeq}
         AND writedate>= "${searchRange.strBetweenStart}" and writedate<"${
      searchRange.strBetweenEnd
    }"
        ORDER BY writedate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 수위
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} inverter_seq_list
   * @return {Promise} SQL 실행 결과
   */
  getWaterLevel(searchRange, inverter_seq_list) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'applydate');

    // BU.CLI(dateFormat);
    let sql = `
      SELECT
        twl.inverter_seq,
        ROUND(AVG(water_level), 1) AS water_level,
        DATE_FORMAT(applydate,'%H') AS hour_time,
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate}
        FROM temp_water_level twl
        WHERE applydate>= "${searchRange.strBetweenStart}" and applydate<"${
      searchRange.strBetweenEnd
    }"
    `;
    if (inverter_seq_list) {
      sql += `AND twl.inverter_seq IN (${inverter_seq_list})`;
    }
    sql += `
          GROUP BY ${dateFormat.firstGroupByFormat}, twl.inverter_seq
          ORDER BY twl.inverter_seq, applydate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 기상 관측 장비의 최신 데이터 1row를 가져옴.
   */
  getWeather() {
    const sql = 'SELECT * FROM weather_device_data ORDER BY writedate DESC LIMIT 1';
    return this.db.single(sql, '', false);
  }

  /**
   * 기상 계측 장치 평균을 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @return {weatherRowDataPacketList}
   */
  getWeatherDeviceAverage(searchRange) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');
    const sql = `
      SELECT
          writedate,
          ${dateFormat.selectViewDate},
          ${dateFormat.selectGroupDate},
          AVG(temp) AS avg_temp,
          AVG(reh) AS avg_reh,
          AVG(ws) AS avg_ws,
          AVG(solar) AS avg_solar,
          AVG(solar) AS avg_inclined_solar,
          ROUND(AVG(solar) / 6, 1) AS interval_solar,
          COUNT(*) AS first_count
      FROM weather_device_data wdd
      WHERE writedate>= "${searchRange.strBetweenStart}" and writedate<"${
      searchRange.strBetweenEnd
    }"
      AND DATE_FORMAT(writedate, '%H') >= '05' AND DATE_FORMAT(writedate, '%H') < '20'
      GROUP BY ${dateFormat.groupByFormat}
      ORDER BY writedate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 날씨 평균을 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @return {weatherRowDataPacketList}
   */
  getWeatherCastAverage(searchRange, weatherLocationSeq) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'applydate');
    // BU.CLI(dateFormat);
    // BU.CLI(searchRange);

    const sql = `
    SELECT main.*,
    ${dateFormat.selectViewDate},
    ${dateFormat.selectGroupDate},
    ROUND(AVG(main.scale_sky), 1) AS avg_sky
     FROM
    (
    SELECT *,
        CASE
        WHEN sky = 1 THEN 1
        WHEN sky = 2 THEN 4
        WHEN sky = 3 THEN 7
        WHEN sky = 4 THEN 9.5
        END AS scale_sky
    FROM kma_data	
    WHERE weather_location_seq = ${weatherLocationSeq}
      AND applydate>= "${searchRange.strBetweenStart}" and applydate<"${searchRange.strBetweenEnd}"
      AND DATE_FORMAT(applydate, '%H') >= '05' AND DATE_FORMAT(applydate, '%H') < '20'
    ) main
    GROUP BY ${dateFormat.groupByFormat}
    ORDER BY applydate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 접속반 기준 Module 최신 데이터 가져옴
   *
   * @param {number|Array} photovoltaic_seq Format => Number or Array or undefinded
   * @return {Promise} 최신 데이터 리스트
   */
  async getModuleStatus(photovoltaic_seq) {
    let returnValue = [];
    if (_.isNumber(photovoltaic_seq) || _.isArray(photovoltaic_seq)) {
      returnValue = await this.getTable('v_module_status', {photovoltaic_seq}, false);
      return returnValue;
    }
    returnValue = await this.getTable('v_module_status');
    return returnValue;

    // let sql = `
    //   SELECT
    //     pv.*,
    //     ru.connector_ch,
    //   curr_data.*
    //     FROM
    //     photovoltaic pv
    //     JOIN relation_power ru
    //       ON ru.photovoltaic_seq = pv.photovoltaic_seq
    //     LEFT JOIN v_dv_place vdp
    //       ON vdp.place_seq = ru.place_seq
    //     LEFT OUTER JOIN
    //     (
    //     SELECT
    //         md.photovoltaic_seq,
    //       ROUND(md.amp / 10, 1) AS amp,
    //       ROUND(md.vol / 10, 1) AS vol,
    //       md.writedate
    //   FROM module_data md
    //   INNER JOIN
    //     (
    //       SELECT MAX(module_data_seq) AS module_data_seq
    //       FROM module_data
    //       GROUP BY photovoltaic_seq
    //     ) b
    //   ON md.module_data_seq = b.module_data_seq
    //     ) curr_data
    //       ON curr_data.photovoltaic_seq = pv.photovoltaic_seq
    // `;
    // if (Number.isInteger(photovoltatic_seq)) {
    //   sql += `WHERE pv.photovoltaic_seq = (${photovoltatic_seq})`;
    // } else if (Array.isArray(photovoltatic_seq)) {
    //   sql += `WHERE pv.photovoltaic_seq IN (${photovoltatic_seq})`;
    // }
    // sql += 'ORDER BY pv.target_id';

    // return this.db.single(sql, '', false);
  }

  /**
   * 접속반 메뉴 에서 쓸 데이터
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} module_seq_list null, String, Array
   * @return {Promise} SQL 실행 결과
   */
  getConnectorPower(searchRange, module_seq_list) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    let sql = `
      SELECT
        md.photovoltaic_seq,
        ROUND(AVG(amp / 10), 1) AS amp,
        ROUND(AVG(vol / 10), 1) AS vol,
        ROUND(AVG(amp) * AVG(vol) / 100, 1) AS wh,
        DATE_FORMAT(writedate,'%H') AS hour_time,
        ${dateFormat.selectViewDate},
        pv.chart_color,
        pv.chart_sort_rank
        FROM module_data md
        LEFT OUTER JOIN photovoltaic pv
        ON pv.photovoltaic_seq = md.photovoltaic_seq        
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
    `;
    if (module_seq_list) {
      sql += `AND md.photovoltaic_seq IN (${module_seq_list})`;
    }
    sql += `
          GROUP BY ${dateFormat.firstGroupByFormat}, md.photovoltaic_seq
          ORDER BY md.photovoltaic_seq, writedate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 기상청 날씨를 가져옴
   * @param {number} weatherLocationSeq 기상청 동네 예보 위치 seq
   * @return {KMA_DATA} 날씨 정보
   */
  async getCurrWeatherCast(weatherLocationSeq) {
    const sql = `
      SELECT *, 
              ABS(CURRENT_TIMESTAMP() - applydate) AS cur_interval 
       FROM kma_data 
      WHERE weather_location_seq = ${weatherLocationSeq}
      ORDER BY cur_interval 
      LIMIT 1
    `;
    /** @type {KMA_DATA[]} */
    const weatherCastList = await this.db.single(sql, '', false);
    if (weatherCastList.length) {
      return _.head(weatherCastList);
    }
    return {};
  }

  /**
   * 검색 종류와 검색 기간에 따라 계산 후 검색 조건 객체 반환
   * @param {string} searchType min10, hour, day, month, year, range
   * @param {string} start_date '', undefined, 'YYYY', 'YYYY-MM', 'YYYY-MM-DD'
   * @param {string} end_date '', undefined, 'YYYY', 'YYYY-MM', 'YYYY-MM-DD'
   * @return {searchRange} 검색 범위
   */
  getSearchRange(searchType, start_date, end_date) {
    // BU.CLIS(searchType, start_date, end_date);
    let startDate = new Date();
    if (start_date instanceof Date) {
      startDate = start_date;
    } else if (_.isString(start_date)) {
      startDate = BU.convertTextToDate(start_date);
    }

    let endDate = startDate;
    if (end_date instanceof Date) {
      endDate = end_date;
    } else if (searchType === 'range' && end_date !== '') {
      endDate = BU.convertTextToDate(end_date);
    }
    // let endDate = searchType === 'range' && end_date !== '' ? BU.convertTextToDate(end_date) : new Date(startDate);
    let convertEndDate = null;
    // BU.CLI(BU.convertDateToText(startDate), BU.convertDateToText(endDate));
    /** @type {searchRange} */
    const returnValue = {
      searchType,
      searchInterval: searchType,
      resultGroupType: null,
      strStartDate: null, // sql writedate range 사용
      strEndDate: null, // sql writedate range 사용
      rangeStart: '', // Chart 위에 표시될 시작 날짜
      rangeEnd: '', // Chart 위에 표시될 종료 날짜
      strStartDateInputValue: '', // input에 표시될 시작 날짜
      strEndDateInputValue: '', // input에 표시될 종료 날짜
      strBetweenStart: '',
      strBetweenEnd: '',
    };

    let spliceIndex = 0;

    // 검색 시작 시분초 초기화
    startDate.setHours(0, 0, 0, 0);
    if (searchType === 'hour' || searchType === '') {
      spliceIndex = 2;
      endDate = new Date(startDate).addDays(1);
      convertEndDate = endDate;
      // 검색 종료날짜가 현재 날짜라면 시간단위로 지정
      let currDate = new Date().setHours(0, 0, 0, 0);
      currDate = new Date(currDate).addDays(1);
      if (BU.convertDateToText(currDate) === BU.convertDateToText(endDate)) {
        convertEndDate = new Date(new Date().setMinutes(0, 0, 0));
      }
    } else if (searchType === 'min' || searchType === 'min10') {
      spliceIndex = 2;
      endDate = new Date(startDate).addDays(1);
      convertEndDate = endDate;
      // 검색 종료날짜가 현재 날짜라면 시간단위로 지정
      let currDate = new Date().setHours(0, 0, 0, 0);
      currDate = new Date(currDate).addDays(1);
      if (BU.convertDateToText(currDate) === BU.convertDateToText(endDate)) {
        const fixedMinutes = Math.floor(new Date().getMinutes() * 0.1) * 10;
        convertEndDate = new Date(new Date().setMinutes(fixedMinutes, 0, 0));
      }
    } else if (searchType === 'day') {
      spliceIndex = 1;
      startDate.setDate(1);
      endDate = new Date(startDate).addMonths(1);
      convertEndDate = endDate;
    } else if (searchType === 'month') {
      spliceIndex = 0;
      startDate.setMonth(0, 1);
      endDate = new Date(startDate).addYear(1);
      convertEndDate = endDate;
    } else if (searchType === 'range') {
      spliceIndex = 2;
      // chart title에 사용될 기간을 설정
      returnValue.rangeEnd = BU.convertDateToText(endDate, 'kor', spliceIndex, 0);
      // 검색 조건 input value txt 설정
      returnValue.strEndDateInputValue = BU.convertDateToText(endDate, '', spliceIndex, 0);
      // SQL 날짜 검색에 사용할 범위를 위하여 하루 증가
      endDate = new Date(endDate).addDays(1);
      convertEndDate = endDate;
    } else if (searchType === 'fixRange') {
      returnValue.searchType = 'range';
      spliceIndex = 2;
      // chart title에 사용될 기간을 설정
      returnValue.rangeEnd = BU.convertDateToText(endDate, 'kor', spliceIndex, 0);
      // 검색 조건 input value txt 설정
      returnValue.strEndDateInputValue = BU.convertDateToText(endDate, '', spliceIndex, 0);
      // SQL 날짜 검색에 사용할 범위를 위하여 하루 증가
      convertEndDate = endDate;
    }

    returnValue.rangeStart = BU.convertDateToText(startDate, 'kor', spliceIndex, 0);
    returnValue.strStartDateInputValue = BU.convertDateToText(startDate, '', spliceIndex, 0);
    returnValue.strStartDate = BU.convertDateToText(startDate);
    returnValue.strEndDate = BU.convertDateToText(convertEndDate);

    returnValue.strBetweenStart = returnValue.strStartDate;
    returnValue.strBetweenEnd = BU.convertDateToText(endDate);
    // BU.CLI(returnValue)
    return returnValue;
  }

  /**
   * 장치 타입 종류 가져옴
   * @param {number[]} inverterSeqList 장치 타입
   */
  async getInverterList(inverterSeqList) {
    const returnValue = [];
    // deviceType = deviceType || 'all';
    // if (deviceType === 'all' || deviceType === 'inverter') {
    /** @type {INVERTER[]} */
    let inverterList = await this.getTable('inverter', {inverter_seq: inverterSeqList});
    inverterList = _.sortBy(inverterList, 'chart_sort_rank');
    _.forEach(inverterList, info => {
      returnValue.push({type: 'inverter', seq: info.inverter_seq, target_name: info.target_name});
    });
    // }
    // 인버터 이름순으로 정렬
    // returnValue = _.sortBy(returnValue, 'target_name');

    // if (deviceType === 'all' || deviceType === 'connector') {
    //   let connectorList = await this.getTable('connector');
    //   connectorList = _.sortBy(connectorList, 'chart_sort_rank');
    //   _.forEach(connectorList, info => {
    //     returnValue.push({
    //       type: 'connector',
    //       seq: info.connector_seq,
    //       target_name: info.target_name,
    //     });
    //   });
    // }
    // 모든 셀렉트 박스 정리 끝낸 후 최상단에 보일 셀렉트 박스 정의
    returnValue.unshift({
      type: 'all',
      seq: 'all',
      target_name: '전체',
    });
    return returnValue;
  }

  /**
   * 종료일과 시작일 사이의 간격을 기준으로 조회 Interval Text 구함
   * @param {String} strEndDate
   * @param {String} strStartDate
   * @return {String} searchType
   */
  convertSearchTypeWithCompareDate(strEndDate, strStartDate) {
    let searchType = '';
    const gapDate = BU.calcDateInterval(strEndDate, strStartDate);
    const sumValues = Object.values(gapDate).sum();
    if (gapDate.remainDay >= 365) {
      searchType = 'year';
    } else if (gapDate.remainDay > 29) {
      searchType = 'month';
    } else if (gapDate.remainDay > 0 && sumValues > 1) {
      searchType = 'day';
    } else {
      searchType = 'hour';
    }
    return searchType;
  }

  /**
   * searchType을 받아 dateFormat String 변환하여 반환
   * @param {string} searchType
   * @return {string} dateFormat
   */
  convertSearchType2DateFormat(searchType) {
    let dateFormat = '';
    switch (searchType) {
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'hour':
        dateFormat = '%Y-%m-%d %H';
        break;
      case 'min10':
        dateFormat = '%Y-%m-%d %H:%i';
        break;
      case 'min':
        dateFormat = '%Y-%m-%d %H:%i';
        break;
      default:
        dateFormat = '%Y-%m-%d %H:';
        break;
    }
    return dateFormat;
  }

  /**
   * searchRange Type
   * @typedef {Object} searchRange
   * @property {string} searchType day, month, year, range
   * @property {string} searchInterval min, min10, hour, day, month, year, range
   * @property {string=} resultGroupType 최종적으로 데이터를 묶을 데이터 형태 min, min10, hour, day, month, year, range
   * @property {string} strStartDate sql writedate range 사용
   * @property {string} strEndDate sql writedate range 사용
   * @property {string} rangeStart Chart 위에 표시될 시작 날짜
   * @property {string} rangeEnd Chart 위에 표시될 종료 날짜
   * @property {string} strStartDateInputValue input[type=text] 에 표시될 시작 날짜
   * @property {string} strEndDateInputValue input[type=text] 에 표시될 종료 날짜
   * @property {string} strBetweenStart static chart 범위를 표현하기 위한 시작 날짜
   * @property {string} strBetweenEnd static chart 범위를 표현하기 위한 종료 날짜
   */

  /**
   * 인버터 총 누적 발전량을 구함
   * @param {number[]=} inverter_seq_list
   */
  getInverterCumulativePower(inverter_seq_list) {
    let sql = `
      SELECT
        inverter_seq,
        ROUND(MAX(c_wh) / 10, 1) AS max_c_wh
      FROM inverter_data
      `;
    if (typeof inverter_seq_list === 'number' || Array.isArray(inverter_seq_list)) {
      sql += ` WHERE inverter_seq IN (${inverter_seq_list})`;
    }
    sql += `        
    GROUP BY inverter_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 발전량 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} inverter_seq_list
   * @return {{inverter_seq: number, group_date: string, }}
   */
  getInverterPower(searchRange, inverter_seq_list) {
    searchRange = searchRange || this.getSearchRange();
    // let dateFormat = this.convertSearchType2DateFormat(searchRange.searchType);
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');
    // BU.CLI(dateFormat);
    let sql = `
    SELECT
			main.*,
			 (SELECT iv.target_id FROM inverter iv WHERE iv.inverter_seq = main.inverter_seq LIMIT 1) AS ivt_target_id,
       ivt.chart_color, ivt.chart_sort_rank
    FROM
      (
      SELECT
        inverter_seq,
        writedate, 
        ${dateFormat.selectViewDate},
        ROUND(AVG(out_w) / 10, 1) AS out_w,
        ROUND(MAX(c_wh) / 10, 1) AS max_c_wh,
        ROUND((MAX(c_wh) - MIN(c_wh)) / 10, 1) AS interval_power
        FROM inverter_data
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
        `;
    if (Array.isArray(inverter_seq_list)) {
      sql += ` AND inverter_seq IN (${inverter_seq_list})`;
    }
    sql += `        
    GROUP BY ${dateFormat.firstGroupByFormat}, inverter_seq
    ) AS main
    LEFT OUTER JOIN inverter ivt
    ON ivt.inverter_seq = main.inverter_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 기상 관측 데이터 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @return {{view_date: string, group_date: string, avg_sm_infrared: number, avg_temp: number, avg_reh: number, avg_solar: number, total_interval_solar: number, avg_inclined_solar: number, total_interval_inclined_solar: number, avg_wd: number, avg_ws: number, avg_uv: number}[]}
   */
  getWeatherTrend(searchRange, main_seq) {
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');
    const sql = `
      SELECT
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate},
          ROUND(AVG(avg_sm_infrared), 1) AS avg_sm_infrared,
          ROUND(AVG(avg_temp), 1) AS avg_temp,
          ROUND(AVG(avg_reh), 1) AS avg_reh,
          ROUND(AVG(avg_solar), 0) AS avg_solar,
          ROUND(SUM(interval_solar), 1) AS total_interval_solar,
          ROUND(AVG(avg_inclined_solar), 0) AS avg_inclined_solar,
          ROUND(SUM(interval_inclined_solar), 1) AS total_interval_inclined_solar,
          ROUND(AVG(avg_wd), 0) AS avg_wd,	
          ROUND(AVG(avg_ws), 1) AS avg_ws,	
          ROUND(AVG(avg_uv), 0) AS avg_uv
      FROM
        (SELECT 
          writedate,
          AVG(sm_infrared) AS avg_sm_infrared,
          AVG(temp) AS avg_temp,
          AVG(reh) AS avg_reh,
          AVG(solar) AS avg_solar,
          AVG(solar) / ${dateFormat.devideTimeNumber} AS interval_solar,
          AVG(inclined_solar) AS avg_inclined_solar,
          AVG(inclined_solar) / ${dateFormat.devideTimeNumber} AS interval_inclined_solar,
          AVG(wd) AS avg_wd,	
          AVG(ws) AS avg_ws,	
          AVG(uv) AS avg_uv,
          COUNT(*) AS first_count
        FROM weather_device_data
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
        AND DATE_FORMAT(writedate, '%H') >= '05' AND DATE_FORMAT(writedate, '%H') < '20'
        AND main_seq = ${main_seq}
        GROUP BY ${dateFormat.firstGroupByFormat}) AS result_wdd
     GROUP BY ${dateFormat.groupByFormat}
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 발전량 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]} inverter_seq
   * @return {{inverter_seq: number, group_date: string, avg_in_a: number, avg_in_v: number, avg_in_w: number, avg_out_a: number, avg_out_v: number, avg_out_w: number, avg_p_f: number, max_c_wh: number, min_c_wh: number, interval_power: number, chart_color: string, chart_sort_rank: number, total_count: number}[]}
   */
  getInverterTrend(searchRange, inverter_seq) {
    // BU.CLI(searchRange);
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');
    // BU.CLI(searchRange);
    const sql = `
    SELECT 
          id_group.inverter_seq,
          ${dateFormat.selectViewDate},
          ${dateFormat.selectGroupDate},
          ROUND(AVG(avg_in_a) / 10, 1) AS avg_in_a,
          ROUND(AVG(avg_in_v) / 10, 1) AS avg_in_v,
          ROUND(AVG(avg_in_w) / 10, 1) AS avg_in_w,
          ROUND(AVG(avg_out_a) / 10, 1) AS avg_out_a,
          ROUND(AVG(avg_out_v) / 10, 1) AS avg_out_v,
          ROUND(AVG(avg_out_w) / 10, 1) AS avg_out_w,
          ROUND(AVG(avg_p_f) / 10, 1) AS avg_p_f,
          ROUND(MAX(max_c_wh) / 10, 1) AS max_c_wh,
          ROUND(MIN(min_c_wh) / 10, 1) AS min_c_wh,
          ROUND((MAX(max_c_wh) - MIN(min_c_wh)) / 10, 1) AS interval_power,
          ivt.chart_color, ivt.chart_sort_rank,
          SUM(first_count) as total_count
    FROM
      (SELECT 
              id.inverter_seq,
              writedate,
              DATE_FORMAT(writedate,"%H") AS hour_time,
              AVG(in_a) AS avg_in_a,
              AVG(in_v) AS avg_in_v,
              AVG(in_w) AS avg_in_w,
              AVG(out_a) AS avg_out_a,
              AVG(out_v) AS avg_out_v,
              AVG(out_w) AS avg_out_w,
              AVG(CASE WHEN p_f > 0 THEN p_f END) AS avg_p_f,
              MAX(c_wh) AS max_c_wh,
              MIN(c_wh) AS min_c_wh,
              COUNT(*) AS first_count
      FROM inverter_data id
            WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
    AND id.inverter_seq IN (${inverter_seq})
      GROUP BY ${dateFormat.firstGroupByFormat}, id.inverter_seq
      ORDER BY id.inverter_seq, writedate) AS id_group
      LEFT OUTER JOIN inverter ivt
      ON ivt.inverter_seq = id_group.inverter_seq
    GROUP BY id_group.inverter_seq, ${dateFormat.groupByFormat}
    `;

    return this.db.single(sql, '', false);
  }

  /**
   * 모듈 Seq List와 SearchRange 객체를 받아 Report 생성 및 반환
   * @param {Array} moduleSeqList [photovoltaic_seq]
   * @param {searchRange} searchRange getSearchRange() Return 객체
   * @return {Object[]} {betweenDatePointObj, gridPowerInfo}
   */
  getConnectorTrend(moduleSeqList, searchRange) {
    // TEST
    // endtDate = new Date('2017-11-16');
    // strEndDate = BU.convertDateToText(endtDate)
    // TEST

    // 기간 검색일 경우 시작일과 종료일의 날짜 차 계산하여 searchType 정의
    if (searchRange.searchType === 'range') {
      searchRange.searchType = this.convertSearchTypeWithCompareDate(
        searchRange.strEndDate,
        searchRange.strStartDate,
      );
    }

    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    let sql = `
      SELECT
        md_group.photovoltaic_seq,
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate},
        ROUND(SUM(avg_amp), 1) AS total_amp,
        ROUND(AVG(avg_vol), 1) AS avg_vol,
        ROUND(SUM(avg_amp) * AVG(avg_vol), 1) AS total_wh,
        pv.chart_color, pv.chart_sort_rank
        FROM
        (
        SELECT
          md.photovoltaic_seq,
          writedate,
          ROUND(AVG(amp / 10), 1) AS avg_amp,
          ROUND(AVG(vol / 10), 1) AS avg_vol,
          DATE_FORMAT(writedate,"%H") AS hour_time
          FROM module_data md
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
    `;
    if (moduleSeqList.length) {
      sql += `AND photovoltaic_seq IN (${moduleSeqList})`;
    }
    sql += `
        GROUP BY ${dateFormat.firstGroupByFormat}, photovoltaic_seq
        ORDER BY photovoltaic_seq, writedate
      ) md_group
      LEFT OUTER JOIN photovoltaic pv
        ON pv.photovoltaic_seq = md_group.photovoltaic_seq	
      GROUP BY ${dateFormat.groupByFormat}, md_group.photovoltaic_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 레포트 Date Format 자동 작성
   * @param {searchRange} searchRange
   * @param {string} dateName
   * @return {{groupByFormat: string, firstGroupByFormat: string, selectGroupDate: string, selectViewDate: string, devideTimeNumber: number}}
   */
  makeDateFormatForReport(searchRange, dateName) {
    // BU.CLI(searchRange);
    const returnValue = {
      groupByFormat: '',
      firstGroupByFormat: '',
      selectGroupDate: '',
      selectViewDate: '',
      devideTimeNumber: 1,
    };
    // BU.CLI(returnValue.selectViewDate);

    dateName = dateName == null ? 'writedate' : dateName;
    // BU.CLI(searchRange);

    // BU.CLI(dateFormat);

    // 검색 간격에 따라서 첫번째 Group Format을 정함
    if (searchRange.searchInterval === 'min') {
      returnValue.devideTimeNumber = 60;
      returnValue.firstGroupByFormat = `DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i")`;
    } else {
      returnValue.devideTimeNumber = 6;
      returnValue.firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    }

    // 최종 묶는 타입을 지정 안했다면
    let dateFormat = '';
    let finalGroupingType = '';
    if (searchRange.resultGroupType == null) {
      finalGroupingType = searchRange.searchInterval;
      dateFormat = this.convertSearchType2DateFormat(searchRange.searchInterval);
    } else {
      finalGroupingType = searchRange.resultGroupType;
      dateFormat = this.convertSearchType2DateFormat(searchRange.resultGroupType);
    }

    // 최종적으로 묶을 데이터 형태를 정의하였다면 정의한 형태로 따라가고 아니라면 검색 간격에 따라감

    if (finalGroupingType === 'min10') {
      returnValue.devideTimeNumber = 6;
      returnValue.selectGroupDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15), "0")  AS group_date`;
      returnValue.selectViewDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%H:%i"), 4), "0")  AS view_date`;
      // returnValue.firstGroupByFormat = dateFormat;
      // returnValue.firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
      returnValue.groupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    } else {
      returnValue.selectGroupDate = `DATE_FORMAT(${dateName},"${dateFormat}") AS group_date`;

      let viewFormat = dateFormat;
      // let firstGroupFormat = '%Y-%m-%d %H';
      switch (searchRange.searchType) {
        case 'min':
          viewFormat = viewFormat.slice(9, 14);
          // firstGroupFormat = '%Y-%m-%d %H:%i';
          returnValue.devideTimeNumber = 60;
          break;
        case 'hour':
          viewFormat = viewFormat.slice(9, 11);
          break;
        case 'day':
          viewFormat = viewFormat.slice(6, 8);
          break;
        case 'month':
          viewFormat = viewFormat.slice(3, 5);
          break;
        default:
          break;
      }
      returnValue.selectViewDate = `DATE_FORMAT(${dateName},"${viewFormat}") AS view_date`;
      // returnValue.firstGroupByFormat = `DATE_FORMAT(${dateName},"${firstGroupFormat}")`;
      returnValue.groupByFormat = `DATE_FORMAT(${dateName},"${dateFormat}")`;
    }
    return returnValue;
  }

  /**
   * 인버터 Report
   * @param {searchRange} searchRange getSearchRange() Return 객체
   * @param {number=|Array=} inverter_seq [inverter_seq]
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getInverterReport(searchRange, inverter_seq) {
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
    SELECT
        group_date,
        ROUND(AVG(avg_in_a) / 10, 1) AS avg_in_a,
        ROUND(AVG(avg_in_v) / 10, 1) AS avg_in_v,
        ROUND(AVG(avg_in_w) / 10, 1) AS avg_in_w,
        ROUND(AVG(avg_out_a) / 10, 1) AS avg_out_a,
        ROUND(AVG(avg_out_v) / 10, 1) AS avg_out_v,
        ROUND(AVG(avg_out_w) / 10, 1) AS avg_out_w,
        ROUND(AVG(CASE WHEN avg_p_f > 0 THEN avg_p_f END) / 10, 1) AS avg_p_f,
        ROUND(SUM(interval_power) / 1000, 2) AS total_s_kwh,
        ROUND(SUM(max_c_wh) / 1000000, 3) AS total_c_mwh
    FROM
      (SELECT
            inverter_seq,
            ${dateFormat.selectViewDate},
            ${dateFormat.selectGroupDate},
            AVG(avg_in_a) AS avg_in_a,
            AVG(avg_in_v) AS avg_in_v,
            AVG(avg_in_w) AS avg_in_w,
            AVG(avg_out_a) AS avg_out_a,
            AVG(avg_out_v) AS avg_out_v,
            AVG(avg_out_w) AS avg_out_w,
            AVG(CASE WHEN avg_p_f > 0 THEN avg_p_f END) AS avg_p_f,
            ROUND(MAX(max_c_wh) / 10, 1) AS max_c_wh,
            ROUND(MIN(min_c_wh) / 10, 1) AS min_c_wh,
            ROUND((MAX(max_c_wh) - MIN(min_c_wh)) / 10, 1) AS interval_power
      FROM
        (SELECT
              id.inverter_seq,
              writedate,
              DATE_FORMAT(writedate,"%H") AS hour_time,
              AVG(in_a) AS avg_in_a,
              AVG(in_v) AS avg_in_v,
              AVG(in_w) AS avg_in_w,
              AVG(out_a) AS avg_out_a,
              AVG(out_v) AS avg_out_v,
              AVG(out_w) AS avg_out_w,
              AVG(CASE WHEN p_f > 0 THEN p_f END) AS avg_p_f,
              MAX(c_wh) AS max_c_wh,
              MIN(c_wh) AS min_c_wh
        FROM inverter_data id
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
      AND inverter_seq IN (${inverter_seq})
        GROUP BY ${dateFormat.firstGroupByFormat}, inverter_seq
        ORDER BY inverter_seq, writedate) AS id_group
      GROUP BY inverter_seq, ${dateFormat.groupByFormat}) AS id_report
    GROUP BY group_date
    ORDER BY group_date ASC
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성
    const mainQuery = `${sql}\n LIMIT ${(searchRange.page - 1) * searchRange.pageListCount}, ${
      searchRange.pageListCount
    }`;

    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 경보 페이지. 인버터 접속반 둘다 가져옴.
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} inverterSeqList 인버터 seq 목록
   * @param {number[]} connectorSeqList 접속반 seq 목록
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReport(errorStatus, searchRange, inverterSeqList, connectorSeqList) {
    let sql = `
      SELECT trouble_list.* 
        FROM
        ( 
          SELECT itd_list.*
          FROM
            (SELECT 
                itd.inverter_seq AS device_seq,
                itd.is_error AS is_error,
                itd.code AS code,
                itd.msg AS msg,
                itd.occur_date AS occur_date,
                itd.fix_date AS fix_date,
                ivt.target_name AS target_name,
                'inverter' AS device_e_name,
                '인버터' AS device_k_name
            FROM
              (SELECT * FROM inverter_trouble_data
                WHERE inverter_seq IN (${inverterSeqList})
                  AND occur_date>= "${searchRange.strStartDate}" 
                  AND occur_date<"${searchRange.strEndDate}"
                `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
              ) AS itd
            JOIN inverter ivt
              ON ivt.inverter_seq = itd.inverter_seq ) AS itd_list
          UNION
          SELECT ctd_list.*
          FROM
            (SELECT 
                ctd.connector_seq AS device_seq,
                ctd.is_error AS is_error,
                ctd.code AS code,
                ctd.msg AS msg,
                ctd.occur_date AS occur_date,
                ctd.fix_date AS fix_date,
                cnt.target_name AS target_name,
                'connector' AS device_e_name,
                '접속반' AS device_k_name
            FROM
              (SELECT * FROM connector_trouble_data
                WHERE connector_seq IN (${connectorSeqList})
                  AND occur_date>= "${searchRange.strStartDate}" 
                  AND occur_date<"${searchRange.strEndDate}"
                `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
              ) AS ctd
            JOIN connector cnt
              ON cnt.connector_seq = ctd.connector_seq 
            ) AS ctd_list
        ) AS trouble_list
        ORDER BY trouble_list.occur_date DESC
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${(searchRange.page - 1) * searchRange.pageListCount}, ${
      searchRange.pageListCount
    }`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 인버터 에러만 가져옴
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} inverterSeqList
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReportForInverter(errorStatus, searchRange, inverterSeqList) {
    let sql = `
        SELECT 
            itd.inverter_seq AS device_seq,
            itd.is_error AS is_error,
            itd.code AS code,
            itd.msg AS msg,
            itd.occur_date AS occur_date,
            itd.fix_date AS fix_date,
            ivt.target_name AS target_name,
            'inverter' AS device_e_name,
            '인버터' AS device_k_name
        FROM
          (SELECT * FROM inverter_trouble_data
            WHERE inverter_seq IN (${inverterSeqList})
              AND occur_date>= "${searchRange.strStartDate}"
              AND occur_date<"${searchRange.strEndDate}"
            `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
            ) AS itd
        JOIN inverter ivt
          ON ivt.inverter_seq = itd.inverter_seq
        ORDER BY itd.occur_date DESC	
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${(searchRange.page - 1) * searchRange.pageListCount}, ${
      searchRange.pageListCount
    }`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 인버터 에러만 가져옴
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} connectorSeqList 접속반 Seq 목록
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReportForConnector(errorStatus, searchRange, connectorSeqList) {
    let sql = `
        SELECT 
            ctd.connector_seq AS device_seq,
            ctd.is_error AS is_error,
            ctd.code AS code,
            ctd.msg AS msg,
            ctd.occur_date AS occur_date,
            ctd.fix_date AS fix_date,
            cnt.target_name AS target_name,
            'connector' AS device_e_name,
            '접속반' AS device_k_name
        FROM
            (SELECT * FROM connector_trouble_data
              WHERE connector_seq IN (${connectorSeqList})
                AND occur_date>= "${searchRange.strStartDate}" 
                AND occur_date<"${searchRange.strEndDate}"
              `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
            ) AS ctd
        JOIN connector cnt
          ON cnt.connector_seq = ctd.connector_seq 
        ORDER BY ctd.occur_date DESC	
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${(searchRange.page - 1) * searchRange.pageListCount}, ${
      searchRange.pageListCount
    }`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 접속반, Relation, trend를 융합하여 chart data 를 뽑아냄
   * @param {Object} connectorInfo
   * @param {Array} upsasProfile
   * @param {Array} moduleReportList
   */
  processModuleReport(upsasProfile, moduleReportList, searchRange) {
    // BU.CLI('processTrendByConnector', searchRange)
    // 트렌드를 구할 모듈 정보 초기화
    const trendReportList = [];

    // 모듈 기본정보 입력
    _.forEach(moduleReportList.gridPowerInfo, (moduleDataList, moduleSeq) => {
      // BU.CLI(moduleSeq)
      const findProfile = _.find(upsasProfile, {
        photovoltaic_seq: Number(moduleSeq),
      });
      // BU.CLI(findProfile)
      const trendReportObj = {};
      trendReportObj.id = `id_${moduleSeq}`;
      trendReportObj.name = `CH_${findProfile.connector_ch} ${findProfile.pv_target_name}`;
      trendReportObj.group_date = moduleReportList.betweenDatePointObj.fullTxtPoint;
      trendReportObj.data = [];

      moduleReportList.betweenDatePointObj.fullTxtPoint.forEach(strDateFormat => {
        // BU.CLIS(strDateFormat, moduleDataList)
        const findGridObj = _.find(moduleDataList, {
          group_date: strDateFormat,
        });

        // BU.CLI(findGridObj)
        const data = _.isEmpty(findGridObj)
          ? ''
          : this.convertValueBySearchType(searchRange.searchType, findGridObj.total_wh);
        trendReportObj.data.push(data);
      });
      trendReportList.push(trendReportObj);
    });

    // BU.CLI(trendReportList);

    const chartDecorationInfo = this.makeChartDecorator(searchRange);
    // BU.CLI('moudlePowerReport', moudlePowerReport);
    return {
      hasData: !_.isEmpty(moduleReportList.gridPowerInfo),
      columnList: moduleReportList.betweenDatePointObj.shortTxtPoint,
      chartDecorationInfo,
      series: trendReportList,
    };
  }

  /**
   *
   * @param {String} searchType
   * @param {Number} number
   */
  convertValueBySearchType(searchType, number) {
    // BU.CLI('convertValueBySearchType', searchType, number)
    let returnValue = 0;
    switch (searchType) {
      case 'year':
        returnValue = (number / 1000 / 1000).toFixed(4);
        break;
      case 'month':
        returnValue = (number / 1000).toFixed(3);
        break;
      case 'day':
        returnValue = (number / 1000).toFixed(3);
        break;
      case 'hour':
      default:
        returnValue = number;
        break;
    }
    return Number(returnValue);
  }

  makeChartDecorator(searchRange) {
    let mainTitle = '';
    let xAxisTitle = '';
    let yAxisTitle = '';
    switch (searchRange.searchType) {
      case 'year':
        xAxisTitle = '시간(년)';
        yAxisTitle = '발전량(MWh)';
        break;
      case 'month':
        xAxisTitle = '시간(월)';
        yAxisTitle = '발전량(kWh)';
        break;
      case 'day':
        xAxisTitle = '시간(일)';
        yAxisTitle = '발전량(kWh)';
        break;
      case 'hour':
        xAxisTitle = '시간(시)';
        yAxisTitle = '발전량(wh)';
        break;
      default:
        break;
    }

    if (searchRange.rangeEnd !== '') {
      mainTitle = `[ ${searchRange.rangeStart} ~ ${searchRange.rangeEnd} ]`;
    } else {
      mainTitle = `[ ${searchRange.rangeStart} ]`;
    }
    return {
      mainTitle,
      xAxisTitle,
      yAxisTitle,
    };
  }
}
module.exports = BiModule;
