const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
const Promise = require('bluebird');
const BiModule = require('../models/BiModule');
const BiDevice = require('../models/BiDevice');

const webUtil = require('../models/web.util');
const excelUtil = require('../models/excel.util');
// TEST
const tempSacle = require('../temp/tempSacle');

class PowerModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
  }

  /**
   * 테스트 수행 여부, 수위, 일사량, 온도, 운량 등을 달력을 생성하기 위한 데이터로 반환
   * @param {V_MEMBER} userInfo
   * @return {{title: string, color: string, start: string}[]} title: 내용, color: 배경 색상, start: 시작 날짜
   */
  async getCalendarEventList(userInfo) {
    const startDate = moment()
      .subtract(1, 'years')
      .format();
    const endDate = new Date(moment().format());
    const searchRange = this.getSearchRange('fixRange', startDate, endDate);
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
    const calendarCommentList = await this.getCalendarComment(searchRange, userInfo.main_seq);
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
    if (searchOption.device_type === 'connector' && searchOption.device_list_type === 'all') {
      return returnValue;
    }

    // 인버터나 전체를 검색한게 아니라면 즉시 리턴
    if (searchOption.device_list_type !== 'all' && searchOption.device_list_type !== 'inverter') {
      return returnValue;
    }

    // const device_seq = !_.isNaN(searchOption.device_seq) ? Number(searchOption.device_seq) : 'all';
    // TEST
    // searchRange = this.getSearchRange('day', '2018-02-17', '2018-02-18');
    // searchRange.searchType = 'hour';
    // TODO: 인버터 모듈 이름을 가져오기 위한 테이블. 성능을 위해서라면 다른 쿼리문 작성 사용 필요
    /** @type {V_INVERTER_STATUS[]} */
    const viewInverterStatusList = await this.getTable('v_inverter_status', {
      inverter_seq: searchOption.device_seq,
    });
    // BU.CLI(viewInverterPacketList);
    // 인버터 차트 데이터 불러옴
    // BU.CLI(searchRange);
    const inverterTrend = await this.getInverterTrend(searchRange, searchOption.device_seq);
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
    webUtil.addKeyToReport(inverterTrend, viewInverterStatusList, 'target_id', 'inverter_seq');
    webUtil.addKeyToReport(inverterTrend, viewInverterStatusList, 'target_name', 'inverter_seq');
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
    inverterPowerChartData = webUtil.makeStaticChartData(
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
      const staticChart = webUtil.makeStaticChartData(weatherTrend, betweenDatePoint, chartOption);
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
        const newSearchRange = this.getSearchRange(searchInterval, startDate, endDate);
        searchRangeList.push(newSearchRange);
        startDate.setDate(startDate.getDate() + 1);
      }
    }

    // BU.CLI(searchRangeList);
    const workSheetInfoList = await Promise.all(
      searchRangeList.map(sr => this.getExcelWorkSheet(sr, userInfo, viewPowerProfileList)),
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
    const { weatherTrend, weatherChartOptionList } = await this.getWeatherChart(
      searchRange,
      betweenDatePoint,
      userInfo.main_seq,
    );
    const weatherCastRowDataPacketList = await this.getWeatherCastAverage(
      searchRange,
      userInfo.weather_location_seq,
    );
    const chartDecoration = webUtil.makeChartDecoration(searchRange);
    const powerChartData = inverterPowerChartData;

    const waterLevelDataPacketList = await this.getWaterLevel(searchRange, searchOption.device_seq);
    const calendarCommentList = await this.getCalendarComment(searchRange, userInfo.main_seq);

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
        currentItem.data[index] = data === '' ? '' : Number((data * foundIt.scale).scale(1, 1));
      });
    });
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
    if (searchOption.device_type === 'inverter' && searchOption.device_list_type === 'all') {
      return chartData;
    }

    // 인버터나 전체를 검색한게 아니라면 즉시 리턴
    if (searchOption.device_list_type !== 'all' && searchOption.device_list_type !== 'connector') {
      return chartData;
    }

    // TEST
    // searchRange = biModule.getSearchRange('range', '2018-02-10', '2018-02-14');
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
    chartData = webUtil.makeStaticChartData(connectorTrend, betweenDatePoint, chartOption);

    // BU.CLI(chartData);

    /* Scale 적용 */
    chartData.series.forEach(currentItem => {
      const foundIt = _.find(tempSacle.moduleScale, { photovoltaic_seq: Number(currentItem.name) });
      currentItem.scale = foundIt.scale;
      currentItem.data.forEach((data, index) => {
        currentItem.data[index] = data === '' ? '' : Number((data * foundIt.scale).scale(1, 1));
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
}
module.exports = PowerModel;
