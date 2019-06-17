/**
 * @typedef {Object} domMainSensor
 * @property {string} ndId Node Def Id
 * @property {string} ndName 데이터 명
 * @property {string} dataUnit 데이터 단위
 * @property {string|number} value 데이터 값
 */

/**
 * @typedef {Object} lineChartConfig
 * @property {string} domId
 * @property {string=} title
 * @property {string=} subtitle
 * @property {Object[]} yAxisList
 * @property {string} yAxisList.dataUnit
 * @property {string} yAxisList.yTitle
 * @property {chartOption} chartOption
 
 */

/**
 * @typedef {Object} lineChartInfo
 * @property {string} domId
 * @property {string=} title
 * @property {string=} subtitle
 * @property {Object} xAxis
 * @property {string=} xAxis.title
 * @property {Object[]} yAxis
 * @property {string=} yAxis.title
 * @property {string=} yAxis.dataUnit
 * @property {plotSeries=} plotSeries
 * @property {chartSeriesInfo[]} series
 */

/**
 * @typedef {Object} chartSeriesInfo
 * @property {string} name
 * @property {number[]} data
 * @property {number} yAxis 0: left, 1: right
 * @property {string=} color 카테고리 색상
 * @property {string=} type 라인 차트 종류 'default', 'area'
 * @property {string=} sortKey 서버 Back 단에서 차트를 정렬하기 위하여 쓰임.(선택)
 * @property {Object} tooltip
 * @property {string} tooltip.valueSuffix Data Unit
 */

/**
 * @typedef {Object} plotSeries
 * @property {number} pointStart 시작 UTC
 * @property {number} pointInterval 시간 Interval
 */

module;
