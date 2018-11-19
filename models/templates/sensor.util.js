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
function getMomentFormat(searchRange) {
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
exports.getMomentFormat = getMomentFormat;

/**
 * 실제 사용된 데이터 그룹 Union 처리하여 반환
 * @param {searchRange} searchRange
 */
function getGroupDateList(searchRange) {
  // BU.CLI(searchRange);
  const groupDateList = [];
  const { strStartDate, strEndDate } = searchRange;

  const { addUnit, addValue, momentFormat } = getMomentFormat(searchRange);

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

    // DB 데이터 상 데이터가 없는 곳은 emptyAvgSensorReport를 채워넣음
    const unionSensorReportRows = _.unionBy(
      groupedSensorReport[key],
      emptySensorReportRows,
      'group_date',
    );

    //  union 처리 된 결과물을 재 정의
    _.set(groupedSensorReport, key, unionSensorReportRows);
  });

  _(groupedSensorReport).forEach((groupRows, strNodeSeq) => {
    // BU.CLI(groupRows);
    _.filter(placeRelationRows, { node_seq: Number(strNodeSeq) }).forEach(placeRelationRow => {
      placeRelationRow.sensorDataRows = groupRows;
      // _.set(placeRelationRow, 'sensorGroupList', groupRows);
    });
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
      _.filter(placeRelationRows, { node_seq: Number(strNodeSeq) }).forEach(placeRelationRow => {
        _.set(placeRelationRow, 'sensorGroupList', groupRows);
      });
    });
}
exports.extPlaRelWithSenRep = extPlaRelWithSenRep;

/**
 * Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {string[]} pickedNodeDefIds
 * @return {nodeDefStorage[]}
 */
function makeRepStorageList(placeRelationRows, pickedNodeDefIds) {
  // BU.CLI(pickedNodeDefIds);
  /** @type {nodeDefStorage[]} */
  const reportStorageList = _.map(pickedNodeDefIds, ndId => ({
    ndId,
    ndName: '',
    dataUnit: '',
    mergedAvgList: [],
    mergedSumList: [],
    storageList: [],
    nodePlaceList: [],
  }));

  // 장소 관계를 순회하면서 해당 Reprot Key와 일치하는 곳에 데이터 정의
  _(placeRelationRows)
    .groupBy('nd_target_id')
    .forEach((groupedRelationPlaceRows, ndTargetId) => {
      const foundStorage = _.find(reportStorageList, { ndId: ndTargetId });
      if (foundStorage) {
        const { nd_target_name: ndName, data_unit: dataUnit } = _.head(groupedRelationPlaceRows);
        foundStorage.ndName = ndName;
        foundStorage.dataUnit = dataUnit;
        foundStorage.nodePlaceList = groupedRelationPlaceRows;
      }
    });

  return reportStorageList;
}
exports.makeRepStorageList = makeRepStorageList;

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
    placeRow.nodeDefStorageList = makeRepStorageList(plaRelPartRows, _.map(protocolList, 'key'));

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
    pRow.sensorRepStorageList = makeRepStorageList(placeRelationRows, pickedNodeDefIds);
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
