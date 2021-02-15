const _ = require('lodash');

// const a = [{a:1, v: 1}, {a:2, v:2}];
// const b = [{a:2, v: 1}, {a:3, v:3}];

// const res = _.unionBy(a, b, 'v')
// console.log(res);

const moment = require('moment');
const { BU } = require('base-util-jh');

/**
 *
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {Object} filterInfo
 */
function getPlaceRelationSeqList(placeRelationRows, filterInfo) {
  return _(placeRelationRows).filter(filterInfo).map('node_seq').union().value();
}
exports.getPlaceRelationSeqList = getPlaceRelationSeqList;

/**
 *
 * @param {V_DV_SENSOR_PROFILE[]} sensorProfileRows
 * @param {Object} calcOption
 * @param {string} calcOption.calcKey 계산하고자 하는 nd_target_id
 * @param {Date=} calcOption.standardDate 기준을 잡을 시간. default: Curr Date
 * @param {number=} calcOption.diffMinutes 유효한 현재 시간과의 차, default: 10
 * @param {string=} calcOption.lodashMathName 해당 calcKey들의 계산 결과(sum, mean), default: mean
 * @param {number=} calcOption.fixedCount 소수 점. default 1
 */
function calcSensorProfileRows(sensorProfileRows, calcOption) {
  const {
    calcKey,
    diffMinutes = 10,
    lodashMathName = 'mean',
    fixedCount = 1,
    standardDate = new Date(),
  } = calcOption;
  const validNumberList = _(sensorProfileRows)
    .filter(
      row =>
        _.eq(row.nd_target_id, calcKey) &&
        _.isNumber(row.node_data) &&
        moment(standardDate).diff(moment(row.writedate), 'minutes') < diffMinutes,
    )
    .map('node_data')
    .value();

  let result = 0;

  switch (lodashMathName) {
    case 'mean':
      result = _.round(_.mean(validNumberList), fixedCount);
      break;
    case 'sum':
      result = _.round(_.sum(validNumberList), fixedCount);
      break;
    default:
      break;
  }

  return _.isNaN(result) ? '-' : result;
}
exports.calcSensorProfileRows = calcSensorProfileRows;

/**
 * 실제 사용된 데이터 그룹 Union 처리하여 반환
 * @param {{group_date: string}[]} sensorGroupRows
 */
function getDistinctGroupDateList(sensorGroupRows) {
  return _(sensorGroupRows).map('group_date').union().value();
}
exports.getDistinctGroupDateList = getDistinctGroupDateList;

/**
 * searchRange 형태를 분석하여 addUnit, addValue, momentFormat을 반환
 * @param {searchRange} searchRange
 * @param {string=} strStartDate 시작 날짜
 */
function getMomentFormat(searchRange, strStartDate = searchRange.strStartDate) {
  const { searchInterval, searchType } = searchRange;

  let addUnit = 'minutes';
  let addValue = 1;
  let momentFormat = 'YYYY-MM-DD HH:mm:ss';

  const plotSeries = {
    pointStart: moment(strStartDate).add(9, 'hours').valueOf(),
    pointInterval: 0,
  };
  switch (searchInterval) {
    case 'min':
      addUnit = 'minutes';
      momentFormat = 'YYYY-MM-DD HH:mm';
      plotSeries.pointInterval = 1000 * 60;
      break;
    case 'min10':
      addUnit = 'minutes';
      addValue = 10;
      momentFormat = 'YYYY-MM-DD HH:mm';
      plotSeries.pointInterval = 1000 * 60 * 10;
      break;
    case 'hour':
      addUnit = 'hours';
      momentFormat = 'YYYY-MM-DD HH';
      plotSeries.pointInterval = 1000 * 60 * 60;
      break;
    case 'day':
      addUnit = 'days';
      momentFormat = 'YYYY-MM-DD';
      plotSeries.pointInterval = 1000 * 60 * 60 * 24;
      break;
    case 'month':
      addUnit = 'months';
      momentFormat = 'YYYY-MM';
      plotSeries.pointInterval = searchType === 'months' ? 1 : 12;
      break;
    // case 'year':
    //   addUnit = 'years';
    //   momentFormat = 'YYYY';
    //   break;
    default:
      break;
  }
  return {
    addUnit,
    addValue,
    momentFormat,
    plotSeries,
  };
}
exports.getMomentFormat = getMomentFormat;

/**
 * 실제 사용된 데이터 그룹 Union 처리하여 반환
 * @param {searchRange} searchRange
 * @param {{startHour: number, endHour: number}} controlHour
 */
function getGroupDateList(searchRange, controlHour = {}) {
  // BU.CLI(searchRange);
  const groupDateList = [];
  const { strStartDate, strEndDate } = searchRange;

  const { startHour = 0, endHour = 24 } = controlHour;

  const { addUnit, addValue, momentFormat } = getMomentFormat(searchRange);

  const startMoment = moment(strStartDate);
  const endMoment = moment(strEndDate);

  while (startMoment.format(momentFormat) < endMoment.format(momentFormat)) {
    if (startMoment.get('hour') >= startHour && startMoment.get('hour') < endHour) {
      // string 날짜로 변환하여 저장
      groupDateList.push(startMoment.format(momentFormat));
    }
    // 날짜 간격 더함
    startMoment.add(addValue, addUnit);
  }
  return groupDateList;
}
exports.getGroupDateList = getGroupDateList;

/**
 * 1. DB에서 검색한 Sensor 데이터 결과를 완전한 날짜를 지닌 Rows로 변환
 * 2. 해당 node_seq를 사용하는 PlaceRelation에 결합
 * Extends Place Realtion Rows With Perfect Sensor Report Rows
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {sensorReport[]} sensorReportRows
 * @param {string[]} strGroupDateList
 */
function extPlaRelPerfectSenRep(placeRelationRows, sensorReportRows, strGroupDateList) {
  // Node Seq 별로 그룹
  const groupedSensorReport = _.groupBy(sensorReportRows, 'node_seq');

  _.keys(groupedSensorReport).forEach(key => {
    // 모든 날짜 목록을 순회하면서 빈 데이터 목록 생성
    const emptySensorReportRows = _.map(strGroupDateList, strGroupDate => ({
      node_seq: Number(key),
      group_date: strGroupDate,
      avg_data: null,
    }));

    // BU.CLIN(emptySensorReportRows);
    // DB 데이터 상 데이터가 없는 곳은 emptyAvgSensorReport를 채워넣은 후 날짜 순으로 정렬
    const unionSensorReportRows = _(groupedSensorReport[key])
      .unionBy(emptySensorReportRows, 'group_date')
      .sortBy('group_date')
      .value();

    // BU.CLIN(unionSensorReportRows);
    //  union 처리 된 결과물을 재 정의
    _.set(groupedSensorReport, key, unionSensorReportRows);
  });

  _(groupedSensorReport).forEach((groupRows, strNodeSeq) => {
    // BU.CLI(groupRows);
    _.filter(placeRelationRows, { node_seq: Number(strNodeSeq) }).forEach(
      placeRelationRow => {
        placeRelationRow.sensorDataRows = groupRows;
        // _.set(placeRelationRow, 'sensorGroupList', groupRows);
      },
    );
  });
}
exports.extPlaRelPerfectSenRep = extPlaRelPerfectSenRep;

/**
 * 그루핑 데이터를 해당 장소에 확장
 * Extends Place Realtion Rows With Sensor Report Rows
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {sensorAvgGroup[]} sensorGroupRows
 */
function extPlaRelWithSenRep(placeRelationRows, sensorGroupRows) {
  _(sensorGroupRows)
    .groupBy('node_seq')
    .forEach((groupRows, strNodeSeq) => {
      // BU.CLI(groupRows);
      _.filter(placeRelationRows, { node_seq: Number(strNodeSeq) }).forEach(
        placeRelationRow => {
          placeRelationRow.sensorDataRows = groupRows;
          // _.set(placeRelationRow, 'sensorGroupList', groupRows);
        },
      );
    });
}
exports.extPlaRelWithSenRep = extPlaRelWithSenRep;

/**
 * Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {string[]} pickedNodeDefIds
 * @return {nodeDefStorage[]}
 */
function makeNodeDefStorageList(placeRelationRows, pickedNodeDefIds) {
  // BU.CLI(pickedNodeDefIds);
  /** @type {nodeDefStorage[]} */
  const reportStorageList = _.map(pickedNodeDefIds, ndId => ({
    ndId,
    ndName: '',
    dataUnit: '',
    // chartColor: '',
    // chartSortRank: 0,
    mergedAvgList: [],
    mergedSumList: [],
    storageList: [],
    nodePlaceList: [],
  }));

  // 장소 관계를 순회하면서 해당 Reprot Key와 일치하는 곳에 데이터 정의
  _(placeRelationRows)
    .groupBy('nd_target_id')
    .forEach((groupedRelationPlaceRows, strNdTargetId) => {
      const foundStorage = _.find(reportStorageList, { ndId: strNdTargetId });
      if (foundStorage) {
        const {
          nd_target_name: ndName,
          data_unit: dataUnit,
          // chart_color: chartColor,
          // chart_sort_rank: chartSortRank,
        } = _.head(groupedRelationPlaceRows);
        foundStorage.ndName = ndName;
        foundStorage.dataUnit = dataUnit;
        // foundStorage.chartColor = chartColor;
        // foundStorage.chartSortRank = chartSortRank;
        foundStorage.nodePlaceList = _.sortBy(
          groupedRelationPlaceRows,
          'chart_sort_rank',
        );
      }
    });

  return reportStorageList;
}
exports.makeNodeDefStorageList = makeNodeDefStorageList;

/**
 * Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
 * @param {V_DV_PLACE[]} placeRows
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {{key: string, protocol: string}[]} protocolList
 */
function extPlaWithPlaRel(placeRows, placeRelationRows, protocolList) {
  // 장소 단위로 그루핑
  const groupedPlaRel = _.groupBy(placeRelationRows, 'place_seq');

  // 그루핑 된 PR과 일치하는 Place의 정보를 가져온 뒤 해당 Place에 Sensor Report Storage List를  추가
  const reportStorageList = _.map(groupedPlaRel, (plaRelPartRows, strPlaceSeq) => {
    const placeRow = _.find(placeRows, { place_seq: Number(strPlaceSeq) });
    // FIXME: protocolKey를 뽑아서 처리함. Action 별로 처리해야 함
    placeRow.nodeDefStorageList = makeNodeDefStorageList(
      plaRelPartRows,
      _.map(protocolList, 'key'),
    );

    return placeRow;
  });

  return reportStorageList;
}
exports.extPlaWithPlaRel = extPlaWithPlaRel;

/**
 * 센서 목록을 장소 순으로 묶은 후
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {V_DV_PLACE[]} placeRows
 * @param {string[]} pickedNodeDefIds
 */
function extPlaRowsPlaRelRows(placeRelationRows, placeRows, pickedNodeDefIds) {
  placeRows.forEach(pRow => {
    pRow.sensorRepStorageList = makeNodeDefStorageList(
      placeRelationRows,
      pickedNodeDefIds,
    );
  });
}
exports.extPlaRowsPlaRelRows = extPlaRowsPlaRelRows;

/**
 * page 정보에 따라 보여줄 항목(일시)을 계산
 * @param {string[]} strGroupDateList
 * @param {{page: number, pageListCount: number}=} pageOption
 * @return {sensorGroupDateInfo}
 */
function sliceStrGroupDateList(strGroupDateList = [], pageOption) {
  const { page, pageListCount } = pageOption;

  // page 정보 단위로 구간을 계산하고자 할 경우
  if (_.isNumber(page) && _.isNumber(pageListCount)) {
    const firstRowNum = (page - 1) * pageListCount;
    strGroupDateList = _.slice(
      strGroupDateList,
      firstRowNum,
      firstRowNum + pageListCount,
    );
  }

  return {
    strGroupDateList,
    page,
    pageListCount,
  };
}
exports.sliceStrGroupDateList = sliceStrGroupDateList;

/**
 * 저장소 목록의 StorageList의 데이터 계산을 하고자 할 경우
 * @param {nodeDefStorage[]} nodeDefStorageList
 * @param {sensorGroupDateInfo=} groupDateInfo
 * @return {void}
 */
function calcMergedReportStorageList(nodeDefStorageList, groupDateInfo) {
  const { strGroupDateList = [], page, pageListCount } = groupDateInfo;
  // BU.CLIS(page, pageListCount);

  nodeDefStorageList.forEach(nodeDefStorage => {
    const mapData = _(nodeDefStorage.nodePlaceList)
      .map('sensorDataRows')
      .flatten()
      .value();

    // 평균 값
    nodeDefStorage.mergedAvgList = strGroupDateList.map(strDate => {
      const mean = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_data')
        .mean();
      return _.isNaN(mean) ? '' : _.round(mean, 1);
    });

    // 합산 값
    nodeDefStorage.mergedSumList = strGroupDateList.map(strDate => {
      const sum = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_data')
        .sum();
      return _.isNaN(sum) ? '' : _.round(sum, 1);
    });
  });
}
exports.calcMergedReportStorageList = calcMergedReportStorageList;

/**
 * 저장소 목록의 StorageList의 데이터 계산을 하고자 할 경우
 * @param {sensorReportStorageByPickNdId[]} reportStorageList
 * @param {string[]=} strGroupDateList mergedList를 뽑아내고 싶을 경우 날짜 목록 사용
 * @return {void}
 */
function calcIndividualReportStorageList(reportStorageList, strGroupDateList) {
  reportStorageList.forEach(reportStorage => {
    reportStorage.placeRelationRows.forEach(placeReationRow => {});

    const mapData = _(reportStorage.placeRelationRows)
      .map('sensorGroupList')
      .flatten()
      .value();

    // 평균 값
    reportStorage.mergedAvgList = strGroupDateList.map(strDate => {
      const mean = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_data')
        .mean();
      return _.isNaN(mean) ? '' : _.round(mean, 1);
    });

    // 합산 값
    reportStorage.mergedSumList = strGroupDateList.map(strDate => {
      const sum = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_data')
        .sum();
      return _.isNaN(sum) ? '' : _.round(sum, 1);
    });
  });
}
exports.calcIndividualReportStorageList = calcIndividualReportStorageList;
// http://localhost:7500/report/1/sensor/9?searchType=hour&searchInterval=min10&searchOption=merge&strStartDateInputValue=2018-11-09&strEndDateInputValue=

// ************************** Chart 관련 *****************************
/**
 *
 * @param {Object} chartConfig 차트를 만들기 위한 생성 정보
 * @param {string} chartConfig.domId
 * @param {string} chartConfig.title
 * @param {string} chartConfig.subtitle
 * @param {Object[]} chartConfig.chartOptionList
 * @param {string[]} chartConfig.chartOptionList.keys
 * @param {string[]} chartConfig.chartOptionList.mixColors
 * @param {string} chartConfig.chartOptionList.yTitle
 * @param {string} chartConfig.chartOptionList.dataUnit
 * @param {nodeDefStorage[]} nodeDefStorageList
 * @param {number[]} utcList UTC 날짜 목록
 */
function makeSensorChart(chartConfig, nodeDefStorageList, utcList) {
  // 차트 생성하기 위한 설정
  const { domId, title = '', subtitle = '', chartOptionList } = chartConfig;
  // 정제된 차트 정보
  const refinedChart = { domId, title, subtitle, yAxis: [], series: [] };
  // 차트 옵션 정보(index: 0 --> 좌측, index: 1 --> 우측) 순회
  chartOptionList.forEach((chartOption, yAxis) => {
    // FIXME: 현재는 LEFT Y 축만을 표현함. 차후 RIGHT 필요시 수정
    // 보여줄 축 정보
    const { dataUnit, yTitle, keys, mixColors } = chartOption;
    // Y축 표현 정보 삽입
    refinedChart.yAxis.push({
      yTitle,
      dataUnit,
    });
    // Node Def ID 목록을 순회하면서 Nod Def Storage 정보를 바탕으로 차트 정보를 구성
    keys.forEach((ndId, index) => {
      // 표현할 Node Def Storage 목록에 해당 ndId를 가진 객체를 찾음.
      const nodeDefStorage = _.find(nodeDefStorageList, { ndId });

      // BU.CLIN(nodeDefStorage);
      // Node Def ID를 가진 저장소가 있을 경우
      if (!_.isUndefined(nodeDefStorage)) {
        nodeDefStorage.nodePlaceList.forEach(nodePlace => {
          const { node_name: ndName = '' } = nodePlace;
          let { chart_color: chartColor = '' } = nodePlace;

          // 같은 Place에 위치한 Node의 경우 색상이 같으므로 색상 표현을 다르게 하기 위한 논리
          if (
            _.isString(chartColor) &&
            chartColor.length &&
            _.isString(mixColors[index])
          ) {
            // keys 와 mixColors는 서로 대칭을 이루므로 해당 index의 mixColors를 가져옴
            chartColor = BU.blendColors(chartColor, mixColors[index], 0.5);
          }

          const chartSeriesInfo = {
            // 차트 컬럼 개체 명
            name: ndName,
            // 차트 컬럼 개체 색상
            color: chartColor,
            // 차트를 마우스 오버 하였을 경우 나타나는 단위
            tooltip: {
              valueSuffix: dataUnit,
            },
            yAxis,
            // dataTable. 각 데이터는 [[utc, data][...]] 이룸
            data: _.zip(utcList, _.map(nodePlace.sensorDataRows, 'avg_data')),
          };
          refinedChart.series.push(chartSeriesInfo);
        });
      }
    });
  });

  return refinedChart;
}
exports.makeSensorChart = makeSensorChart;
/**
 *
 * @param {Object} chartConfig 차트를 만들기 위한 생성 정보
 * @param {string} chartConfig.domId
 * @param {string} chartConfig.title
 * @param {string} chartConfig.subtitle
 * @param {Object[]} chartConfig.chartOptionList
 * @param {string[]} chartConfig.chartOptionList.keys
 * @param {string[]} chartConfig.chartOptionList.mixColors
 * @param {string} chartConfig.chartOptionList.yTitle
 * @param {string} chartConfig.chartOptionList.dataUnit
 * @param {nodeDefStorage[]} nodeDefStorageList
 * @param {plotSeriesInfo} plotSeries
 */
function makeSimpleLineChart(chartConfig, nodeDefStorageList, plotSeries = {}) {
  // 차트 생성하기 위한 설정
  const { domId, title = '', subtitle = '', chartOptionList } = chartConfig;
  // 정제된 차트 정보
  const refinedChart = {
    domId,
    title,
    subtitle,
    xAxis: {},
    yAxis: [],
    plotSeries,
    series: [],
  };

  refinedChart.xAxis.min = plotSeries.pointStart;
  let xAxisLength = 0;

  // 차트 옵션 정보(index: 0 --> 좌측, index: 1 --> 우측) 순회
  chartOptionList.forEach((chartOption, yAxis) => {
    // FIXME: 현재는 LEFT Y 축만을 표현함. 차후 RIGHT 필요시 수정
    // 보여줄 축 정보
    const { dataUnit = '', yTitle, keys, mixColors } = chartOption;
    // Y축 표현 정보 삽입
    refinedChart.yAxis.push({
      yTitle,
      dataUnit,
    });

    // Node Def ID 목록을 순회하면서 Nod Def Storage 정보를 바탕으로 차트 정보를 구성
    keys.forEach((ndId, index) => {
      // 표현할 Node Def Storage 목록에 해당 ndId를 가진 객체를 찾음.
      const nodeDefStorage = _.find(nodeDefStorageList, { ndId });

      // BU.CLIN(nodeDefStorage);
      // Node Def ID를 가진 저장소가 있을 경우
      if (!_.isUndefined(nodeDefStorage)) {
        nodeDefStorage.nodePlaceList.forEach(nodePlace => {
          const {
            node_name: ndName = '',
            place_node_name: placeNodeName,
            sensorDataRows = [],
          } = nodePlace;
          let { chart_color: chartColor = '' } = nodePlace;

          // 같은 Place에 위치한 Node의 경우 색상이 같으므로 색상 표현을 다르게 하기 위한 논리
          if (
            _.isString(chartColor) &&
            chartColor.length &&
            _.isString(mixColors[index])
          ) {
            // keys 와 mixColors는 서로 대칭을 이루므로 해당 index의 mixColors를 가져옴
            chartColor = BU.blendColors(chartColor, mixColors[index], 0.5);
          }

          xAxisLength = sensorDataRows.length;

          const chartSeriesInfo = {
            // type: 'spline',
            // 차트 컬럼 개체 명
            name: ndName,
            yAxis,
            // 차트 컬럼 개체 색상
            color: chartColor,
            // 차트를 마우스 오버 하였을 경우 나타나는 단위
            tooltip: {
              valueSuffix: dataUnit,
            },
            // dataTable. 각 데이터는 [[utc, data][...]] 이룸
            data: _.map(nodePlace.sensorDataRows, 'avg_data'),
          };

          if (plotSeries.pointInterval < 13 && plotSeries.pointInterval > 0) {
            chartSeriesInfo.data = Array(plotSeries.pointInterval)
              .fill(null)
              .map((data, idx) => [
                moment(plotSeries.pointStart).add(idx, 'months').valueOf(),
                _.get(sensorDataRows[idx], 'avg_data', null),
              ]);

            delete plotSeries.pointInterval;
          } else {
            chartSeriesInfo.data = _.map(nodePlace.sensorDataRows, 'avg_data');
          }

          refinedChart.series.push(chartSeriesInfo);
        });
      }
    });
  });

  refinedChart.xAxis.max = plotSeries.pointStart + xAxisLength * plotSeries.pointInterval;

  return refinedChart;
}
exports.makeSimpleLineChart = makeSimpleLineChart;
