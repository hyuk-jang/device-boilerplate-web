const _ = require('lodash');
const moment = require('moment');
const { BU } = require('base-util-jh');

const commonUtil = require('./common.util');

/**
 * 기상청 날씨 변경
 * @param {{temp: number, pty: number, wf_kor: string, wf_en: string, pop: number, r12: number, ws:number, wd: number, reh: number, applydate: Date}} weatherCastInfo
 * @return {{temp: number, wf: number}}
 */
function convertWeatherCast(weatherCastInfo) {
  const returnValue = { temp: 0, wf: 0 };

  if (_.isEmpty(weatherCastInfo)) {
    return returnValue;
  }

  returnValue.temp = weatherCastInfo.temp;
  returnValue.wf = weatherCastInfo.wf || 0;

  return returnValue;
}
exports.convertWeatherCast = convertWeatherCast;

/**
 * 검색 조건 (year, month, day)에 따라서 비율을 변환하여 반환
 * @param {number} number
 * @param {string} searchType
 */
function convertValueBySearchType(number, searchType) {
  // BU.CLI('convertValueBySearchType', searchType, number)
  let returnValue = 0;
  if (_.isNumber(number)) {
    switch (searchType) {
      case 'year':
        returnValue = _.round(number / 1000 / 1000, 4);
        break;
      case 'month':
      case 'day':
        returnValue = _.round(number / 1000, 3);
        break;
      case 'hour':
      default:
        returnValue = number;
        break;
    }
    return Number(returnValue);
  }
  return '';
}
exports.convertValueBySearchType = convertValueBySearchType;

/**
 * 차트 데이터 레포트 통계치 계산
 * @param {Object[]} dataRows
 * @param {chartOption} chartOption
 * @return {chartDataOption}
 */
function calcStatisticsReport(dataRows, chartOption) {
  /** @type {chartDataOption} */
  const returnValue = {};
  const { sortKey, maxKey, minKey, averKey } = chartOption;

  const dataRow = _.head(dataRows);

  // 데이터가 없다면 빈 객체 반환
  if (_.isEmpty(dataRow)) {
    return returnValue;
  }

  // 정렬 우선 순위가 있다면 입력
  if (sortKey) {
    returnValue.sort = dataRow[sortKey];
  }
  // 최대 값을 구한다면
  if (maxKey) {
    const row = _.maxBy(dataRows, rowPacket => rowPacket[maxKey]);
    returnValue.max = row[maxKey];
  }
  // 최소 값을 구한다면
  if (minKey) {
    const row = _.minBy(dataRows, rowPacket => rowPacket[minKey]);
    returnValue.min = row[minKey];
  }
  // TODO
  if (averKey) {
    returnValue.aver = _(dataRows).map(averKey).mean();
  }

  return returnValue;
}

/**
 * 기준이 되는 날을 기준으로 해당 데이터의 유효성을 검증. 10분을 초과하면 유효하지 않는 데이터로 처리.
 * @param {Array|Object} targetData 점검하고자 하는 데이터
 * @param {Date} baseDate 기준 날짜
 * @param {string} dateKey 검색 날짜와 매칭되는 키
 * @return {{hasValidData: boolean, data: Object}[]}
 */
//  * @return {Array.<{hasValidData: boolean, data: Object}>} 의미 있는 데이터 체크
function checkDataValidation(targetData, baseDate, dateKey) {
  if (_.isArray(targetData)) {
    let validDataList = [];

    targetData.forEach(data => {
      const result = checkDataValidation(data, baseDate, dateKey);
      validDataList = validDataList.concat(result);
    });
    return validDataList;
  }
  if (_.isObject(targetData)) {
    const validData = {
      hasValidData: false,
      data: {},
    };

    // 날짜가 없을 경우(null, undefined) 유효데이터 처리 X
    if (baseDate == null || targetData[dateKey] == null) {
      validData.hasValidData = false;
      validData.data = targetData;
      return [validData];
    }

    const gapDate = BU.calcDateInterval(baseDate, targetData[dateKey]);
    // BU.CLIS(gapDate, BU.convertDateToText(baseDate), BU.convertDateToText(targetData[dateKey]));
    validData.hasValidData = !!(
      gapDate.remainDay === 0 &&
      gapDate.remainHour === 0 &&
      gapDate.remainMin <= 10
    );
    validData.data = targetData;

    return [validData];
  }
}
exports.checkDataValidation = checkDataValidation;

/**
 * checkDataValidation 수행 뒤의 Array의 특정 Key를 전부 합산 뒤 반환
 * @param {Array.<{hasValidData: boolean, data: Object}>} validDataList checkDataValidation를 수행하고 난 Array
 * @param {string} key 계산 Key
 * @param {boolean} hasAll hasValidData 여부에 상관없이 더할지
 * @return {number} 합산 값
 */
function calcValidDataList(validDataList, key, hasAll) {
  let validList = [];
  if (hasAll) {
    validList = _.map(validDataList, 'data');
  } else {
    _.forEach(validDataList, validData => {
      if (validData.hasValidData) {
        validList.push(validData.data);
      }
    });
  }
  // BU.CLI(validList);
  const returnNumber = _.sum(_.map(validList, key));
  return _.isNumber(returnNumber) ? returnNumber : 0;
}
exports.calcValidDataList = calcValidDataList;

/**
 * 값을 합산
 * @param {Object[]} dataList Object List
 * @param {string} key 계산 Key
 * @return {number} 계산 결과 값 or ''
 */
function reduceDataList(dataList, key) {
  const returnNumber = _.sum(
    _.map(dataList, dataInfo => {
      const data = _.get(dataInfo, key, '');

      if (BU.isNumberic(data)) {
        return Number(data);
      }
      return 0;
    }),
  );
  // BU.CLI(returnNumber);
  return _.isNumber(returnNumber) ? returnNumber : '';
}
exports.reduceDataList = reduceDataList;

/**
 * 기준 값에 Scale 적용 후 소수 점 처리 후 반환
 * @param {number} value 계산 할려는 값
 * @param {number} scale 게산 식 etc: 0.001, 100, 10, 20
 * @param {number|string} toFixedNumber 소수 점 자리
 */
function calcValue(value, scale = 1, toFixedNumber = 1) {
  // BU.CLIS(value, scale, toFixedNumber);
  if (_.isNumber(value) && _.isNumber(scale) && _.isNumber(toFixedNumber)) {
    return _.round(_.multiply(value, scale), toFixedNumber);
  }
  return '';
}
exports.calcValue = calcValue;

/**
 * 계산할려는 packetList를 순회하면서 이전 값과 현재 값의 차를 구하고 그 값의 유효성을 검증한 후 반환
 * @param {Object[]} tableRows
 * @param {calcRowPacketIntervalOption} calcOption
 */
function calcRangePower(tableRows, calcOption) {
  // BU.CLI(calcOption);

  // 같은 Key 끼리 그루핑
  if (calcOption.groupKey) {
    // BU.CLI(groupKey);
    const groupedTableRowInfo = _.groupBy(tableRows, calcOption.groupKey);

    // 설정한 유효 기간을 체크하여 검증할 건지 여부
    const hasCalcRange = !_.isEmpty(calcOption.rangeOption);
    // 이전 값과 현재 값의 날짜 차가 유효할 경우만 검증할 것인지 여부
    const hasCalcDate = !!(hasCalcRange && calcOption.rangeOption.dateKey.length);
    // 데이터 분포군 개수로는 계산하지 않음.
    // const hasCalcCount = hasCalcRange && calcOption.rangeOption.minRequiredCountKey.length ? true : false;

    _.forEach(groupedTableRowInfo, groupedTableRows => {
      let prevValue;
      let prevDate;
      groupedTableRows.forEach((tableRow, index) => {
        let hasError = false;
        // 첫 데이터는 비교 대상이 없으므로 자체적으로 가지고 있는 최소 값을 기입
        if (index === 0) {
          prevValue = tableRow[calcOption.calcMinKey || calcOption.calcMaxKey];
        }

        // BU.CLI(prevDate);
        // 날짜 계산 옵션이 있다면 날짜 임계치를 벗어났는지 체크
        if (hasCalcDate && prevDate instanceof Date) {
          /** @type {Date} */
          let currDate = tableRow[calcOption.rangeOption.dateKey];
          currDate =
            typeof currDate === 'string' ? BU.convertTextToDate(currDate) : currDate;
          // BU.CLI(BU.convertDateToText(prevDate), BU.convertDateToText(currDate));
          const thisCritical = (currDate.getTime() - prevDate.getTime()) * 0.001;
          // BU.CLIS(prevDate.getTime(), currDate.getTime(), currDate.getTime() - prevDate.getTime());
          if (thisCritical >= calcOption.rangeOption.maxRequiredDateSecondValue) {
            hasError = true;
          }
        }

        // if(hasCalcCount && calcOption.rangeOption.minRequiredCountValue > rowData[calcOption.rangeOption.minRequiredCountKey]){
        //   hasError = true;
        // }

        // BU.CLI(hasError);
        tableRow[calcOption.resultKey] = hasError
          ? ''
          : tableRow[calcOption.calcMaxKey] - prevValue;
        // BU.CLI(rowData);
        prevValue = tableRow[calcOption.calcMaxKey];

        if (hasCalcDate) {
          prevDate = tableRow[calcOption.rangeOption.dateKey];
          prevDate =
            typeof prevDate === 'string' ? BU.convertTextToDate(prevDate) : prevDate;
        }
      });
      // rowList.shift();
    });

    return groupedTableRowInfo;
  }
}
exports.calcRangePower = calcRangePower;

/**
 * Table Rows을 Grouping 한 후 각 이전 Grouping과 이후 Grouping 간의 최대 값 차이를 구하여 resultkey에 반영
 * @param {searchRange} searchRange
 * @param {{}[]} dataRows
 * @param {calcRowPacketIntervalOption} calcOption
 */
function refineDataRows(searchRange, dataRows, calcOption) {
  // 하루 데이터(10분 구간)는 특별히 데이터를 정제함.
  if (
    searchRange.searchType === 'min' ||
    searchRange.searchType === 'min10' ||
    searchRange.searchType === 'hour'
  ) {
    let maxRequiredDateSecondValue = 0;
    const minRequiredCountValue = 9;
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

    calcOption.rangeOption.maxRequiredDateSecondValue = maxRequiredDateSecondValue;
    calcOption.rangeOption.minRequiredCountValue = minRequiredCountValue;

    calcRangePower(dataRows, calcOption);
  }
}
exports.refineDataRows = refineDataRows;

/**
 *
 * @param {Object[]} rowDataPacketList
 * @param {searchRange} searchRange
 * @param {string} cumulativePowerKey
 */
function calcRangeGridOutW(rowDataPacketList, searchRange, cumulativePowerKey) {
  rowDataPacketList.forEach(rowDataPacket => {
    const cPower = rowDataPacket[cumulativePowerKey];
    rowDataPacketList.grid_out_w = '';
    if (typeof cPower === 'number') {
      switch (searchRange.searchType) {
        case 'min':
          rowDataPacket.grid_out_w = cPower * 60;
          break;
        case 'min10':
          rowDataPacket.grid_out_w = cPower * 6;
          break;
        case 'hour':
          rowDataPacket.grid_out_w = cPower;
          break;
        case 'day':
          rowDataPacket.grid_out_w = cPower / 6;
          break;
        case 'month':
          rowDataPacket.grid_out_w = cPower / 6 / 30;
          break;
        case 'year':
          rowDataPacket.grid_out_w = cPower / 6 / 365;
          break;
        default:
          break;
      }
      rowDataPacket.grid_out_w = _.round(rowDataPacket.grid_out_w, 2);
    }
  });
}
exports.calcRangeGridOutW = calcRangeGridOutW;

/**
 * 검색 조건에 맞게 데이터 단위를 변환함
 * @param {Object[]} dataRows
 * @param {searchRange} searchRange
 * @param {string[]} dataKeyList
 */
function calcScaleRowDataPacket(dataRows, searchRange, dataKeyList) {
  dataRows.forEach(dataRow => {
    dataKeyList.forEach(dataKey => {
      dataRow[dataKey] = convertValueBySearchType(
        dataRow[dataKey],
        searchRange.searchType,
      );
    });
  });
}
exports.calcScaleRowDataPacket = calcScaleRowDataPacket;

/**
 * 접속반 메뉴에서 사용될 데이터 선언 및 부분 정의
 * @param {V_UPSAS_PROFILE[]} viewUpsasProfile DB에서
 * @param {number|string} connector_seq 선택한 접속반
 * @return {Array.<{photovoltaic_seq:number, connector_ch: number, pv_target_name:string, pv_manufacturer: string, cnt_target_name: string, ivt_target_name: string, install_place: string, writedate: Date, amp: number, vol: number, isOperation: boolean }>}
 */
function refineSelectedConnectorList(viewUpsasProfile) {
  // let sortedList = _.flatten(_.map(_.groupBy(viewUpsasProfile, profile => profile.connector_seq), group => _.sortBy(group, 'connector_ch')));
  // if (connector_seq !== 'all') {
  //   sortedList = _.filter(sortedList, info => info.connector_seq === connector_seq);
  // }
  const returnArray = [];
  _.forEach(viewUpsasProfile, info => {
    returnArray.push({
      photovoltaic_seq: info.photovoltaic_seq,
      connector_ch: `CH ${info.connector_ch}`,
      pv_target_name: info.pv_target_name,
      pv_manufacturer: info.pv_manufacturer,
      cnt_target_name: info.cnt_target_name,
      ivt_target_id: info.ivt_target_id,
      ivt_target_name: info.ivt_target_name,
      inverter_seq: info.inverter_seq,
      install_place: info.pv_install_place === '육상' ? '육상' : info.place_name,
      writedate: '',
      amp: '',
      vol: '',
      power: '',
      temperature: '',
      isOperation: false,
    });
  });
  return returnArray;
}
exports.refineSelectedConnectorList = refineSelectedConnectorList;

/**
 * Array.<{}> --> Array.<Array>
 * @param {Array} targetList
 * @param {Array} priotyKeyList
 * @param {number} repeatLength
 * @return {Array}
 */
function convertColumn2Rows(targetList, priotyKeyList, repeatLength) {
  const returnValue = {};
  priotyKeyList.forEach(key => {
    const pluckData = _.map(targetList, key);
    const space = repeatLength - pluckData.length;
    for (let i = 0; i < space; i += 1) {
      pluckData.push('');
    }
    returnValue[key] = pluckData;
  });

  return returnValue;
}
exports.convertColumn2Rows = convertColumn2Rows;
//
/**
 * 인버터 메뉴에서 사용될 데이터 선언 및 부분 정의
 * @param {{hasValidData: boolean, data: INVERTER}[]} validInverterStatus DB에서
 * @return {{totalInfo: {in_kw: number=, out_kw: number=, d_kwh: number=, c_mwh: number=}, dataList: Array.<{photovoltaic_seq:number, connector_ch: number, pv_target_name:string, pv_manufacturer: string, cnt_target_name: string, ivt_target_name: string, install_place: string, writedate: Date, amp: number, vol: number, isOperation: boolean }>}}
 */
function refineSelectedInverterStatus(validInverterStatus) {
  const INCLINED_SOLAR = 'inclinedSolar';
  const returnValue = {
    totalInfo: {},
    dataList: [],
  };
  const currInverterDataList = [];
  _.forEach(validInverterStatus, info => {
    // BU.CLI(info)

    const {
      hasValidData,
      data,
      data: { power_f: powerF, pv_kw: pvKw },
    } = info;

    // if (true) {
    if (hasValidData) {
      data.isOperation = true;
      data.power_f === null &&
        _.set(
          data,
          'power_f',
          Number.isNaN(powerF) || powerF === Infinity
            ? '-'
            : _.round(_.divide(powerF, pvKw) * 100, 1),
        );

      _.set(
        data,
        INCLINED_SOLAR,
        _.isNumber(data[INCLINED_SOLAR]) ? data[INCLINED_SOLAR] : '',
      );
    } else {
      data.pv_a = '';
      data.pv_v = '';
      data.pv_kw = '';
      data.grid_r_a = '';
      data.grid_rs_v = '';
      data.grid_s_a = '';
      data.grid_st_v = '';
      data.grid_t_a = '';
      data.grid_tr_v = '';
      data.line_f = '';
      data.power_f = '';
      data.power_kw = '';
      // data.daily_power_kwh = '';
      // data.power_c_kwh = '';
      data.isOperation = false;
      data[INCLINED_SOLAR] = '';
    }

    currInverterDataList.push(data);
  });
  // currInverterDataList = _.sortBy(currInverterDataList, 'target_name');
  // 인버터 실시간 데이터 테이블
  returnValue.dataList = currInverterDataList;
  returnValue.totalInfo.pv_kw = calcValue(
    reduceDataList(currInverterDataList, 'pv_kw'),
    1,
    3,
  );
  returnValue.totalInfo.grid_kw = calcValue(
    reduceDataList(currInverterDataList, 'grid_kw'),
    1,
    3,
  );
  returnValue.totalInfo.d_kwh = calcValue(
    reduceDataList(currInverterDataList, 'daily_power_kwh'),
    1,
    3,
  );
  returnValue.totalInfo.c_kwh = calcValue(
    reduceDataList(currInverterDataList, 'power_cp_kwh'),
    1,
    3,
  );

  return returnValue;
}
exports.refineSelectedInverterStatus = refineSelectedInverterStatus;

/**
 * Range에 맞는 차트 데이터 구성
 * @param {lineChartConfig} lineChartConfig
 * @param {Object[]} dataRows
 * @return {lineChartInfo}
 */
function makeDynamicLineChart(lineChartConfig, dataRows) {
  // BU.CLI(chartOption);

  const {
    domId,
    subtitle,
    title,
    scale = 1,
    toFixed = 1,
    yAxisList,
    chartOption,
  } = lineChartConfig;

  const { selectKey, dateKey, groupKey, colorKey, sortKey, hasArea } = chartOption;

  /** @type {lineChartInfo} */
  const refinedLineChart = {
    domId,
    title,
    subtitle,
    yAxis: yAxisList,
    series: [],
  };

  // y축 표현 정보
  const yAxisInfo = _.head(yAxisList);

  // BU.CLI(returnValue.range);
  // 같은 Key 끼리 그루핑
  if (groupKey) {
    const groupedTableInfo = _.groupBy(dataRows, groupKey);
    _.forEach(groupedTableInfo, (groupedTableRows, gKey) => {
      /** @type {chartSeriesInfo} */
      const chartSeries = {
        name: gKey,
        data: [],
        type: hasArea && 'area',
        color: colorKey && _.get(_.head(groupedTableRows), colorKey),
        sortKey: sortKey && _.get(_.head(groupedTableRows), sortKey),
        yAxis: 0,
        tooltip: {
          valueSuffix: ` ${yAxisInfo.dataUnit}`,
        },
      };

      _.forEach(groupedTableRows, dataRow => {
        // 데이터 형식은 [Date, Data]
        let data = _.get(dataRow, selectKey);
        // 데이터가 숫자이고 scale이 숫자라면 데이터에 배율을 곱한 후 반올림 및 소수점 절삭 처리
        data = _.isNumber(data)
          ? _.chain(data).multiply(scale).round(toFixed).value()
          : data;

        chartSeries.data.push([commonUtil.convertDateToUTC(dataRow[dateKey]), data]);
      });
      refinedLineChart.series.push(chartSeries);
    });

    const orderByKey = sortKey ? 'sort' : 'name';
    refinedLineChart.series = _.sortBy(refinedLineChart.series, [orderByKey]);
  } else {
    /** @type {chartSeriesInfo} */
    const chartSeries = {
      name: title,
      data: [],
      type: hasArea && 'area',
      yAxis: yAxisInfo.yAxis ?? 0,
      tooltip: {
        valueSuffix: ` ${yAxisInfo.dataUnit}`,
      },
    };

    chartSeries.data = _(dataRows)
      .groupBy(dateKey)
      .toPairs() // [[date, [[data], [data], [data]]], ...]
      .sortBy() // 날짜 오름 차순 정렬
      .map(pairList => {
        const utc = commonUtil.convertDateToUTC(_.head(pairList));
        const selectValues = _.chain(_.nth(pairList, 1)).map(selectKey).value();

        return [utc, _.chain(selectValues).sum().multiply(scale).round(toFixed).value()];
      })
      .value();

    refinedLineChart.series.push(chartSeries);
  }

  return refinedLineChart;
}
exports.makeDynamicLineChart = makeDynamicLineChart;

/**
 * 차트 데이터
 * @param {lineChartConfig} lineChartConfig
 * @param {Object[]} dataRows
 * @param {Object} rangeInfo
 * @param {string[]} rangeInfo.strGroupDateList
 * @param {plotSeriesInfo} rangeInfo.plotSeries
 */
function makeStaticLineChart(lineChartConfig, dataRows, rangeInfo) {
  // BU.CLI(dataRows);
  const {
    domId,
    subtitle,
    title,
    scale,
    toFixed = 1,
    yAxisList,
    chartOption,
  } = lineChartConfig;

  const { selectKey, dateKey, groupKey, colorKey, sortKey, hasArea } = chartOption;

  const { plotSeries, strGroupDateList } = rangeInfo;

  // y축 표현 정보
  const yAxisInfo = _.head(yAxisList);

  /** @type {lineChartInfo} */
  const refinedLineChart = {
    domId,
    title,
    subtitle,
    yAxis: yAxisList,
    plotSeries,
    series: [],
  };

  // 색상키가 정해져있찌 않다면 색상 없이 반환
  // 같은 Key 끼리 그루핑
  if (groupKey) {
    // BU.CLI(groupKey);
    const groupedTableInfo = _.groupBy(dataRows, groupKey);
    // BU.CLIN(groupedTableInfo, 1);
    _.forEach(groupedTableInfo, (groupedDataRows, gKey) => {
      /** @type {chartSeriesInfo} */
      const chartSeries = {
        name: gKey,
        data: [],
        type: hasArea && 'area',
        color: colorKey && _.get(_.head(groupedDataRows), colorKey),
        sortKey: sortKey && _.get(_.head(groupedDataRows), sortKey),
        yAxis: 0,
        tooltip: {
          valueSuffix: ` ${yAxisInfo.dataUnit}`,
        },
      };

      chartSeries.option = calcStatisticsReport(groupedDataRows, chartOption);

      // 지정된 날짜 목록을 순회하며 해당 그루핑 날짜와 같은 경우 유효 데이터 삽입.
      strGroupDateList.forEach(strGroupDate => {
        const resultFind = _.find(groupedDataRows, {
          [dateKey]: strGroupDate,
        });

        // BU.CLI(findGridObj)
        let data = _.isEmpty(resultFind) ? '' : resultFind[selectKey];
        // 데이터가 숫자이고 scale이 숫자라면 데이터에 배율을 곱한 후 반올림 및 소수점 절삭 처리
        data =
          _.isNumber(data) && _.isNumber(scale)
            ? _.chain(data).multiply(scale).round(toFixed).value()
            : data;

        chartSeries.data.push(data);
      });
      refinedLineChart.series.push(chartSeries);
    });

    const orderByKey = sortKey ? 'sort' : 'name';
    refinedLineChart.series = _.sortBy(refinedLineChart.series, [orderByKey]);
  } else {
    // FIXME: Dynamic Line CHart와 비슷하게 코딩 필요.
    /** @type {chartSeriesInfo} */
    const chartSeries = {
      name: title,
      data: [],
      type: hasArea && 'area',
      yAxis: 0,
      tooltip: {
        valueSuffix: ` ${yAxisInfo.dataUnit}`,
      },
      option: calcStatisticsReport(dataRows, chartOption),
    };

    strGroupDateList.forEach(strGroupDate => {
      chartSeries.data.push(
        _(dataRows)
          .filter({ [dateKey]: strGroupDate })
          .map(dataInfo => _.get(dataInfo, selectKey))
          .sum(),
      );
    });

    //   const resultFind = _.find(groupedDataRows, {
    //     [dateKey]: strGroupDate,
    //   });

    //   // BU.CLI(findGridObj)
    //   let data = _.isEmpty(resultFind) ? '' : resultFind[selectKey];
    //   // 데이터가 숫자이고 scale이 숫자라면 데이터에 배율을 곱한 후 반올림 및 소수점 절삭 처리
    //   data =
    //     _.isNumber(data) && _.isNumber(scale)
    //       ? _.chain(data)
    //           .multiply(scale)
    //           .round(toFixed)
    //           .value()
    //       : data;

    //   chartSeries.data.push(data);
    // });

    // chartSeries.data = _(dataRows)
    //   .groupBy(dateKey)
    //   .toPairs() // [[date, [[data], [data], [data]]], ...]
    //   .sortBy() // 날짜 오름 차순 정렬
    //   .map(pairList => {
    //     return [
    //       moment(_.head(pairList))
    //         .add(9, 'hours')
    //         .valueOf(),

    //       _.chain(_.nth(pairList, 1))
    //         .map(selectKey)
    //         .sum()
    //         .multiply(scale)
    //         .round(toFixed)
    //         .value(),
    //       // _.round(_.sum(_.map(_.nth(pairList, 1), selectKey)), 1),
    //     ];
    //   })
    // .value();

    refinedLineChart.series.push(chartSeries);

    // baseRange.fullTxtPoint.forEach(fullTxtDate => {
    //   const resultFind = _.find(dataRows, {
    //     [dateKey]: fullTxtDate,
    //   });

    //   // BU.CLI(findGridObj)
    //   const data = _.isEmpty(resultFind) ? '' : resultFind[selectKey];
    //   addObj.data.push(data);
    // });

    // returnValue.series.push(addObj);
  }
  // BU.CLI(refinedLineChart);
  return refinedLineChart;
}
exports.makeStaticLineChart = makeStaticLineChart;
// /**
//  * 차트 데이터
//  * @param {Object[]} tableRows
//  * @param {{fullTxtPoint: [], shortTxtPoint: []}} baseRange 고정된 Column 객체
//  * @param {chartOption} chartOption
//  * @return {chartData}
//  */
// function makeStaticChartData(tableRows, baseRange, chartOption) {
//   const { selectKey, dateKey, groupKey, colorKey, sortKey } = chartOption;

//   // 반환 데이터 유형
//   /** @type {chartData} */
//   const returnValue = {
//     range: baseRange.shortTxtPoint,
//     series: [],
//   };

//   // 색상키가 정해져있찌 않다면 색상 없이 반환
//   // 같은 Key 끼리 그루핑
//   if (groupKey) {
//     const groupedTableInfo = _.groupBy(tableRows, groupKey);
//     BU.CLI(groupedTableInfo);

//     returnValue.series = [];
//     _.forEach(groupedTableInfo, (groupedTableRows, gKey) => {
//       /** @type {chartSeries} */
//       const addObj = {
//         name: gKey,
//         data: [],
//         option: {},
//       };

//       const groupedFirstRow = _.head(groupedTableRows);
//       // 색상 키가 있다면 입력
//       if (colorKey) {
//         addObj.color = groupedFirstRow[colorKey];
//       }

//       addObj.option = calcStatisticsReport(groupedTableRows, chartOption);

//       baseRange.fullTxtPoint.forEach(fullTxtDate => {
//         const resultFind = _.find(groupedTableRows, {
//           [dateKey]: fullTxtDate,
//         });

//         // BU.CLI(findGridObj)
//         const data = _.isEmpty(resultFind) ? '' : resultFind[selectKey];
//         addObj.data.push(data);
//       });
//       returnValue.series.push(addObj);
//     });

//     if (sortKey) {
//       returnValue.series = _.sortBy(returnValue.series, obj => obj.option.sort);
//     } else {
//       returnValue.series = _.sortBy(returnValue.series, obj => obj.name);
//     }
//   } else {
//     const addObj = {
//       name: '',
//       data: [],
//       option: calcStatisticsReport(tableRows, chartOption),
//     };

//     baseRange.fullTxtPoint.forEach(fullTxtDate => {
//       const resultFind = _.find(tableRows, {
//         [dateKey]: fullTxtDate,
//       });

//       // BU.CLI(findGridObj)
//       const data = _.isEmpty(resultFind) ? '' : resultFind[selectKey];
//       addObj.data.push(data);
//     });

//     returnValue.series.push(addObj);
//   }
//   BU.CLI(returnValue);
//   return returnValue;
// }
// exports.makeStaticChartData = makeStaticChartData;

/**
 * 차트 데이터 검색 조건에 따라서 데이터 비율 적용
 * @param {chartData} chartData 차트 데이터
 * @param {string} searchType 검색 타입 year, month, day, hour
 */
function applyScaleChart(chartData, searchType) {
  // BU.CLI(searchType);
  chartData.series.forEach(chart => {
    if (chart.option) {
      const { option } = chart;
      if (option.max) {
        option.max = _.isNumber(option.max)
          ? convertValueBySearchType(option.max, searchType)
          : '';
      }
      if (option.min) {
        option.min = _.isNumber(option.min)
          ? convertValueBySearchType(option.min, searchType)
          : '';
      }
      if (option.aver) {
        option.aver = _.isNumber(option.aver)
          ? convertValueBySearchType(option.aver, searchType)
          : '';
      }
    }
    chart.data.forEach((data, index) => {
      // BU.CLI(data);
      chart.data[index] = _.isNumber(data)
        ? convertValueBySearchType(data, searchType)
        : '';
    });
  });
  return chartData;
}
exports.applyScaleChart = applyScaleChart;

/**
 * 차트를 생성하는데 필요한 부가적인 정보 생성
 * @param {searchRange} searchRange 검색 옵션
 * @return {{mainTitle: string, xAxisTitle: string, yAxisTitle: string, inverterComment: string, connectorComment: string}} x, y, title Text
 */
function makeChartDecorator(searchRange) {
  let mainTitle = '';
  let xAxisTitle = '';
  let yAxisTitle = '';
  let inverterComment = '';
  let connectorComment = '';
  switch (searchRange.searchType) {
    case 'year':
      xAxisTitle = '시간(년)';
      yAxisTitle = '발전량(MWh)';
      inverterComment = '1년 동안의 발전량(MWh)';
      connectorComment = '1년 동안의 평균 출력의 출력(MWh)';
      break;
    case 'month':
      xAxisTitle = '시간(월)';
      yAxisTitle = '발전량(kWh)';
      inverterComment = '1개월 동안의 발전량(kWh)';
      connectorComment = '1개월 동안 시간당 평균 출력의 합(kW)';
      break;
    case 'day':
      xAxisTitle = '시간(일)';
      yAxisTitle = '발전량(kWh)';
      inverterComment = '1일 동안의 발전량(kWh)';
      connectorComment = '1일 동안 시간당 평균 출력(kW)의 합';
      break;
    case 'hour':
      xAxisTitle = '시간';
      yAxisTitle = '발전량(Wh)';
      inverterComment = '1시간 동안의 발전량(Wh)';
      connectorComment = '1시간 동안의 평균 출력(W)';
      break;
    case 'min10':
      xAxisTitle = '시간';
      yAxisTitle = '발전량(Wh)';
      inverterComment = '10분 동안의 발전량(Wh)';
      connectorComment = '10분 동안의 평균 출력(W)';
      break;
    case 'min':
      xAxisTitle = '시간';
      yAxisTitle = '발전량(Wh)';
      inverterComment = '1분 동안의 발전량(Wh)';
      connectorComment = '1분 동안의 평균 출력(W)';
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
    inverterComment,
    connectorComment,
  };
}
exports.makeChartDecoration = makeChartDecorator;

/**
 * 차트 name을 의미있는 이름으로 변환
 * @param {chartData} chartData makeChartData 결과물
 * @param {Array.<{}>|string} mappingTarget Mapping 할 대상 데이터. 강제로 이름을 지정하고자 할 경우에 string
 * @param {string} matchingKey matchingKey
 * @param {string} mappingKey matchingKey
 * @return {chartData} Name 처리 한 후 반환
 */
function mappingChartDataName(
  chartData,
  mappingTarget,
  matchingKey,
  mappingKey,
  hasSort,
) {
  // BU.CLIS(mappingTarget, matchingKey);
  chartData.series.forEach(chart => {
    const chartKey = chart.name;
    if (_.isArray(mappingTarget)) {
      let findObj = _.find(mappingTarget, {
        [matchingKey]: Number(chartKey),
      });
      if (_.isEmpty(findObj)) {
        findObj = _.find(mappingTarget, {
          [matchingKey]: chartKey,
        });
      }
      chart.name = _.isEmpty(findObj) ? chart.name : findObj[mappingKey];
    } else if (_.isString(mappingTarget)) {
      chart.name = mappingTarget;
    }
  });
  // Name을 새로이 입력했으므로 이름순으로 정렬
  chartData.series = hasSort ? _.sortBy(chartData.series, 'name') : chartData.series;

  return chartData;
}
exports.mappingChartDataName = mappingChartDataName;

/**
 * 모듈 차트 name을 의미있는 이름으로 변환
 * @param {chartData} chartData makeChartData 결과물
 * @param {Array.<{}>|string} mappingTarget Mapping 할 대상 데이터. 강제로 이름을 지정하고자 할 경우에 string
 * @param {string} matchingKey matchingKey
 * @param {string} mappingKey matchingKey
 * @return {chartData} Name 처리 한 후 반환
 */
function mappingChartDataNameForModule(chartData, mappingTarget) {
  chartData.series.forEach(chart => {
    const upsasInfo = _.find(mappingTarget, {
      photovoltaic_seq: Number(chart.name),
    });
    chart.name = `${upsasInfo.cnt_target_name} ${
      upsasInfo.pv_target_name
    } (${upsasInfo.pv_module_type.slice(0, 1)})`;
    // chart.name = upsasInfo.ivt_target_name;
  });
  chartData.series = _.sortBy(chartData.series, 'ivt_target_name');
  return chartData;
}
exports.mappingChartDataNameForModule = mappingChartDataNameForModule;

/**
 * DB 긁어온 내용에 key 추가
 * @param {Object[]} sourceList
 * @param {Object[]} referenceList
 * @param {string} addKey
 * @param {string} referenceKey
 */
function addKeyToReport(sourceList, referenceList, addKey, referenceKey) {
  // BU.CLIS(sourceList, referenceList);
  sourceList.forEach(currentItem => {
    const findIt = _.find(referenceList, { [referenceKey]: currentItem[referenceKey] });

    currentItem[addKey] = _.isEmpty(findIt) ? '' : findIt[addKey];
  });

  return sourceList;
}
exports.addKeyToReport = addKeyToReport;

// /**
//  * Range에 맞는 차트 데이터 구성
//  * @param {Object[]} rowDataPacketList
//  * @param {string} dataKey Chart에 표현할 Key
//  * @param {string} outputKey 추가할 output Key
//  * @param {string} groupKey rowDataPacketList를 Group 처리 할 Key
//  * @param {string} sortKey
//  * @return {Object[]} outputKey 가 추가된 rowDataPacketList
//  */
// function calcDailyPower(rowDataPacketList, groupKey, dataKey, outputKey, sortKey) {
//   // 그룹을 지어 계산할 거라면
//   if(groupKey){
//     const group = _.groupBy(rowDataPacketList, groupKey);
//     BU.CLI(group);
//     _.each(group, (list, key) => {

//       let reverseList = (_.sortBy(list, ele => {
//         return ele[sortKey];
//       })).reverse();

//       _.reduce(reverseList, (prev, next) => {

//       });

//       BU.CLI(reverseList);
//     });
//     // BU.CLI(group);
//   } else {

//   }

// }
// exports.calcDailyPower = calcDailyPower;

// if (groupKey === '' || groupKey === undefined) {
//   let addObj = {
//     name: '',
//     data: []
//   };

//   addObj.data = _.map(_.groupBy(rowDataPacketList, rangeKey), dataList => {
//     return reduceDataList(dataList, dataKey);
//   });

//   returnValue.series.push(addObj);
// } else {
//   // 같은 Key 끼리 그루핑
//   let groupDataList = _.groupBy(rowDataPacketList, groupKey);

//   returnValue.series = _.map(groupDataList, (groupObj, gKey) => {
//     let addObj = {
//       name: gKey,
//       data: []
//     };
//     _.each(groupObj, gInfo => {
//       let index = _.indexOf(returnValue.range, gInfo[rangeKey]);
//       addObj.data[index] = gInfo[dataKey];
//     });
//     return addObj;
//   });
// }
