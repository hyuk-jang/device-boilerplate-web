const _ = require('lodash');
const moment = require('moment');
const { BU } = require('base-util-jh');

/**
 * 실제 사용된 데이터 그룹 Union 처리하여 반환
 * @param {{group_date: string}[]} sensorGroupRows
 */
function getDistinctGroupDateList(sensorGroupRows) {
  return _(sensorGroupRows)
    .map('group_date')
    .union()
    .value();
}
exports.getDistinctGroupDateList = getDistinctGroupDateList;

/**
 * searchRange 형태를 분석하여 addUnit, addValue, momentFormat을 반환
 * @param {searchRange} searchRange
 */
function getSearchRangeWithMomentFormat(searchRange) {
  const { searchInterval } = searchRange;

  let addUnit = 'minutes';
  let addValue = 1;
  let momentFormat = 'YYYY-MM-DD HH:mm:ss';
  switch (searchInterval) {
    case 'min':
      addUnit = 'minutes';
      momentFormat = 'YYYY-MM-DD HH:mm';
      break;
    case 'min10':
      addUnit = 'minutes';
      addValue = 10;
      momentFormat = 'YYYY-MM-DD HH:mm';
      break;
    case 'hour':
      addUnit = 'hours';
      momentFormat = 'YYYY-MM-DD HH';
      break;
    case 'day':
      addUnit = 'days';
      momentFormat = 'YYYY-MM-DD';
      break;
    case 'month':
      addUnit = 'months';
      momentFormat = 'YYYY-MM';
      break;
    case 'year':
      addUnit = 'years';
      momentFormat = 'YYYY';
      break;
    default:
      break;
  }
  return {
    addUnit,
    addValue,
    momentFormat,
  };
}
exports.getSearchRangeWithMomentFormat = getSearchRangeWithMomentFormat;

/**
 * 실제 사용된 데이터 그룹 Union 처리하여 반환
 * @param {searchRange} searchRange
 */
function getGroupDateList(searchRange) {
  // BU.CLI(searchRange);
  const groupDateList = [];
  const { strStartDate, strEndDate } = searchRange;

  const { addUnit, addValue, momentFormat } = getSearchRangeWithMomentFormat(searchRange);

  const startMoment = moment(strStartDate);
  const endMoment = moment(strEndDate);

  while (startMoment.format(momentFormat) < endMoment.format(momentFormat)) {
    // string 날짜로 변환하여 저장
    groupDateList.push(startMoment.format(momentFormat));

    // 날짜 간격 더함
    startMoment.add(addValue, addUnit);
  }
  return groupDateList;
}
exports.getGroupDateList = getGroupDateList;

/**
 * 그루핑 데이터를 해당 장소에 확장
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {sensorAvgGroup[]} sensorGroupRows
 */
function extendsPlaceRelationRowsWithSensorGroupRows(placeRelationRows, sensorGroupRows) {
  _(sensorGroupRows)
    .groupBy('node_seq')
    .forEach((groupRows, strNodeSeq) => {
      // BU.CLI(groupRows);
      _.set(
        _.find(placeRelationRows, { node_seq: Number(strNodeSeq) }),
        'sensorGroupList',
        groupRows,
      );
    });
}
exports.extendsPlaceRelationRowsWithSensorGroupRows = extendsPlaceRelationRowsWithSensorGroupRows;

/**
 * Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {string[]} pickedNodeDefIds
 * @return {sensorReportStorageByPickNdId[]}
 */
function makeReportStorageListByPickedNdId(placeRelationRows, pickedNodeDefIds) {
  /** @type {sensorReportStorageByPickNdId[]} */
  const reportStorageList = _.map(pickedNodeDefIds, ndId => ({
    ndId,
    ndName: '',
    dataUnit: '',
    // strGroupDateList: [],
    mergedAvgList: [],
    mergedSumList: [],
    storageList: [],
  }));

  // 장소 관계를 순회하면서 해당 Reprot Key와 일치하는 곳에 데이터 정의
  _(placeRelationRows)
    .groupBy('nd_target_id')
    .forEach((v, ndTargetId) => {
      const foundStorage = _.find(reportStorageList, { ndId: ndTargetId });
      if (foundStorage) {
        const { nd_target_name: ndName, data_unit: dataUnit } = _.head(v);
        foundStorage.ndName = ndName;
        foundStorage.dataUnit = dataUnit;
        foundStorage.placeRelationRows = v;
      }
    });

  return reportStorageList;
}
exports.makeReportStorageListByPickedNdId = makeReportStorageListByPickedNdId;

/**
 * 센서 목록을 장소 순으로 묶은 후
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {V_DV_PLACE[]} placeRows
 * @param {string[]} pickedNodeDefIds
 */
function extendsPlaceRowsWithPlaceRelationRows(placeRelationRows, placeRows, pickedNodeDefIds) {
  placeRows.forEach(pRow => {
    pRow.sensorReportStorageList = makeReportStorageListByPickedNdId(
      placeRelationRows,
      pickedNodeDefIds,
    );
  });
}
exports.extendsPlaceRowsWithPlaceRelationRows = extendsPlaceRowsWithPlaceRelationRows;

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
    strGroupDateList = _.slice(strGroupDateList, firstRowNum, firstRowNum + pageListCount);
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
 * @param {sensorReportStorageByPickNdId[]} reportStorageList
 * @param {sensorGroupDateInfo=} groupDateInfo
 * @return {void}
 */
function calcMergedReportStorageList(reportStorageList, groupDateInfo) {
  const { strGroupDateList = [], page, pageListCount } = groupDateInfo;
  // BU.CLIS(page, pageListCount);

  reportStorageList.forEach(reportStorage => {
    reportStorage.strGroupDateList = strGroupDateList;
    // BU.CLI(reportStorage.placeRelationRows.length);
    const mapData = _(reportStorage.placeRelationRows)
      .map('sensorGroupList')
      .flatten()
      .value();

    // 평균 값
    reportStorage.mergedAvgList = strGroupDateList.map(strDate => {
      const mean = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_num_data')
        .mean();
      return _.isNaN(mean) ? '' : _.round(mean, 1);
    });

    // 합산 값
    reportStorage.mergedSumList = strGroupDateList.map(strDate => {
      const sum = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_num_data')
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
        .map('avg_num_data')
        .mean();
      return _.isNaN(mean) ? '' : _.round(mean, 1);
    });

    // 합산 값
    reportStorage.mergedSumList = strGroupDateList.map(strDate => {
      const sum = _(mapData)
        .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
        .map('avg_num_data')
        .sum();
      return _.isNaN(sum) ? '' : _.round(sum, 1);
    });
  });
}
exports.calcIndividualReportStorageList = calcIndividualReportStorageList;
// http://localhost:7500/report/1/sensor/9?searchType=hour&searchInterval=min10&searchOption=merge&strStartDateInputValue=2018-11-09&strEndDateInputValue=
