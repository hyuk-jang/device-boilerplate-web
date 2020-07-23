const _ = require('lodash');
const moment = require('moment');
const xss = require('xss');

const { BU } = require('base-util-jh');

/**
 * 날짜 데이터를 UTC 날짜로 변환 후 반환
 * @param {string|Date} date
 */
function convertDateToUTC(date) {
  // date = date instanceof Date ? date : moment(date).toDate();
  date = date instanceof Date ? date : BU.convertTextToDate(date);
  return Date.parse(date.addHours(9));
}
exports.convertDateToUTC = convertDateToUTC;

/**
 *
 * @param {string} projectMainId
 */
function convertProjectSource(projectMainId) {
  let projectName = '';
  let projectImg = '';
  let loginBG = '';

  switch (projectMainId) {
    case 'UPSAS':
      // projectImg = 'sm_logo.png';
      // projectName = '염전 수중 태양광 발전소 통합 관리 시스템 v1.0'; // FIXME: GS 인증으로 임시 변경
      projectImg = 'kepco_logo.png';
      projectName = '수중태양광 모니터링';
      break;
    case 'FP':
      projectImg = 'fp_logo.png';
      // projectName = '농업병행 태양광발전 모니터링';
      projectName = '영농형 태양광 통합 관리 시스템 v1.0';
      loginBG = 'bg_fp.jpg';
      break;
    case 'HS':
      projectImg = 's2w_logo.png';
      projectName = '농가 보급형 태양광';
      loginBG = 'bg_fp.jpg';
      break;
    case 'S2W':
      projectImg = 's2w_logo.png';
      projectName = '태양광 이모작 모니터링';
      loginBG = 'bg_fp.jpg';
      break;
    default:
      break;
  }

  return { projectName, projectImg, loginBG };
}
exports.convertProjectSource = convertProjectSource;

/**
 *
 * @param {Requst} req
 */
function applyHasNumbericReqToNumber(req) {
  // req.params 데이터 중 숫자형으로 변환될 수 있는 데이터는 숫자형으로 삽입
  _.forEach(req.params, (v, k) => {
    let convertValue = xss(v) === '' ? undefined : xss(v);
    convertValue = BU.isNumberic(convertValue) ? Number(convertValue) : convertValue;
    _.set(req.params, k, convertValue);
  });

  // req.query 데이터 중 숫자형으로 변환될 수 있는 데이터는 숫자형으로 삽입
  _.forEach(req.query, (v, k) => {
    let convertValue = xss(v) === '' ? undefined : xss(v);
    convertValue = BU.isNumberic(convertValue) ? Number(convertValue) : convertValue;
    _.set(req.query, k, convertValue);
  });

  _.forEach(req.body, (v, k) => {
    let convertValue = xss(v) === '' ? undefined : xss(v);
    convertValue = BU.isNumberic(convertValue) ? Number(convertValue) : convertValue;
    _.set(req.body, k, convertValue);
  });

  // _.forEach(req.body, (v, k) => {
  //   BU.isNumberic(req.params[k]) && _.set(req.body, k, Number(v));
  // });
}
exports.applyHasNumbericReqToNumber = applyHasNumbericReqToNumber;

/**
 * searchRange 형태를 분석하여 addUnit, addValue, momentFormat을 반환
 * @param {searchRange} searchRange
 * @param {string=} strStartDate 시작 날짜
 */
function getMomentFormat(searchRange, strStartDate = searchRange.strStartDate) {
  const { searchInterval } = searchRange;

  let addUnit = 'minutes';
  let addValue = 1;
  let momentFormat = 'YYYY-MM-DD HH:mm:ss';

  const plotSeries = {
    pointStart: moment(strStartDate)
      .add(9, 'hours')
      .valueOf(),
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
 * 1. DB에서 검색한 데이터 결과를 완전한 날짜를 지닌 Rows로 변환
 * 2. 해당 node_seq를 사용하는 PlaceRelation에 결합
 * Extends Place Realtion Rows With Perfect Sensor Report Rows
 * @param {V_DV_PLACE_RELATION[]} placeRelationRows
 * @param {Object[]} dataRows
 * @param {string[]} strGroupDateList
 */
function extPerfectRows(groupKey, dataRows, strGroupDateList) {
  // Node Seq 별로 그룹
  const dataRowsGroup = _.groupBy(dataRows, groupKey);

  _.keys(dataRowsGroup).forEach(groupSeq => {
    // 모든 날짜 목록을 순회하면서 빈 데이터 목록 생성
    const emptyDataRows = _.map(strGroupDateList, strGroupDate => ({
      [groupKey]: Number(groupSeq),
      group_date: strGroupDate,
    }));

    // BU.CLIN(emptySensorReportRows);
    // DB 데이터 상 데이터가 없는 곳은 emptyAvgSensorReport를 채워넣은 후 날짜 순으로 정렬
    const unionSensorReportRows = _(dataRowsGroup[groupSeq])
      .unionBy(emptyDataRows, 'group_date')
      .sortBy('group_date')
      .value();

    // BU.CLIN(unionSensorReportRows);
    //  union 처리 된 결과물을 재 정의
    _.set(dataRowsGroup, groupSeq, unionSensorReportRows);
  });

  return dataRowsGroup;
}
exports.extPerfectRows = extPerfectRows;
