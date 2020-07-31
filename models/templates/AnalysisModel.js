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

const abnormalStatus = {
  NORMAL: 0,
  CAUTION: 1,
  WARNING: 2,
};

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
   * @param {string[]=} option.colorTable 색상 테이블
   * @param {Object} option.mergeInfo 2차 병합이 필요할 경우
   * @param {string=} option.mergeInfo.mergeKey 데이터 병합할 Key
   * @param {string=} option.mergeInfo.mergeType AVG, SUM, MAX
   */
  makePowerEfficiencyChart(powerEffRows, option) {
    const {
      dataKey,
      dateKey = 'group_date',
      groupKey = 'install_place',
      sortKey = 'chart_sort_rank',
      nameKeys = [groupKey],
      colorTable = ['greenyellow', 'violet', 'lightskyblue', 'aliceblue'],
    } = option;

    return _.chain(powerEffRows)
      .groupBy(groupKey)
      .map(powerRows => {
        return {
          sortIndex: powerRows[0][sortKey],
          name: nameKeys.map(nKey => powerRows[0][nKey]).join(' '),
          data: powerRows.map(row => [commonUtil.convertDateToUTC(row[dateKey]), row[dataKey]]),
        };
      })
      .sortBy('sortIndex')
      .forEach((chartData, index) => {
        chartData.color = colorTable[index];
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

  /**
   *
   * @param {Object} angleInfo
   * @param {number=} angleInfo.angle 알고싶은 각도. Default 30도.
   * @param {string} angleInfo.measureDate 계측 날짜
   */
  getSolarLossRate(angleInfo) {
    const { angle = 30, measureDate } = angleInfo;
    const solarLossList = [
      { a30: 104.2, a0: 72.41 },
      { a30: 113.06, a0: 86.49 },
      { a30: 142.23, a0: 123.57 },
      { a30: 153.5, a0: 149.11 },
      { a30: 155.78, a0: 163.97 },
      { a30: 135.95, a0: 147.61 },
      { a30: 130.71, a0: 139.99 },
      { a30: 148.48, a0: 150.29 },
      { a30: 135.97, a0: 125.12 },
      { a30: 142.97, a0: 114.2 },
      { a30: 107.04, a0: 76.98 },
      { a30: 92.8, a0: 63.6 },
    ];

    const { a0, a30 } = solarLossList[BU.convertTextToDate(measureDate).getMonth()];

    switch (angle) {
      // 수평 일사량 대비 30도 일 경우 일사량 감소율
      case 30:
        return a30 / a0;
      default:
        return 1;
    }
  }

  /**
   * 수심에 따른 광량 감소
   * @param {number} waterLevel
   */
  getWaterLevelLossRate(waterLevel) {
    let waterLevelLossRate = 1;
    switch (waterLevel) {
      case 2:
        waterLevelLossRate = 0.9554;
        break;
      default:
        waterLevelLossRate = 0.9554;
        break;
    }
    return waterLevelLossRate;
  }

  /**
   *
   * @param {V_GENERAL_ANALYSIS[]} generalAnalysisRows
   * @param {Object} regressionAnalysisInfo 회귀 분석 값
   * @param {number} regressionAnalysisInfo.setWaterLevel 설정 수위
   * @param {number} regressionAnalysisInfo.regressionB1 회귀 분석 값
   * @param {number} regressionAnalysisInfo.regressionB2 회귀 분석 값
   * @param {number} regressionAnalysisInfo.regressionB3 회귀 분석 값
   * @param {number} regressionAnalysisInfo.regressionK 보정계수 K
   */
  refineGeneralAnalysis(generalAnalysisRows, regressionAnalysisInfo = {}) {
    const {
      setWaterLevel,
      regressionB1 = 0.945,
      regressionB2 = 11.2,
      regressionB3 = -0.19,
      regressionK = 0.88,
    } = regressionAnalysisInfo;
    const betaRef = 0.0025;
    const tRef = 25;

    const dustLossRate = 0.95;
    generalAnalysisRows.forEach(row => {
      _.isNumber(setWaterLevel) && (row.avg_water_level = setWaterLevel);

      const {
        avg_temp: outdoorTemp,
        avg_water_level: waterLevel,
        group_date: groupDate,
        // 추가 손실률(0~1) 0: 손실률 0%, 1: 손실률 100%
        add_loss_rate: addLossRate = 0,
        // 표준 모듈 효율(%)
        module_efficiency: moduleEff,
        // 모듈 총 면적
        module_square: moduleSquare,
        // 실측 발전량
        t_power_kw: realPower,
      } = row;

      let {
        avg_horizontal_solar: horizontalSolar,
        // avg_inclined_solar: inclinedSolar,
      } = row;
      // kW로 변환
      horizontalSolar = (horizontalSolar * regressionK) / 1000;

      // 수중 모듈 온도 예측 치
      const preWaterModuleTemp =
        regressionB1 * outdoorTemp + regressionB2 * horizontalSolar + regressionB3;

      // 수위에 따른 모듈 효율 감소
      let lossWaterLevel = 0.0008 * waterLevel ** 2 - 0.023 * waterLevel + 0.9991;

      lossWaterLevel = lossWaterLevel > 0.99 ? 1 : lossWaterLevel;

      const lossCleanliness = waterLevel > 2 ? 1.09 - 0.0456 * waterLevel : 1;

      // 수중 태양광 발전 효율 예측
      const preWaterPowerEff = moduleEff * (1 - betaRef * (preWaterModuleTemp - tRef));

      // 수중 태양광 발전량 예측
      const preWaterPowerKw =
        (preWaterPowerEff *
          horizontalSolar *
          lossCleanliness *
          lossWaterLevel *
          (1 - addLossRate / 100) *
          moduleSquare) /
        100;

      // 오차율
      const waterPowerlossRate = (1 - realPower / preWaterPowerKw) * 100;

      // 육상 모듈 온도 예측 치
      const preEarthModuleTemp =
        0.98 * outdoorTemp * this.getSolarLossRate({ measureDate: groupDate }) +
        34 * horizontalSolar;
      // 육상 태양광 발전 효율 예측
      const preEarthPowerEff =
        moduleEff * (1 - betaRef * (outdoorTemp + 34 * horizontalSolar - tRef));
      // 육상 태양광 발전량 예측
      const preEarthPowerKw =
        0.98 * outdoorTemp * this.getSolarLossRate({ measureDate: groupDate }) +
        34 * horizontalSolar;

      // 수위에 따른 손실
      row.lossWaterLevelRate = _.round((1 - lossWaterLevel) * 100, 4);
      // 청정도 손실
      row.lossCleanlinessRate = _.round((1 - lossCleanliness) * 100, 4);
      // 모듈 온도 손실률
      row.lossModuleTempRate = _.round((1 - preWaterPowerEff / moduleEff) * 100, 4);

      // 수중 태양광 발전 오차율
      row.waterPowerlossRate = waterPowerlossRate;

      row.preWaterModuleTemp = _.round(preWaterModuleTemp, 4);
      row.preEarthModuleTemp = _.round(preEarthModuleTemp, 4);
      row.preWaterPowerEff = _.round(preWaterPowerEff, 4);
      row.preWaterPowerKw = _.round(preWaterPowerKw, 4);
      row.preEarthPowerEff = _.round(preEarthPowerEff, 4);
      row.preEarthPowerKw = _.round(preEarthPowerKw, 4);
    });
  }

  /**
   * 손실저하 요인 분석 Table Rows 생성
   * @param {V_GENERAL_ANALYSIS} generalAnalysisRows
   * @param {number} regressionK 보정계수 K
   */
  makeLossAnalysisReport(generalAnalysisRows, regressionK) {
    return _.chain(generalAnalysisRows)
      .groupBy('view_date')
      .map((rows, gDate) => {
        // 모듈온도 손실
        const lossModuleTempRate = _.meanBy(rows, 'lossModuleTempRate');
        // 염수 청정도 손실
        const lossCleanlinessRate = _.meanBy(rows, 'lossCleanlinessRate');
        // 수위 손실
        const lossWaterLevelRate = _.meanBy(rows, 'lossWaterLevelRate');
        // 예측 모듈 온도
        const preWaterModuleTemp = _.meanBy(rows, 'preWaterModuleTemp');
        // 예측 발전
        const prePower = _.sumBy(rows, 'preWaterPowerKw');
        // 실측 발전
        const realPower = _.sumBy(rows, 't_power_kw');
        // 발전 비율
        const powerRatio = _.meanBy(rows, 'avg_power_ratio');
        // 오차율
        const lossRate = (1 - realPower / prePower) * 100;

        // 일사량
        const avgSolar = _.meanBy(rows, 'avg_horizontal_solar');
        // 수위
        const avgWaterLevel = _.meanBy(rows, 'avg_water_level');
        // 모듈 온도
        const avgModuleTemp = _.meanBy(rows, 'avg_module_rear_temp');
        // 수온
        const avgBrineTemp = _.meanBy(rows, 'avg_brine_temp');

        // 인버터 운전 손실
        const lossInvRate = 100 - _.meanBy(rows, 'avg_power_factor');
        // 모듈 노후화 손실
        const lossAgingRate = 0.36;
        // 어레이 미스매치 손실
        const lossMissMatchRate = 2;
        // 잔여 손실률
        const lossPointRate =
          (1 - regressionK) * 100 - lossInvRate - lossAgingRate - lossMissMatchRate;
        // 손실 발생 유무
        const isOccurLoss = _.isNaN(lossRate);

        // 0: 정상(흰색), 1: 주의(노랑색), 2: 경고(빨간색)
        let inverterAbnormalStatus = abnormalStatus.NORMAL;

        // 일사량 500, 수위 1cm 이상, 발전량 오차율 10% 이상 --> 출력 이상
        if (avgSolar > 500 && avgWaterLevel > 1) {
          if (lossRate > 20) {
            inverterAbnormalStatus = abnormalStatus.WARNING;
          } else if (lossRate > 10) {
            inverterAbnormalStatus = abnormalStatus.CAUTION;
          }
        }

        const returnInfo = {
          // 모듈온도 손실
          lossModuleTempRate,
          // 수위 손실
          lossWaterLevelRate,
          // 청정도 손실
          lossCleanlinessRate,
          // 예측 모듈 온도
          preWaterModuleTemp,
          // 예측 발전
          prePower,
          // 실측 발전
          realPower,
          // 발전 비율
          powerRatio,
          // 손실률
          lossRate: isOccurLoss ? 0 : lossRate,
          // 일사량
          avgSolar,
          // 수위
          avgWaterLevel,
          // 모듈 온도
          avgModuleTemp,
          // 모듈 온도 오차
          moduleTempLoss: avgModuleTemp - preWaterModuleTemp,
          // 수온
          avgBrineTemp,

          // 인버터 운전 손실
          lossInvRate: isOccurLoss ? 0 : lossInvRate,
          // 모듈 노후화 손실
          lossAgingRate: isOccurLoss ? 0 : lossAgingRate,
          // 어레이 미스매치 손실
          lossMissMatchRate: isOccurLoss ? 0 : lossMissMatchRate,
          // 손실 계수
          lossPointRate: isOccurLoss ? 0 : lossPointRate,
          // 인버터 출력 이상 상태
          inverterAbnormalStatus,
        };
        // 숫자 소수점 처리
        _.forEach(returnInfo, (v, k) => {
          returnInfo[k] = _.isNaN(v) ? v : _.round(v, 2);
        });
        // 날짜 병합
        Object.assign(returnInfo, { gDate });

        return returnInfo;
      })
      .filter(row => {
        // 일사량이 100 이상이거나 발전비가 1% 이상일 경우 필터링
        return row.avgSolar > 100 || row.powerRatio > 1;
      })
      .sortBy('gDate')
      .value();
  }

  /**
   * 발전 분석 개요
   * @param {Object} summaryInfo
   * @param {V_GENERAL_ANALYSIS} summaryInfo.generalAnalysisRows
   * @param {Object} summaryInfo.weatherTrendRows
   */
  makeAnalysisReport(summaryInfo) {
    const { generalAnalysisRows, weatherTrendRows } = summaryInfo;
    // TODO: 특정 시점 순간의 search 값 필요
    const selectedSearchDate = _.get(_.last(weatherTrendRows), 'group_date');

    const systemList = _.chain(generalAnalysisRows)
      .filter(row => row.group_date === selectedSearchDate)
      .map(row => {
        const {
          install_place: ip,
          serial_number: sn,
          avg_water_level: waterLevel,
          avg_module_rear_temp: moduleTemp,
          avg_brine_temp: brineTemp,
          t_power_kw: powerKw,
          preWaterModuleTemp: preModuleTemp,
          preWaterPowerKw: prePowerKw,
        } = row;

        return {
          name: `${ip} ${sn}`,
          waterLevel: _.round(waterLevel, 2),
          moduleTemp: _.round(moduleTemp, 2),
          brineTemp: _.round(brineTemp, 2),
          powerKw: _.round(powerKw, 2),
          // Predict
          preModuleTemp: _.round(preModuleTemp, 2),
          prePowerKw: _.round(prePowerKw, 2),
          //
          repPowerErrRate: _.round((powerKw / prePowerKw) * 100, 2),
          repModuleTempErrRate: _.round((moduleTemp / preModuleTemp) * 100, 2),
        };
      })
      .value();

    let analysisReport = {};

    //
    try {
      const { avg_temp: outdoorTemp, avg_solar: solar } = weatherTrendRows.find(
        row => row.group_date === selectedSearchDate,
      );
      analysisReport = {
        envInfo: {
          solar,
          outdoorTemp,
        },
        systemList,
      };
    } catch (error) {
      analysisReport = {
        envInfo: {
          solar: null,
          outdoorTemp: null,
        },
        systemList,
      };
    }

    return analysisReport;
  }

  /* ****************************************************
   ********                 SQL
   **************************************************** */

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @param {string=} effType 검색 조건. target_category or inverter_seq
   * @param {number[]=} inverterSeqList 인버터 seq 목록
   * @return {Promise.<{inverter_seq: number, target_category: string, install_place: string, chart_sort_rank: number, t_amount: number, t_power_kw: number, t_interval_power_cp_kwh: number, powerTime: number, peak_power_eff: number, group_date: string}[]>}
   * @example
   * effType: target_category = 육상 0도, 육상 30도, 수중 0도
   * effType: inverter_seq = 육상 0도(A~B), 육상 30도(A~B), 수중 0도(A~D)
   */
  getPowerEffReport(searchRange, effType = 'target_category', inverterSeqList = []) {
    const { selectGroupDate, selectViewDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
      SELECT
            inverter_seq, serial_number, target_category, install_place, chart_sort_rank, 
            SUM(amount) t_amount,
            SUM(avg_power_kw) AS t_power_kw,
            SUM(avg_power_kw) / SUM(amount) * 100 AS avg_power_eff,
            MAX(peak_power_eff) AS peak_power_eff,            
            SUM(interval_power_cp_kwh) AS t_interval_power_cp_kwh,
            SUM(interval_power_cp_kwh) / SUM(amount) AS powerTime,
            group_date
      FROM
        (
        SELECT 
              inv_tbl.inverter_seq, serial_number, target_category, install_place, amount, chart_sort_rank,
              inv_data.writedate,
              AVG(inv_data.power_kw) AS avg_power_kw,
              ROUND(MAX(inv_data.power_kw) / amount * 100, 3) AS peak_power_eff,              
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
          ${inverterSeqList.length ? ` AND inverter_seq IN (${inverterSeqList})` : ''}
          ) inv_tbl
        ON inv_tbl.inverter_seq = inv_data.inverter_seq
        WHERE writedate >= "${searchRange.strStartDate}" and writedate < "${searchRange.strEndDate}"
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
            ssd.place_seq, sub_tbl.inverter_seq, sub_tbl.seb_name, sub_tbl.target_category, 
            sub_tbl.install_place, sub_tbl.serial_number, sub_tbl.chart_sort_rank,
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
        WHERE writedate >= "${searchRange.strStartDate}" and writedate < "${searchRange.strEndDate}"
         AND ssd.place_seq IN (sub_tbl.place_seq)
         AND sub_tbl.target_category IN ('water0angle', 'earth30angle', 'earth0angle')
        GROUP BY sub_tbl.${effType}, group_date
    `;

    return this.db.single(sql, null, false);
  }

  /**
   * 발전 예측에 필요한 데이터 가져옴
   * @param {searchRange} searchRange
   * @param {number=} mainSeq
   * @return {V_GENERAL_ANALYSIS[]}
   */
  getGeneralReport(searchRange, mainSeq) {
    const {
      selectGroupDate,
      selectViewDate,
      firstGroupByFormat,
      groupByFormat,
    } = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    const sql = `
    
      SELECT
              power_tbl.inverter_seq, power_tbl.target_id, power_tbl.target_name, power_tbl.target_category, power_tbl.install_place, power_tbl.serial_number,
              power_tbl.view_date, power_tbl.group_date, power_tbl.t_amount, power_tbl.t_power_kw, power_tbl.avg_power_ratio, power_tbl.avg_power_factor, power_tbl.avg_power_eff, power_tbl.peak_power_eff, power_tbl.t_interval_power_cp_kwh, power_tbl.t_interval_power_eff,
              saltern_tbl.avg_water_level, saltern_tbl.avg_salinity, saltern_tbl.avg_module_rear_temp, saltern_tbl.avg_brine_temp,
              saltern_tbl.add_loss_rate, saltern_tbl.module_efficiency, saltern_tbl.module_square, saltern_tbl.module_power, saltern_tbl.module_count,
              wdd_tbl.avg_temp, wdd_tbl.avg_reh, wdd_tbl.avg_horizontal_solar, wdd_tbl.total_horizontal_solar,
              wdd_tbl.avg_inclined_solar, wdd_tbl.total_inclined_solar, wdd_tbl.avg_ws, wdd_tbl.avg_uv
      FROM
        (
          SELECT
                inverter_seq, target_id, target_name, serial_number, target_category, install_place, chart_sort_rank,
                SUM(amount) t_amount,
                ROUND(SUM(avg_power_kw), 4)  AS t_power_kw,
                ROUND(SUM(avg_power_kw) / SUM(amount) * 100, 4) AS avg_power_ratio,
                ROUND(SUM(avg_power_kw) / SUM(avg_pv_kw) * 100, 4) AS avg_power_factor,
                ROUND(SUM(avg_power_kw) / SUM(amount) * 100, 4) AS avg_power_eff,
                MAX(peak_power_eff) AS peak_power_eff,
                ROUND(SUM(interval_power_cp_kwh), 4) AS t_interval_power_cp_kwh,
                ROUND(SUM(interval_power_cp_kwh) / SUM(amount) * 100, 4) AS t_interval_power_eff,
                view_date, group_date
          FROM
            (
              SELECT
                    inv_tbl.inverter_seq, target_id, target_name, serial_number, target_category, install_place, amount, chart_sort_rank,
                    inv_data.writedate,
                    AVG(inv_data.pv_kw) AS avg_pv_kw,
                    AVG(inv_data.power_kw) AS avg_power_kw,
                    ROUND(MAX(inv_data.power_kw) / amount * 100, 3) AS peak_power_eff,
                    MAX(inv_data.power_cp_kwh) - MIN(inv_data.power_cp_kwh) AS interval_power_cp_kwh,
                    ${selectViewDate},
                    ${selectGroupDate}
              FROM pw_inverter_data inv_data
              JOIN
                (
                  SELECT
                      rp.main_seq,
                      inv.*
                  FROM pw_relation_power rp
                  JOIN pw_inverter inv
                  ON inv.inverter_seq = rp.inverter_seq
                  ${mainSeq !== null ? ` WHERE rp.main_seq = ${mainSeq}` : ''}
                ) inv_tbl
              ON inv_tbl.inverter_seq = inv_data.inverter_seq
              WHERE writedate >= "${searchRange.strStartDate}" 
               AND writedate < "${searchRange.strEndDate}"
               AND inv_data.inverter_seq IN (inv_tbl.inverter_seq)
              GROUP BY inverter_seq, group_date
            ) final
          GROUP BY inverter_seq, group_date
        ) power_tbl
      LEFT JOIN 
        (
          SELECT
              sub_tbl.main_seq,
              ssd.place_seq, sub_tbl.inverter_seq,
              add_loss_rate, module_efficiency, module_square, module_power, module_count,
              ROUND(AVG(ssd.water_level), 2)  AS avg_water_level,
              ROUND(AVG(ssd.salinity), 2) AS avg_salinity,
              ROUND(AVG(ssd.module_rear_temp), 2) AS avg_module_rear_temp,
              ROUND(AVG(ssd.brine_temp), 2) AS avg_brine_temp,
              ${selectViewDate},
              ${selectGroupDate}
          FROM saltern_sensor_data ssd
          JOIN
            (
              SELECT
                    rp.main_seq,
                    sr.place_seq, sr.inverter_seq,
                    AVG(sr.add_loss_rate) AS add_loss_rate,
                    SUM(sr.module_max_power) / SUM(sr.module_square) / 10 AS module_efficiency,
                    AVG(sr.module_square) * SUM(sr.module_count) AS module_square,
                    SUM(sr.module_max_power) / SUM(sr.module_square) / 10 * AVG(sr.module_square) * SUM(sr.module_count) / 100 AS module_power,
                    SUM(sr.module_count) AS module_count
              FROM seb_relation sr
              JOIN pw_relation_power rp
              ON rp.inverter_seq = sr.inverter_seq
              JOIN pw_inverter inv
              ON inv.inverter_seq = sr.inverter_seq
              JOIN main
              ON main.main_seq = rp.main_seq
              ${mainSeq !== null ? ` WHERE main.main_seq = ${mainSeq}` : ''}
              GROUP BY sr.inverter_seq
            ) sub_tbl
          ON sub_tbl.place_seq = ssd.place_seq
          WHERE writedate >= "${searchRange.strStartDate}" 
           AND writedate < "${searchRange.strEndDate}"
           AND ssd.place_seq IN (sub_tbl.place_seq)
          GROUP BY sub_tbl.inverter_seq, group_date
        ) saltern_tbl
      ON power_tbl.inverter_seq = saltern_tbl.inverter_seq AND power_tbl.group_date = saltern_tbl.group_date
      LEFT JOIN 
        (
          SELECT
                main_seq,
                ROUND(AVG(avg_sm_infrared), 2) AS avg_sm_infrared,
                ROUND(AVG(avg_temp), 2) AS avg_temp,
                ROUND(AVG(avg_reh), 2) AS avg_reh,
                ROUND(AVG(avg_horizontal_solar), 2) AS avg_horizontal_solar,
                ROUND(SUM(avg_horizontal_solar), 2) AS total_horizontal_solar,
                ROUND(AVG(avg_inclined_solar), 2) AS avg_inclined_solar,
                ROUND(SUM(avg_inclined_solar) * 1.17, 2) AS total_inclined_solar,
                ROUND(AVG(avg_ws), 2) AS avg_ws,
                ROUND(AVG(avg_uv), 0) AS avg_uv,
                group_date
          FROM
            (
              SELECT
                    writedate,
                    main_seq,
                    AVG(sm_infrared) AS avg_sm_infrared,
                    AVG(temp) AS avg_temp,
                    AVG(reh) AS avg_reh,
                    AVG(solar) AS avg_horizontal_solar,
                    AVG(inclined_solar) AS avg_inclined_solar,
                    AVG(ws) AS avg_ws,
                    AVG(uv) AS avg_uv,
                    COUNT(*) AS first_count,
                    ${selectViewDate},
                    ${selectGroupDate}
              FROM weather_device_data
              WHERE writedate >= "${searchRange.strStartDate}" 
               AND writedate < "${searchRange.strEndDate}"
              GROUP BY ${firstGroupByFormat}, main_seq
            ) AS result_wdd
          GROUP BY ${groupByFormat}, main_seq
        ) wdd_tbl
      ON wdd_tbl.group_date = saltern_tbl.group_date AND wdd_tbl.main_seq = saltern_tbl.main_seq
      ORDER BY power_tbl.inverter_seq, power_tbl.group_date 
    `;

    return this.db.single(sql, null, false);
  }
};

/**
 * @desc VIEW TABLE
 * @typedef {Object} V_GENERAL_ANALYSIS
 * @property {number} inverter_seq 인버터 정보 시퀀스
 * @property {string} target_id 인버터 id
 * @property {string} target_name 인버터 명
 * @property {string} target_category 장치 카테고리
 * @property {string} install_place 설치 장소
 * @property {string} serial_number 고유 코드
 * @property {string} view_date
 * @property {string} group_date
 * @property {number} t_amount
 * @property {number} avg_power_ratio 발전비
 * @property {number} t_power_kw
 * @property {number} avg_power_factor
 * @property {number} avg_power_eff
 * @property {number} peak_power_eff
 * @property {number} t_interval_power_cp_kwh
 * @property {number} t_interval_power_eff
 * @property {number} avg_water_level
 * @property {number} avg_salinity
 * @property {number} avg_module_rear_temp
 * @property {number} avg_brine_temp
 * @property {number} add_loss_rate
 * @property {number} module_efficiency
 * @property {number} module_square
 * @property {number} module_power
 * @property {number} module_count
 * @property {number} avg_temp
 * @property {number} avg_reh
 * @property {number} avg_horizontal_solar
 * @property {number} total_horizontal_solar
 * @property {number} avg_inclined_solar
 * @property {number} total_inclined_solar
 * @property {number} avg_ws
 * @property {number} avg_uv
 * @property {number} preWaterModuleTemp 수중 모듈온도 예측치
 * @property {number} preEarthModuleTemp 육상 모듈온도 예측치
 * @property {number} preWaterPowerEff 온도에 따른 발전 효율
 * @property {number} preEarthPowerEff 온도에 따른 발전 효율
 * @property {number} preWaterPowerKw 수중태양광 발전량 예측
 * @property {number} waterPowerlossRate 수중태양광 발전량 오차율
 * @property {number} preEarthPowerKw 발전량 예측
 */
