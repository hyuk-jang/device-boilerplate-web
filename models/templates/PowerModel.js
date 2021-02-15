const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
// const Promise = require('bluebird');
const BiModule = require('./BiModule');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');

class PowerModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
    this.weatherModel = new WeatherModel(dbInfo);
  }

  /**
   * VIEW_INVERTER_PROFILE을 기준으로 인버터 명을 작성하여 반환
   * @param {number[]} inverterSeqList
   */
  async makeInverterNameList(inverterSeqList = []) {
    const inverterWhere = inverterSeqList.length
      ? { inverter_seq: inverterSeqList }
      : null;

    /** @type {V_PW_INVERTER_PROFILE[]} */
    const inverterProfileRows = await this.getTable(
      'v_pw_inverter_profile',
      inverterWhere,
    );

    return inverterProfileRows.map(inverterProfile => {
      // subName과 lastName을 구성하고 정의
      const {
        inverter_seq: inverterSeq,
        name: mainName = '',
        target_name: subName,
        director_name: company = '',
        amount,
      } = inverterProfile;

      const siteName = `${mainName} ${subName || ''} ${_.round(amount, 2)} kW급 ${
        _.isString(company) && company.length ? company : ''
      }`;

      return {
        inverter_seq: inverterSeq,
        siteName,
      };
    });
  }

  /**
   * 인버터 차트 반환
   * @param {searchRange} searchRange
   * @param {trendInverterDomConfig[]} trendInverterDomConfigList
   * @param {number[]} inverterSeqList
   * @param {Object} rangeInfo
   * @param {string[]} rangeInfo.strGroupDateList
   * @param {plotSeries} rangeInfo.plotSeries
   * @return {{inverterPowerChartData: chartData, inverterTrend: Object[], viewInverterStatusList: V_INVERTER_STATUS[]}} chartData
   */
  async getInverterLineChart(
    searchRange,
    trendInverterDomConfigList,
    inverterSeqList,
    rangeInfo,
  ) {
    // BU.CLI(searchRange);

    const chartConfigList = trendInverterDomConfigList.map(domConfig => {
      const { domId, dataKey, title, yAxisList = [], scale, toFixed } = domConfig;
      /** @type {lineChartConfig} */
      const chartConfig = {
        domId,
        title,
        scale,
        toFixed,
        yAxisList,
        chartOption: {
          selectKey: dataKey,
          dateKey: 'group_date',
          groupKey: 'inverter_seq',
          colorKey: 'chart_color',
          sortKey: 'chart_sort_rank',
        },
      };
      return chartConfig;
    });

    // TODO: 인버터 모듈 이름을 가져오기 위한 테이블. 성능을 위해서라면 다른 쿼리문 작성 사용 필요
    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await this.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });
    // 인버터 차트 데이터 불러옴
    const inverterTrend = await this.getInverterTrend(searchRange, inverterSeqList);
    // BU.CLI(inverterTrend);

    // 하루 데이터(10분 구간)는 특별히 데이터를 정제함.
    if (
      searchRange.searchType === 'min' ||
      searchRange.searchType === 'min10' ||
      searchRange.searchType === 'hour'
    ) {
      let maxRequiredDateSecondValue = 0;
      switch (searchRange.searchType) {
        case 'min':
          maxRequiredDateSecondValue = 120;
          break;
        case 'min10':
          maxRequiredDateSecondValue = 1200;
          break;
        case 'hour':
          maxRequiredDateSecondValue = 7200;
          break;
        default:
          break;
      }
      const calcOption = {
        calcMaxKey: 'max_c_wh',
        calcMinKey: 'min_c_wh',
        resultKey: 'interval_power',
        groupKey: 'inverter_seq',
        rangeOption: {
          dateKey: 'group_date',
          maxRequiredDateSecondValue,
          minRequiredCountKey: 'total_count',
          minRequiredCountValue: 9,
        },
      };
      // 트렌드 목록을 순회하면서 이전 값과 현재 값의 차를 구하고 그 값의 유효성을 검증
      webUtil.calcRangePower(inverterTrend, calcOption);
    }
    // DB 긁어온 내용에 key 추가
    webUtil.addKeyToReport(
      inverterTrend,
      inverterStatusRows,
      'target_id',
      'inverter_seq',
    );
    webUtil.addKeyToReport(
      inverterTrend,
      inverterStatusRows,
      'target_name',
      'inverter_seq',
    );
    // 기간 발전량을 기준으로 실제 계통 출력량을 계산하여 추가함(grid_out_w)
    webUtil.calcRangeGridOutW(inverterTrend, searchRange, 'interval_power');
    // 검색 기간을 기준으로 data 비율을 조정함
    // BU.CLI(inverterTrend);
    // 검색 조건에 맞게 데이터 단위를 변환함
    webUtil.calcScaleRowDataPacket(inverterTrend, searchRange, [
      'interval_power',
      'max_c_wh',
      'min_c_wh',
    ]);
    // BU.CLI(inverterTrend);

    // 인버터 차트 생성
    const refinedLineChartList = chartConfigList.map(chartConfig => {
      return webUtil.makeStaticLineChart(chartConfig, inverterTrend, rangeInfo);
    });

    // BU.CLIN(refinedLineChartList);

    // 인버터 이름 목록을 가져옴
    const inverterNameList = await this.makeInverterNameList(inverterSeqList);

    // 인버터 차트 목록의 series.name을 한글 이름 일괄 변경
    _(refinedLineChartList)
      .map('series')
      .flatten()
      .forEach(seriesInfo => {
        seriesInfo.name = _.get(
          _.find(inverterNameList, {
            inverter_seq: Number(seriesInfo.name),
          }),
          'siteName',
          seriesInfo.name,
        );
      });

    // BU.CLIN(refinedLineChartList, 3);
    return refinedLineChartList;
  }

  /**
   * 인버터 차트 반환
   * @param {{device_type: string, device_list_type: string, device_type_list: [], device_seq: string, search_type: string}} searchOption
   * @param {searchRange} searchRange
   * @param {{fullTxtPoint: [], shortTxtPoint: []}} betweenDatePoint
   * @return {{inverterPowerChartData: chartData, inverterTrend: Object[], viewInverterStatusList: V_INVERTER_STATUS[]}} chartData
   */
  async getInverterChart(searchOption, searchRange, betweenDatePoint) {
    // BU.CLI(searchRange);
    let inverterPowerChartData = {
      range: [],
      series: [],
    };
    const returnValue = {
      inverterPowerChartData,
      inverterTrend: [],
    };
    // 장비 종류가 접속반, 장비 선택이 전체라면 즉시 종료
    if (
      searchOption.device_type === 'connector' &&
      searchOption.device_list_type === 'all'
    ) {
      return returnValue;
    }

    // 인버터나 전체를 검색한게 아니라면 즉시 리턴
    if (
      searchOption.device_list_type !== 'all' &&
      searchOption.device_list_type !== 'inverter'
    ) {
      return returnValue;
    }

    // const device_seq = !_.isNaN(searchOption.device_seq) ? Number(searchOption.device_seq) : 'all';
    // TEST
    // searchRange = this.createSearchRange('day', '2018-02-17', '2018-02-18');
    // searchRange.searchType = 'hour';
    // TODO: 인버터 모듈 이름을 가져오기 위한 테이블. 성능을 위해서라면 다른 쿼리문 작성 사용 필요
    /** @type {V_INVERTER_STATUS[]} */
    const viewInverterStatusList = await this.getTable('v_inverter_status', {
      inverter_seq: searchOption.device_seq,
    });
    // BU.CLI(viewInverterPacketList);
    // 인버터 차트 데이터 불러옴
    // BU.CLI(searchRange);
    const inverterTrend = await this.getInverterTrend(
      searchRange,
      searchOption.device_seq,
    );
    // BU.CLI(inverterTrend);

    // 하루 데이터(10분 구간)는 특별히 데이터를 정제함.
    if (
      searchRange.searchType === 'min' ||
      searchRange.searchType === 'min10' ||
      searchRange.searchType === 'hour'
    ) {
      let maxRequiredDateSecondValue = 0;
      switch (searchRange.searchType) {
        case 'min':
          maxRequiredDateSecondValue = 120;
          break;
        case 'min10':
          maxRequiredDateSecondValue = 1200;
          break;
        case 'hour':
          maxRequiredDateSecondValue = 7200;
          break;
        default:
          break;
      }
      const calcOption = {
        calcMaxKey: 'max_c_wh',
        calcMinKey: 'min_c_wh',
        resultKey: 'interval_power',
        groupKey: 'inverter_seq',
        rangeOption: {
          dateKey: 'group_date',
          maxRequiredDateSecondValue,
          minRequiredCountKey: 'total_count',
          minRequiredCountValue: 9,
        },
      };
      webUtil.calcRangePower(inverterTrend, calcOption);
    }
    webUtil.addKeyToReport(
      inverterTrend,
      viewInverterStatusList,
      'target_id',
      'inverter_seq',
    );
    webUtil.addKeyToReport(
      inverterTrend,
      viewInverterStatusList,
      'target_name',
      'inverter_seq',
    );
    // 기간 발전량을 기준으로 실제 계통 출력량을 계산하여 추가함(grid_out_w)
    webUtil.calcRangeGridOutW(inverterTrend, searchRange, 'interval_power');
    // 검색 기간을 기준으로 data 비율을 조정함
    // BU.CLI(inverterTrend);
    webUtil.calcScaleRowDataPacket(inverterTrend, searchRange, [
      'interval_power',
      'max_c_wh',
      'min_c_wh',
    ]);
    // BU.CLI(inverterTrend);

    let chartOption = {
      selectKey: 'interval_power',
      maxKey: 'max_c_wh',
      minKey: 'min_c_wh',
      dateKey: 'group_date',
      groupKey: 'target_id',
      colorKey: 'chart_color',
      sortKey: 'chart_sort_rank',
    };
    /** 정해진 column을 기준으로 모듈 데이터를 정리 */
    inverterPowerChartData = webUtil.makeStaticLineChart(
      inverterTrend,
      betweenDatePoint,
      chartOption,
    );
    // BU.CLI(inverterTrend);
    // return;

    // TEST: 인버터 추출 데이터에 가중치를 계산
    inverterTrend.forEach(trendInfo => {
      const foundIt = _.find(tempSacle.inverterScale, {
        inverter_seq: trendInfo.inverter_seq,
      });

      if (_.isEmpty(foundIt)) return;

      const pickKeyList = ['avg_out_a', 'avg_out_w', 'interval_power'];

      pickKeyList.forEach(pickKey => {
        const value = _.get(trendInfo, pickKey, '');
        if (BU.isNumberic(value)) {
          _.set(trendInfo, pickKey, _.round(value * foundIt.scale), 1);
        } else {
          _.set(trendInfo, pickKey, '');
        }
      });
    });

    this.tempApplyScaleInverter(inverterPowerChartData);
    chartOption = {
      selectKey: 'avg_out_w',
      maxKey: 'max_c_wh',
      minKey: 'min_c_wh',
      dateKey: 'group_date',
      groupKey: 'target_id',
      colorKey: 'chart_color',
      sortKey: 'chart_sort_rank',
    };

    /** Grouping Chart에 의미있는 이름을 부여함. */
    webUtil.mappingChartDataName(
      inverterPowerChartData,
      viewInverterStatusList,
      'target_id',
      'target_name',
    );

    return {
      inverterPowerChartData,
      inverterTrend,
      viewInverterStatusList,
    };
  }

  /**
   * @param {searchRange} searchRange
   * @param {number} searchInterval
   * @param {V_MEMBER} userInfo
   * @param {V_UPSAS_PROFILE[]} viewPowerProfileList
   */
  async makeExcelSheet(searchRange, searchInterval, userInfo, viewPowerProfileList) {
    const startDate = new Date(searchRange.strBetweenStart);
    const endDate = new Date(searchRange.strBetweenEnd);
    const searchRangeList = [searchRange];

    if (_.includes(['min', 'min10', 'hour'], searchRange.searchType) === false) {
      while (startDate < endDate) {
        const newSearchRange = this.createSearchRange(searchInterval, startDate, endDate);
        searchRangeList.push(newSearchRange);
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    // BU.CLI(searchRangeList);
    const workSheetInfoList = await Promise.all(
      searchRangeList.map(sr =>
        this.getExcelWorkSheet(sr, userInfo, viewPowerProfileList),
      ),
    );

    const fileName = _.head(workSheetInfoList).sheetName;
    // BU.CLIN(workSheetInfoList);
    const excelContents = excelUtil.makeExcelWorkBook(fileName, workSheetInfoList);

    // return false;
    return { workBook: excelContents, fileName };
  }

  /**
   *
   * @param {searchRange} searchRange
   * @param {V_MEMBER} userInfo
   * @param {V_UPSAS_PROFILE[]} viewPowerProfileList
   */
  async getExcelWorkSheet(searchRange, userInfo, viewPowerProfileList) {
    const searchOption = {
      device_list_type: 'inverter',
      device_seq: _.map(viewPowerProfileList, 'inverter_seq'),
    };
    const betweenDatePoint = BU.getBetweenDatePoint(
      searchRange.strBetweenEnd,
      searchRange.strBetweenStart,
      searchRange.searchInterval,
    );
    const {
      inverterPowerChartData,
      inverterTrend,
      viewInverterStatusList,
    } = await this.getInverterChart(searchOption, searchRange, betweenDatePoint);

    // BU.CLI(inverterTrend);

    // 모듈 뒷면 온도 데이터 가져옴
    // const {sensorChartData, sensorTrend} = ;
    const moduleRearTemperatureChartInfo = await this.biDevice.getDeviceChart(
      viewPowerProfileList,
      'moduleRearTemperature',
      searchRange,
      betweenDatePoint,
    );

    // 수온을 가져옴
    const brineTemperatureChartInfo = await this.biDevice.getDeviceChart(
      viewPowerProfileList,
      'brineTemperature',
      searchRange,
      betweenDatePoint,
    );

    // 장치 관련 차트 정보 객체
    const deviceChartInfo = {
      moduleRearTemperatureChartInfo,
      brineTemperatureChartInfo,
    };

    // BU.CLI(searchRange);
    // BU.CLI(inverterPowerChartData);
    const {
      weatherTrend,
      weatherChartOptionList,
    } = await this.weatherModel.getWeatherChart(
      searchRange,
      betweenDatePoint,
      userInfo.main_seq,
    );
    const weatherCastRowDataPacketList = await this.weatherModel.getWeatherCastAverage(
      searchRange,
      userInfo.weather_location_seq,
    );
    const chartDecoration = webUtil.makeChartDecoration(searchRange);
    const powerChartData = inverterPowerChartData;

    const waterLevelDataPacketList = await this.getWaterLevel(
      searchRange,
      searchOption.device_seq,
    );
    const calendarCommentList = await this.weatherModel.getCalendarComment(
      searchRange,
      userInfo.main_seq,
    );

    const createExcelOption = {
      viewInverterStatusList,
      inverterTrend,
      powerChartData,
      powerChartDecoration: chartDecoration,
      waterLevelDataPacketList,
      weatherCastRowDataPacketList,
      weatherTrend,
      weatherChartOptionList,
      calendarCommentList,
      searchRange,
      deviceChartInfo,
    };
    return excelUtil.makeChartDataToExcelWorkSheet(createExcelOption);
  }

  /**
   * Scale 적용
   * @param {chartData} chartData
   */
  tempApplyScaleInverter(chartData) {
    chartData.series.forEach(currentItem => {
      const foundIt = _.find(tempSacle.inverterScale, {
        target_id: currentItem.name,
      });
      currentItem.option.scale = foundIt.scale;
      currentItem.data.forEach((data, index) => {
        currentItem.data[index] =
          data === '' ? '' : Number((data * foundIt.scale).scale(1, 1));
      });
    });
  }

  /**
   * 접속반 데이터 상태를 불러옴
   * @param {number[]} connectorSeq
   */
  getConnectorStatus(connectorSeqList) {
    if (!connectorSeqList.length) return [];

    const sql = `
      SELECT
        cnt.*,
        cnt_data.*
      FROM pw_connector cnt
      LEFT OUTER JOIN 
      (
        SELECT 
          cd.*
        FROM pw_connector_data cd
        INNER JOIN
        (
          SELECT MAX(connector_data_seq) AS connector_data_seq
          FROM pw_connector_data
          GROUP BY connector_seq
        ) temp
        ON cd.connector_data_seq = temp.connector_data_seq
      ) cnt_data
      ON cnt.connector_seq = cnt_data.connector_seq
      WHERE cnt.connector_seq IN (${connectorSeqList})
    `;
    return this.db.single(sql);
  }

  /**
   * 접속반 차트 반환
   * @param {{device_type: string, device_list_type: string, device_type_list: [], device_seq: string, search_type: string}} searchOption
   * @param {searchRange} searchRange
   * @param {{fullTxtPoint: [], shortTxtPoint: []}}
   * @return {chartData} chartData
   */
  async getConnectorChart(searchOption, searchRange, betweenDatePoint) {
    let chartData = { range: [], series: [] };

    // 장비 종류가 인버터, 장비 선택이 전체라면 즉시 종료
    if (
      searchOption.device_type === 'inverter' &&
      searchOption.device_list_type === 'all'
    ) {
      return chartData;
    }

    // 인버터나 전체를 검색한게 아니라면 즉시 리턴
    if (
      searchOption.device_list_type !== 'all' &&
      searchOption.device_list_type !== 'connector'
    ) {
      return chartData;
    }

    // TEST
    // searchRange = biModule.createSearchRange('range', '2018-02-10', '2018-02-14');
    // TODO: 접속반 모듈 이름을 가져오기 위한 테이블. 성능을 위해서라면 다른 쿼리문 작성 사용 필요
    const upsasProfile = await this.getTable('v_upsas_profile');
    // BU.CLI(searchRange);
    // 접속반 리스트 불러옴(선택한 접속반의 모듈을 가져오기 위함)
    const connectorList = await this.getTable('connector');
    // BU.CLIS(searchOption, connectorList);
    // 선택한 접속반 seq 정의
    const connectorSeqList = !_.isNaN(searchOption.device_seq)
      ? [Number(searchOption.device_seq)]
      : _.map(connectorList, 'connector_seq');
    // 선택한 접속반에 물려있는 모듈의 seq를 배열에 저장
    const moduleSeqList = _.chain(upsasProfile)
      .filter(profile => _.includes(connectorSeqList, profile.connector_seq))
      .map('photovoltaic_seq')
      .union()
      .value();

    /** 모듈 데이터 가져옴 */
    const connectorTrend = await this.getConnectorTrend(moduleSeqList, searchRange);
    // BU.CLI(connectorTrend);

    const chartOption = {
      selectKey: 'total_wh',
      dateKey: 'group_date',
      groupKey: 'photovoltaic_seq',
      colorKey: 'chart_color',
      sortKey: 'chart_sort_rank',
    };

    /** 정해진 column을 기준으로 모듈 데이터를 정리 */
    chartData = webUtil.makeStaticLineChart(
      connectorTrend,
      betweenDatePoint,
      chartOption,
    );

    // BU.CLI(chartData);

    /* Scale 적용 */
    chartData.series.forEach(currentItem => {
      const foundIt = _.find(tempSacle.moduleScale, {
        photovoltaic_seq: Number(currentItem.name),
      });
      currentItem.scale = foundIt.scale;
      currentItem.data.forEach((data, index) => {
        currentItem.data[index] =
          data === '' ? '' : Number((data * foundIt.scale).scale(1, 1));
      });
    });

    // BU.CLI(chartData);
    /** Grouping Chart에 의미있는 이름을 부여함. */
    webUtil.mappingChartDataNameForModule(chartData, upsasProfile);
    /** searchRange 조건에 따라서 Chart Data의 비율을 변경 */
    webUtil.applyScaleChart(chartData, searchRange.searchType);
    // BU.CLI(chartData);

    return chartData;
  }

  async getPowerPrediction(date, weatherLocationSeq) {
    const sql = `
      SELECT wwl.weather_location_seq, wkd.*, wwl.latitude, SUM(wi.amount) AS moduleCapacity
      FROM wc_weather_location AS wwl
      JOIN wc_kma_data AS wkd
      ON wwl.weather_location_seq=wkd.weather_location_seq
      JOIN pw_inverter AS wi
      WHERE wkd.applydate="${date}" AND wwl.weather_location_seq=${weatherLocationSeq}
    `;

    const powerPredictionInfo = await this.db.single(sql, '', false);
    // powerPredictionInfo.moduleWide = 1000; // FIXME: 임시
    if (powerPredictionInfo.length) {
      return _.head(powerPredictionInfo);
    }
    return {};
  }
}
module.exports = PowerModel;
