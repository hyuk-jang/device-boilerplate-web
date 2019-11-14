/**
 * @typedef {Object} subCategoryNameInfo subCategory 정보
 * @property {number} seq 시퀀스
 * @property {string} name 서브 카테고리 명
 */

/**
 * 페이지네이션 정보
 * @typedef {Object} pageInfo
 * @property {number} page
 * @property {number} pageListCount
 */

/**
 * Sub Category 정보
 * @typedef {Object} setCategoryInfo
 * @property {string} subCategory
 * @property {string} btnName
 */

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
 * @property {number=} scale 배율. 원 데이터에 해당 수치 곱셈 처리
 * @property {number=} toFixed 소수점 자리
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
 * @property {string=} yAxis.yTitle
 * @property {string=} yAxis.dataUnit
 * @property {plotOptions=} plotOptions
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
 * @typedef {Object} plotOptions
 * @property {plotOptionSplineInfo} spline 시작 UTC
 */

/**
 * @typedef {Object} plotOptionSplineInfo
 * @property {Object} marker 시작 UTC
 * @property {number} pointStart 시작 UTC
 * @property {number} pointInterval 시간 Interval
 */

/**
 * @typedef {Object} plotSeriesInfo
 * @property {number} pointStart 시작 UTC
 * @property {number} pointInterval 시간 Interval
 */

module;
