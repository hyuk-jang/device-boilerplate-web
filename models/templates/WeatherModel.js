const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
// const Promise = require('bluebird');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

class WeatherModel extends BiModule {
  /**
   * 수위
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} inverter_seq_list
   * @return {Promise} SQL 실행 결과
   */
  getWaterLevel(searchRange, inverter_seq_list) {
    searchRange = searchRange || this.createSearchRange();
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
        WHERE applydate>= "${searchRange.strBetweenStart}" and applydate<"${searchRange.strBetweenEnd}"
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
   * 테스트 수행 여부, 수위, 일사량, 온도, 운량 등을 달력을 생성하기 위한 데이터로 반환
   * @param {V_MEMBER} userInfo
   * @return {{title: string, color: string, start: string}[]} title: 내용, color: 배경 색상, start: 시작 날짜
   */
  async getCalendarEventList(userInfo) {
    const startDate = moment().subtract(1, 'years').format();
    const endDate = new Date(moment().format());
    const searchRange = this.createSearchRange('fixRange', startDate, endDate);
    searchRange.searchInterval = 'min10';
    searchRange.resultGroupType = 'day';

    const weatherTrendList = await this.getWeatherTrend(searchRange, userInfo.main_seq);
    // BU.CLI(weatherTrendList);
    // 수위는 수중 일반(단) 기준으로 가져옴
    const waterLevelList = await this.getWaterLevel(searchRange, 4);
    // BU.CLI(waterLevelList);

    const weatherCastList = await this.getWeatherCastAverage(
      searchRange,
      userInfo.weather_location_seq,
    );
    // BU.CLI(weatherCastList);
    const calendarCommentList = await this.getCalendarComment(
      searchRange,
      userInfo.main_seq,
    );
    // BU.CLI(calendarCommentList);

    /** @type {{title: string, start: string, color: string=}[]} */
    const calendarEventList = [];

    calendarCommentList.forEach(currentItem => {
      const event = {
        title: '',
        start: currentItem.group_date,
      };

      if (currentItem.is_error) {
        if (currentItem.is_error === 1) {
          event.title = '▶ 테스트 X:';
          event.color = '#fd4b0b';
        } else if (currentItem.is_error === 2) {
          event.title = '▶ 테스트 X: 비';
          event.color = '#347ab7';
          // let addEvent = {
          //   start: currentItem.group_date,
          //   rendering: 'background',
          //   color: 'red'
          // };
          // calendarEventList.push(addEvent);
        }
      } else {
        event.title = '▶ 테스트 O';
        event.color = '#2196f3';
      }

      const comment = _.get(currentItem, 'comment');
      if (comment !== null && comment !== '') {
        event.title += `\n  ${comment}`;
      }

      calendarEventList.push(event);
    });

    waterLevelList.forEach(currentItem => {
      const event = {
        title: `수위: ${currentItem.water_level}`,
        start: currentItem.group_date,
        color: '#9e9e9e',
      };
      calendarEventList.push(event);
    });

    weatherCastList.forEach(currentItem => {
      const event = {
        title: `운량: ${currentItem.avg_sky}`,
        start: currentItem.group_date,
        color: '#9e9e9e',
      };
      calendarEventList.push(event);
    });

    weatherTrendList.forEach(currentItem => {
      let event = {
        title: `일사량: ${currentItem.total_interval_solar}`,
        start: currentItem.group_date,
        color: '#9e9e9e',
      };
      calendarEventList.push(event);

      event = {
        title: `온도: ${currentItem.avg_temp}`,
        start: currentItem.group_date,
        color: '#9e9e9e',
      };
      calendarEventList.push(event);
    });
    return calendarEventList;
  }

  /**
   * 기상청 날씨를 가져옴
   * @param {number} weatherLocationSeq 기상청 동네 예보 위치 seq
   * @return {WC_KMA_DATA} 날씨 정보
   */
  async getCurrWeatherCast(weatherLocationSeq) {
    const sql = `
      SELECT *, 
              ABS(CURRENT_TIMESTAMP() - applydate) AS cur_interval 
       FROM wc_kma_data 
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
   * 기상청 현재시간 기준 오늘, 내일, 모레 날씨를 가져옴
   * @param {number} weatherLocationSeq 기상청 동네 예보 위치 seq
   * @return {WC_KMA_DATA} 날씨 정보
   */
  async getWeatherCast(weatherLocationSeq) {
    const sql = `
      SELECT *
      FROM wc_kma_data 
      WHERE weather_location_seq = ${weatherLocationSeq}
      AND applydate > DATE_FORMAT(NOW(), '%Y-%m-%d %H')
    `;
    /** @type {KMA_DATA[]} */
    const weatherCastList = await this.db.single(sql, '', false);
    if (weatherCastList.length) {
      return weatherCastList;
    }
    return {};
  }

  /**
   * 기상 관측 데이터 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @return {{view_date: string, group_date: string, avg_sm_infrared: number, avg_temp: number, avg_reh: number, avg_solar: number, total_interval_solar: number, avg_inclined_solar: number, total_interval_inclined_solar: number, avg_wd: number, avg_ws: number, avg_uv: number}[]}
   */
  getWeatherTrend(searchRange, mainSeq) {
    // const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    // BU.CLI(searchRange);
    const {
      firstGroupByFormat,
      selectGroupDate,
      selectViewDate,
      groupByFormat,
      divideTimeNumber,
    } = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    const sql = `
      SELECT
            main_seq,
            ${selectViewDate},
            ${selectGroupDate},
            ROUND(AVG(avg_sm_infrared), 1) AS avg_sm_infrared,
            ROUND(AVG(avg_temp), 1) AS avg_temp,
            ROUND(AVG(avg_reh), 1) AS avg_reh,
            ROUND(AVG(avg_solar), 0) AS avg_solar,
            ROUND(SUM(interval_solar), 1) AS total_interval_solar,
            ROUND(AVG(avg_inclined_solar), 0) AS avg_inclined_solar,
            ROUND(SUM(interval_inclined_solar), 1) AS total_interval_inclined_solar,
            ROUND(AVG(avg_wd), 0) AS avg_wd,	
            ROUND(AVG(avg_ws), 1) AS avg_ws,	
            ROUND(AVG(avg_uv), 0) AS avg_uv,
            ROUND(AVG(avg_rain_h), 0) AS avg_rain_h
      FROM
        (SELECT 
                main_seq,
                writedate,
                AVG(sm_infrared) AS avg_sm_infrared,
                AVG(temp) AS avg_temp,
                AVG(reh) AS avg_reh,
                AVG(solar) AS avg_solar,
                AVG(solar) / ${divideTimeNumber} AS interval_solar,
                AVG(inclined_solar) AS avg_inclined_solar,
                AVG(inclined_solar) / ${divideTimeNumber} AS interval_inclined_solar,
                AVG(wd) AS avg_wd,	
                AVG(ws) AS avg_ws,	
                AVG(uv) AS avg_uv,
                AVG(rain_h) AS avg_rain_h,
                COUNT(*) AS first_count
        FROM weather_device_data
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${_.isNumber(mainSeq) ? ` AND main_seq = ${mainSeq} ` : ''}
        GROUP BY ${firstGroupByFormat}, main_seq
        ) AS result_wdd
        GROUP BY ${groupByFormat}, main_seq
        `;
    return this.db.single(sql, '', false);
    // AND DATE_FORMAT(writedate, '%H') >= '05' AND DATE_FORMAT(writedate, '%H') < '20'
  }

  /**
   * 에러 내역
   * @param {searchRange} searchRange  검색 옵션
   * @param {number} mainSeq
   * @return {{comment: string, is_error: number}[]} SQL 실행 결과
   */
  getCalendarComment(searchRange, mainSeq) {
    searchRange = searchRange || this.createSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
      SELECT
        cal.comment,
        cal.is_error,
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate}
        FROM calendar cal
        WHERE main_seq = ${mainSeq}
         AND writedate>= "${searchRange.strBetweenStart}" and writedate<"${searchRange.strBetweenEnd}"
        ORDER BY writedate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 기상 관측 장비의 최신 데이터 1row를 가져옴.
   */
  async getWeatherDeviceRow() {
    const sql = 'SELECT * FROM weather_device_data ORDER BY writedate DESC LIMIT 1';
    const rows = await this.db.single(sql, '', false);
    if (rows.length) {
      return _.head(rows);
    }
    return {};
  }

  /**
   * 기상 계측 장치 평균을 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @param {number} mainSeq
   * @return {weatherRowDataPacketList}
   */
  getWeatherDeviceAverage(searchRange, mainSeq) {
    const {
      selectGroupDate,
      selectViewDate,
      firstGroupByFormat,
      groupByFormat,
    } = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    const sql = `
      SELECT
            main_seq,
            ${selectViewDate},
            ${selectGroupDate},
            ROUND(AVG(temp), 1) AS avg_temp,
            ROUND(AVG(reh), 1) AS avg_reh,
            ROUND(AVG(ws), 1) AS avg_ws,
            ROUND(AVG(solar), 1) AS avg_solar,
            ROUND(AVG(inclined_solar), 1) AS avg_inclined_solar,
            ROUND(AVG(uv), 0) AS avg_uv
      FROM
        weather_device_data wdd
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${_.isNumber(mainSeq) ? ` AND main_seq = ${mainSeq} ` : ''}
      GROUP BY ${firstGroupByFormat}, main_seq
      ORDER BY main_seq, writedate
      `;
    return this.db.single(sql, '', false);
  }

  /**
   * 해당 지역 위치값을 가져옴
   * @param {number} weatherLocationSeq
   * @return {WC_WEATHER_LOCATION}
   */
  getWeatherLocation(weatherLocationSeq) {
    const sql = `
      SELECT
          *
      FROM wc_weather_location
      WHERE weather_location_seq = "${weatherLocationSeq}"
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 기상 관측 차트 반환
   * @param {searchRange} searchRange
   * @param {{fullTxtPoint: [], shortTxtPoint: []}} betweenDatePoint
   * @param {number} main_seq Main 시퀀스
   */
  async getWeatherChart(searchRange, betweenDatePoint, main_seq) {
    const weatherTrend = await this.getWeatherTrend(searchRange, main_seq);
    webUtil.calcScaleRowDataPacket(weatherTrend, searchRange, ['total_interval_solar']);

    let weatherChartOptionList = [
      {
        name: '수평 일사량(W/m²)',
        color: 'red',
        yAxis: 1,
        selectKey: 'avg_solar',
        dateKey: 'group_date',
      },
      {
        name: '경사 일사량(W/m²)',
        color: 'brown',
        yAxis: 1,
        selectKey: 'avg_inclined_solar',
        dateKey: 'group_date',
      },
      {
        name: '기온(℃)',
        color: 'green',
        yAxis: 1,
        selectKey: 'avg_temp',
        maxKey: 'avg_temp',
        minKey: 'avg_temp',
        averKey: 'avg_temp',
        dateKey: 'group_date',
      },
    ];

    const weatherChartData = {
      range: betweenDatePoint.shortTxtPoint,
      series: [],
    };

    weatherChartOptionList.forEach(chartOption => {
      const staticChart = webUtil.makeStaticLineChart(
        weatherTrend,
        betweenDatePoint,
        chartOption,
      );
      const chart = _.head(staticChart.series);
      chart.name = chartOption.name;
      chart.color = chartOption.color;
      chart.yAxis = chartOption.yAxis;

      weatherChartData.series.push(chart);
    });

    const addWeatherChartOptionList = [
      {
        name: '풍향',
        color: 'brown',
        yAxis: 0,
        selectKey: 'avg_wd',
        dateKey: 'group_date',
      },
      {
        name: '풍속(m/s)',
        color: 'purple',
        yAxis: 0,
        selectKey: 'avg_ws',
        dateKey: 'group_date',
      },
      {
        name: '습도(%)',
        color: 'pink',
        yAxis: 0,
        selectKey: 'avg_reh',
        dateKey: 'group_date',
      },
      // { name: '자외선(uv)', color: 'skyblue', yAxis:0, selectKey: 'avg_uv', dateKey: 'group_date'},
    ];

    weatherChartOptionList = weatherChartOptionList.concat(addWeatherChartOptionList);

    // BU.CLI(chartData);
    return {
      weatherChartData,
      weatherTrend,
      weatherChartOptionList,
    };
  }
}
module.exports = WeatherModel;
