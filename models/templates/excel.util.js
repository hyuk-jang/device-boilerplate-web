// const _ = require('underscore');
const _ = require('lodash');
const XLSX = require('xlsx');

const { BU } = require('base-util-jh');
const webUtil = require('./web.util');

/**
 * @typedef {Object} createExcelOption
 * @property {weatherTrend[]} weatherTrend
 * @property {calendarComment[]} calendarCommentList
 * @property {searchRange} searchRange
 * @property {chartData} powerChartData
 * @property {weatherCastRowDataPacket[]} weatherCastRowDataPacketList
 * @property {V_INVERTER_STATUS[]} viewInverterStatusList
 * @property {chartDecoration} powerChartDecoration
 * @property {waterLevelDataPacket[]} waterLevelDataPacketList
 * @property {weatherChartOption[]} weatherChartOptionList
 * @property {deviceChartInfo} deviceChartInfo
 * @property {Object[]} inverterTrend
 */

/**
 * searchRange Type
 * @typedef {Object} deviceChartInfo
 * @property {{sensorTrend: V_DV_SENSOR_DATA[], sensorChartData: chartData}} moduleRearTemperatureChartInfo 인버터 장치 시퀀스
 * @property {{sensorTrend: V_DV_SENSOR_DATA[], sensorChartData: chartData}} brineTemperatureChartInfo 인버터 장치 시퀀스
 */

/**
 * searchRange Type
 * @typedef {Object} waterLevelDataPacket
 * @property {number} inverter_seq 인버터 장치 시퀀스
 * @property {number} water_level 수위
 * @property {string} view_date 차트에 표현할 Date Format
 * @property {string} group_date 그룹 처리한 Date Format
 */

// function

const weatherCastOptionList = [{ name: '운량', selectKey: 'avg_sky', dateKey: 'group_date' }];

/**
 * 차트 데이터
 * @param {string} char
 * @param {number} nextIndex
 */
function getNextAlphabet(char, nextIndex) {
  // Z 열을 초과할 경우
  let header = '';
  let body = char;
  if (char.length > 1) {
    header = char.slice(0, 1);
    body = char.slice(1);
  }
  let charHexCode = Number(body.charCodeAt());

  charHexCode += nextIndex;
  // Z를 넘을 경우
  if (charHexCode > 90) {
    charHexCode = _.add(64, _.subtract(charHexCode, 90));
    if (header === '') {
      header = 'A';
    } else {
      let headerHexCode = Number(header.charCodeAt());
      headerHexCode += 1;
      header = Buffer.from([headerHexCode]).toString();
    }
  }
  return header + Buffer.from([charHexCode]).toString();
}

/**
 * Trend를 기준 날짜에 매칭시켜 Report 형태로 변환 후 반환
 * @param {[]} excelDataRows
 * @param {string[]} baseDateList
 * @param {{blockRows: Object[], blockViewOptionList[]}} blockTable
 */
function makeBlockToTable(excelDataRows, baseDateList, blockTable = {}) {
  const returnValue = excelDataRows;

  const { blockRows = [], blockViewOptionList } = blockTable;

  const blockDataKeyList = _(blockViewOptionList)
    .map('dataKey')
    .values()
    .value();

  // 기준이 되는 날짜를 기준으로 매칭되는 객체를 찾은 후 해당 객체에서 데이터를 반복해서 가져와 삽입
  baseDateList.forEach((strDate, index) => {
    returnValue[index] = _.isUndefined(returnValue[index]) ? [] : returnValue[index];
    // BU.CLI(returnValue[index]);
    if (_.isEmpty(returnValue[index])) {
      returnValue[index].push(strDate);
    }

    // 날짜 값이 같은 개체를 찾음
    const foundBlock = _.find(blockRows, { group_date: strDate });
    // BU.CLI(foundBlock);

    // 있다면 데이터 삽입 준비
    if (foundBlock) {
      _.map(blockViewOptionList, blockViewInfo => {
        // 가져올 객체 Key, 배율, 소수점 이하 자리수
        const { dataKey, scale, toFixed = 1 } = blockViewInfo;
        // 데이터 객체에서 Key가 매칭되는 데이터를 가져옴
        let dataValue = _.get(foundBlock, [dataKey], null);
        // 데이터가 존재하고 배율 옵션이 있다면 처리
        if (dataValue) {
          if (_.isNumber(scale)) {
            dataValue = _.multiply(dataValue, scale);
          }
          if (_.isNumber(toFixed)) {
            dataValue = _.round(dataValue, toFixed);
          }
        }
        // 기존 데이터 객체에 덮어씌움.
        _.set(foundBlock, dataKey, dataValue);
      });
      // BU.CLI(foundBlock);
      // 찾은 데이터 객체에서 사용될 데이터 Key 목록으로 데이터를 구성함
      const dataTable = _.map(blockDataKeyList, key => {
        return _.get(foundBlock, key, null);
      });

      // 기존 excelDataList에 붙임
      returnValue[index] = _.concat(returnValue[index], dataTable);
    } else {
      const dataTable = _.map(blockDataKeyList, () => null);
      returnValue[index] = _.concat(returnValue[index], dataTable);
    }
  });
  return returnValue;
}

/**
 * Trend를 기준 날짜에 매칭시켜 Report 형태로 변환 후 반환
 * @param {[]} excelDataRows
 * @param {string[]} baseDateList
 * @param {{trend: Object[], pickValueKeyList: string[]}[]} trendInfoList
 */
function makeTrendToReport(excelDataRows, baseDateList, trendInfoList) {
  const returnValue = excelDataRows;

  baseDateList.forEach((strDate, index) => {
    returnValue[index] = _.isUndefined(returnValue[index]) ? [] : returnValue[index];
    // BU.CLI(returnValue[index]);
    if (_.isEmpty(returnValue[index])) {
      returnValue[index].push(strDate);
    }
    trendInfoList.forEach(trendInfo => {
      // null이라면 한칸 띄움
      if (_.isNull(trendInfo)) {
        return returnValue[index].push('');
      }
      const { trend, pickValueKeyList } = trendInfo;
      // BU.CLI(pickValueKeyList);

      pickValueKeyList.forEach(pickValueKey => {
        returnValue[index].push(_.get(_.find(trend, { view_date: strDate }), pickValueKey, ''));
      });
    });
  });
  return returnValue;
}

/**
 *
 * @param {calendarCommentList} calendarCommentList
 */
function makeComment(calendarCommentList) {
  const commentInfo = ['특이사항'];
  let comment = '';
  // 테스트 달력의 금일 에러 여부를 반영
  const calendarComment = _.head(calendarCommentList);
  const calendarErrorNum = _.get(calendarComment, 'is_error');

  switch (calendarErrorNum) {
    case 0:
      comment += '테스트 O';
      break;
    case 1:
      comment += '테스트 X:';
      break;
    case 2:
      comment += '테스트 X: 비';
      break;
    default:
      break;
  }
  // 테스트 달력에서 부연 설명이 있다면 반영
  const commentData = _.get(calendarComment, 'comment', '');
  comment += commentData === null ? '' : ` ${commentData}`;
  commentInfo.push(comment);

  return commentInfo;
}

/**
 * 차트 데이터
 * @param {createExcelOption} resource
 */
function makeChartDataToExcelWorkSheet(resource) {
  const ws = XLSX.utils.aoa_to_sheet([]);
  // BU.CLI(viewInverterPacketList);

  // BU.CLI(powerChartData);
  const {
    calendarCommentList,
    inverterTrend,
    powerChartData,
    powerChartDecoration,
    searchRange,
    waterLevelDataPacketList,
    weatherCastRowDataPacketList,
    weatherTrend,
    weatherChartOptionList,
    deviceChartInfo,
  } = resource;
  const viewInverterStatusList = _.sortBy(resource.viewInverterStatusList, 'chart_sort_rank');

  // BU.CLI(mrtTrend);
  let sumIntervalPowerList = [];

  // 검색 기간
  const { rangeStart } = searchRange;
  const sheetName = rangeStart + (searchRange.rangeEnd === '' ? '' : ` ~ ${searchRange.rangeEnd}`);

  /** 개요 구성 시작 */
  const searchList = ['검색 기간', powerChartDecoration.mainTitle];

  // 테스트 한 결과 코멘트 작성
  const commentInfo = makeComment(calendarCommentList);

  let powerName = '';
  // 기간 발전량
  switch (searchRange.searchType) {
    case 'hour':
    case 'min10':
    case 'min':
      powerName = '1일';
      break;
    default:
      powerName = '총';
      break;
  }
  // 발전 현황에 계산된 개요 추출
  const powerChartDataOptionList = _.map(powerChartData.series, chartInfo => chartInfo.option);
  // 모듈 뒷면 온도에 계산된 개요 추출
  const mrtChartDataOptionList = _.map(
    deviceChartInfo.moduleRearTemperatureChartInfo.sensorChartData.series,
    chartInfo => chartInfo.option,
  );
  // 수온에 계산된 개요 추출
  const btChartDataOptionList = _.map(
    deviceChartInfo.brineTemperatureChartInfo.sensorChartData.series,
    chartInfo => chartInfo.option,
  );
  ws.B4 = {
    t: 's',
    v: `가중치 미적용 \n${powerName} ${powerChartDecoration.yAxisTitle}`,
  };
  ws.B5 = { t: 's', v: '비교(%)' };
  ws.B6 = { t: 's', v: '가중치' };
  ws.B7 = { t: 's', v: `가중치 적용 \n${powerName} ${powerChartDecoration.yAxisTitle}` };
  ws.B8 = { t: 's', v: '비교(%)' };
  ws.B9 = { t: 's', v: '이용률(%)' };
  ws.B10 = { t: 's', v: '발전효율(%)' };
  ws.B11 = { t: 's', v: '수위(cm)' };
  ws.B12 = { t: 's', v: '모듈 온도(℃)' };
  ws.B13 = { t: 's', v: '수온(℃)' };
  ws.B15 = { t: 's', v: powerChartDecoration.xAxisTitle };

  // 시작 지점 입력
  const fixedSummeryColumn = 'C';
  let summeryColumn = fixedSummeryColumn;
  // 인버터 종류별로 반복
  viewInverterStatusList.forEach(viewInverterStatusInfo => {
    // 컬럼 HexCode 값을 Str으로 변형
    viewInverterStatusInfo.columnName = summeryColumn;
    summeryColumn = getNextAlphabet(summeryColumn, 2);
  });

  // 인버터 종류 별로 반복
  viewInverterStatusList.forEach(viewInverterStatusInfo => {
    const foundOptionIt = _.find(powerChartDataOptionList, {
      sort: viewInverterStatusInfo.chart_sort_rank,
    });
    const foundForeginOptionIt = _.find(viewInverterStatusList, {
      compare_inverter_seq: viewInverterStatusInfo.compare_inverter_seq,
    });
    const subData = _.subtract(_.get(foundOptionIt, 'max'), _.get(foundOptionIt, 'min'));
    const { columnName, target_name } = viewInverterStatusInfo;
    const waterLevel = _.get(
      _.find(waterLevelDataPacketList, {
        inverter_seq: viewInverterStatusInfo.inverter_seq,
      }),
      'water_level',
      '',
    );
    // 인버터 명
    ws[`${columnName}3`] = { t: 's', v: target_name };
    // 가중치 미적용
    ws[`${columnName}4`] = { t: 'n', v: subData };
    XLSX.utils.cell_set_number_format(ws[`${columnName}4`], '#,#0.0##');
    // 가중치 미적용 비교
    ws[`${columnName}5`] = {
      t: 'n',
      f: `${columnName}4/${foundForeginOptionIt.columnName}4`,
    };
    XLSX.utils.cell_set_number_format(ws[`${columnName}5`], '0.0%');
    // 가중치
    ws[`${columnName}6`] = { t: 'n', v: _.get(foundOptionIt, 'scale') || '' };
    // 가중치 적용
    ws[`${columnName}7`] = { t: 'n', f: `${columnName}4*${columnName}6` };
    XLSX.utils.cell_set_number_format(ws[`${columnName}7`], '#,#0.0##');
    // 가중치 적용 비교
    ws[`${columnName}8`] = {
      t: 'n',
      f: `${columnName}7/${foundForeginOptionIt.columnName}7`,
    };
    XLSX.utils.cell_set_number_format(ws[`${columnName}8`], '0.0%');

    // 24시간 발전 용량 Wh(kw -> w 1000배, Scale 10 나눔 ---> 100(시간당 발전용량))
    // FIXME: 월 단위는 계산식 틀림. 일단 놔둠.
    // BU.CLI(viewInverterPacket.pv_amount);
    let inverterAmount = _.multiply(viewInverterStatusInfo.pv_amount);
    inverterAmount = webUtil.convertValueBySearchType(inverterAmount, searchRange.searchType);
    // 24시간 대비 이용률
    ws[`${columnName}9`] = { t: 'n', f: `${columnName}7/(${inverterAmount}*24)` };
    XLSX.utils.cell_set_number_format(ws[`${columnName}9`], '0.0%');

    // 가중치가 적용된 발전 효율
    if (viewInverterStatusInfo.install_place === '수중') {
      ws[`${columnName}10`] = { t: 'n', f: `${columnName}7/(P5 * 0.975 * 1.65 * 6)` };
    } else {
      ws[`${columnName}10`] = { t: 'n', f: `${columnName}7/(Q5 * 0.975 * 1.65 * 6)` };
    }

    XLSX.utils.cell_set_number_format(ws[`${columnName}10`], '0.0%');

    // BU.CLI(ws);
    // 수위
    ws[`${columnName}11`] = { t: 'n', v: waterLevel };

    // 모듈 온도
    const foundMrtOptionIt = _.find(mrtChartDataOptionList, {
      sort: viewInverterStatusInfo.chart_sort_rank,
    });
    ws[`${columnName}12`] = {
      t: 'n',
      v: _.round(_.get(foundMrtOptionIt, 'aver', ''), 1),
    };

    // 모듈 수온
    const foundbtOptionIt = _.find(btChartDataOptionList, {
      sort: viewInverterStatusInfo.chart_sort_rank,
    });

    if (_.get(foundbtOptionIt, 'aver', '') === '') {
      ws[`${columnName}13`] = { t: 'n', v: '' };
    } else {
      ws[`${columnName}13`] = {
        t: 'n',
        v: _.round(_.get(foundbtOptionIt, 'aver', ''), 1),
      };
    }
  });

  // BU.CLI(ws);
  /** 기상 개요 구성 시작 */
  summeryColumn = getNextAlphabet(summeryColumn, 1);
  ws[summeryColumn + 3] = { t: 's', v: '기상계측장치' };

  // 기상 계측 장치 옵션 만큼 반복
  // BU.CLI(weatherChartOptionList);
  weatherChartOptionList.forEach(currentItem => {
    let strDataName = currentItem.name;
    strDataName = _.replace(strDataName, '(', '\n(');
    let data = 0;
    let tempStr = '';
    switch (currentItem.selectKey) {
      case 'avg_solar':
        tempStr = ['min', 'min10', 'hour'].includes(searchRange.searchType) ? 'Wh/m²' : 'kWh/m²';
        strDataName = `총 수평 일사량\n(${tempStr})`;
        data = _.sumBy(weatherTrend, 'total_interval_solar');
        break;
      case 'avg_inclined_solar':
        tempStr = ['min', 'min10', 'hour'].includes(searchRange.searchType) ? 'Wh/m²' : 'kWh/m²';
        strDataName = `총 경사 일사량\n(${tempStr})`;
        data = _.sumBy(weatherTrend, 'total_interval_inclined_solar');
        break;
      default:
        strDataName = `평균 ${strDataName}`;
        data = _.meanBy(weatherTrend, currentItem.selectKey);
        break;
    }
    data = _.isNil(data) ? '' : _.round(data, 1);
    ws[`${summeryColumn}4`] = { t: 's', v: strDataName };
    ws[`${summeryColumn}5`] = { t: 'n', v: data };
    XLSX.utils.cell_set_number_format(ws[`${summeryColumn}5`], '#,#0.0##');
    currentItem.columnName = summeryColumn;
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  // 기상청 옵션 만큼 반복
  ws[summeryColumn + 3] = { t: 's', v: '기상청' };
  weatherCastOptionList.forEach(currentItem => {
    let strDataName = currentItem.name;
    // ws[`${summeryColumn}15`] = {t: 's', v: strDataName};
    strDataName = _.replace(strDataName, '(', '\n(');
    let data = 0;
    switch (currentItem.selectKey) {
      case '':
      default:
        strDataName = `평균 ${strDataName}`;
        data = _.round(_.meanBy(weatherCastRowDataPacketList, currentItem.selectKey), 1);
        break;
    }
    ws[`${summeryColumn}4`] = { t: 's', v: strDataName };
    ws[`${summeryColumn}5`] = { t: 'n', v: data };
    XLSX.utils.cell_set_number_format(ws[`${summeryColumn}5`], '#,#0.0##');
    currentItem.columnName = summeryColumn;
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  /** 기상 개요 구성 끝 */

  /** 데이터 바디 시작 */
  const excelDataList = [];
  // 기준 시간
  const defaultRange = powerChartData.range;
  // 발전 현황
  const groupingInverterTrend = _.groupBy(inverterTrend, 'chart_sort_rank');

  //  개요 구성
  summeryColumn = fixedSummeryColumn;
  // 발전 출력 표시
  ws[summeryColumn + 14] = { t: 's', v: '인버터 출력(W)' };
  viewInverterStatusList.forEach(viewInverterStatusInfo => {
    const { target_name } = viewInverterStatusInfo;
    // 데이터 상세 리스트 제목도 같이 구성
    const replaceTarget_name = _.replace(target_name, '(', '\n(');
    ws[`${summeryColumn}15`] = { t: 's', v: replaceTarget_name };
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  const gridOutList = _.map(groupingInverterTrend, trend => ({
    trend,
    pickValueKeyList: ['grid_out_w'],
  }));
  makeTrendToReport(excelDataList, defaultRange, gridOutList);

  // 발전량 출력 표시
  ws[`${summeryColumn}14`] = {
    t: 's',
    v: `인버터 ${powerChartDecoration.yAxisTitle}`,
  };
  viewInverterStatusList.forEach(viewInverterStatusInfo => {
    const { target_name } = viewInverterStatusInfo;
    // 데이터 상세 리스트 제목도 같이 구성
    const replaceTarget_name = _.replace(target_name, '(', '\n(');
    ws[`${summeryColumn}15`] = {
      t: 's',
      v: replaceTarget_name,
    };
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  // 발전량
  const inverterPowerList = _.map(groupingInverterTrend, trend => ({
    trend,
    pickValueKeyList: ['interval_power'],
  }));
  makeTrendToReport(excelDataList, defaultRange, inverterPowerList);

  // 발전 현황
  // 모듈 온도가 있을 경우에만 삽입
  if (deviceChartInfo.moduleRearTemperatureChartInfo.sensorTrend.length) {
    // 공백 삽입
    summeryColumn = getNextAlphabet(summeryColumn, 1);
    const groupingMrtTrend = _.groupBy(
      deviceChartInfo.moduleRearTemperatureChartInfo.sensorTrend,
      'pv_chart_sort_rank',
    );
    // 모듈 온도 표시
    ws[`${summeryColumn}14`] = {
      t: 's',
      v: '모듈 온도(℃)',
    };
    viewInverterStatusList.forEach(viewInverterStatusInfo => {
      const { target_name } = viewInverterStatusInfo;
      // 데이터 상세 리스트 제목도 같이 구성
      const replaceTarget_name = _.replace(target_name, '(', '\n(');
      ws[`${summeryColumn}15`] = {
        t: 's',
        v: replaceTarget_name,
      };
      summeryColumn = getNextAlphabet(summeryColumn, 1);
    });
    const mrtTrendDataList = _.map(groupingMrtTrend, trend => ({
      trend,
      pickValueKeyList: ['avg_num_data'],
    }));
    // 공백 삽입
    mrtTrendDataList.unshift(null);
    makeTrendToReport(excelDataList, defaultRange, mrtTrendDataList);
  }

  // 수온이 있을 경우에만 삽입
  if (deviceChartInfo.brineTemperatureChartInfo.sensorTrend.length) {
    // 공백 삽입

    // 수중만 필터링
    const filteredViewInverterStatusList = _.filter(viewInverterStatusList, {
      install_place: '수중',
    });

    summeryColumn = getNextAlphabet(summeryColumn, 1);
    const groupingMrtTrend = _.groupBy(
      deviceChartInfo.brineTemperatureChartInfo.sensorTrend,
      'pv_chart_sort_rank',
    );
    // 모듈 온도 표시
    ws[`${summeryColumn}14`] = {
      t: 's',
      v: '수온(℃)',
    };
    filteredViewInverterStatusList.forEach(viewInverterStatusInfo => {
      const { target_name } = viewInverterStatusInfo;
      // 데이터 상세 리스트 제목도 같이 구성
      const replaceTarget_name = _.replace(target_name, '(', '\n(');
      ws[`${summeryColumn}15`] = {
        t: 's',
        v: replaceTarget_name,
      };
      summeryColumn = getNextAlphabet(summeryColumn, 1);
    });
    const mrtTrendDataList = _.map(groupingMrtTrend, trend => ({
      trend,
      pickValueKeyList: ['avg_num_data'],
    }));
    // 공백 삽입
    mrtTrendDataList.unshift(null);
    makeTrendToReport(excelDataList, defaultRange, mrtTrendDataList);
  }

  // BU.CLI(ws);
  /** 환경 개요 구성 시작 */
  // 공백 한칸
  summeryColumn = getNextAlphabet(summeryColumn, 1);
  ws[summeryColumn + 14] = { t: 's', v: '기상계측장치' };
  weatherChartOptionList.forEach(weatherChartOption => {
    let strDataName = weatherChartOption.name;
    strDataName = _.replace(strDataName, '(', '\n(');
    ws[`${summeryColumn}15`] = { t: 's', v: strDataName };
    // BU.CLI(strDataName, ws[`${summeryColumn}15`]);
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  // 기상 장비
  const weatherChartList = {
    trend: weatherTrend,
    pickValueKeyList: _(weatherChartOptionList)
      .values()
      .map('selectKey')
      .value(),
  };

  // 공백 삽입
  makeTrendToReport(excelDataList, defaultRange, _.concat(null, weatherChartList));

  // 데이터 상세 리스트 제목도 같이 구성
  /** 데이터 레포트를 출력하기 위한 테이블 제목 세팅 */

  ws[summeryColumn + 14] = { t: 's', v: '기상청' };
  weatherCastOptionList.forEach(currentItem => {
    const strDataName = currentItem.name;
    ws[`${summeryColumn}15`] = { t: 's', v: strDataName };
    summeryColumn = getNextAlphabet(summeryColumn, 1);
  });

  // 기상청 현황
  const weatherCastList = {
    trend: weatherCastRowDataPacketList,
    pickValueKeyList: _(weatherCastOptionList)
      .values()
      .map('selectKey')
      .value(),
  };
  // const concatData = _.concat([null, weatherChartList, weatherCastList]);
  // const concatData = _.concat([null, weatherChartList, weatherCastList]);

  makeTrendToReport(excelDataList, defaultRange, [weatherCastList]);

  // 각 행들의 합을 계산
  sumIntervalPowerList = [
    '',
    `합산 ${powerName} ${powerChartDecoration.yAxisTitle}`,
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  powerChartData.series.forEach(chartData => {
    sumIntervalPowerList.push(_.sum(_.without(chartData.data, '')));
  });
  // XLSX.utils.cell_add_comment(ws['B10'], '출력(W)은 발전량을 토대로 계산한 값으로 실제 인버터에서 계측한 출력(W)은 아닙니다.');

  const wb = XLSX.utils.book_new();
  wb.SheetNames = [sheetName];

  /* TEST: properties */
  wb.Props = {
    Title: sheetName,
    Subject: '6kW TB',
    Author: 'SmSoft',
    Manager: 'Kepco',
    Company: 'SmSoft',
    Category: 'UPMS',
    Keywords: 'Power',
    Comments: 'Nothing to say here',
    LastAuthor: 'j.hyuk',
    CreatedDate: new Date(),
  };

  const colsInfoList = [
    { wch: 3 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 3 },
  ];

  /* TEST: column props */
  ws['!cols'] = colsInfoList;

  // /* TEST: row props */
  const rowsInfoList = [
    { hpt: 10 },
    { hpt: 24 },
    { hpt: 22 },
    { hpt: 35 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 35 },
    { hpt: 35 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 24 },
    { hpt: 35 },
  ];
  ws['!rows'] = rowsInfoList;

  XLSX.utils.sheet_add_aoa(ws, [searchList], { origin: 'B2' });
  XLSX.utils.sheet_add_aoa(ws, [commentInfo], { origin: 'P8' });
  // XLSX.utils.sheet_add_aoa(ws, [reportTitleList], { origin: 'C11' });
  // XLSX.utils.sheet_add_aoa(ws, [sumIntervalPowerList], {origin: -1});
  // BU.CLI(ws);
  XLSX.utils.sheet_add_aoa(ws, excelDataList, { origin: 'B16' });
  XLSX.utils.sheet_add_aoa(ws, [sumIntervalPowerList], { origin: -1 });

  wb.Sheets[sheetName] = ws;

  return { sheetName, ws };
  // return wb;
}
exports.makeChartDataToExcelWorkSheet = makeChartDataToExcelWorkSheet;

/**
 *
 * @param {Array.<{sheetName: string, ws: Object}>} excelContentsList
 */
function makeExcelWorkBook(sheetName, excelContentsList) {
  const wb = XLSX.utils.book_new();
  // wb.SheetNames = [_.map(excelContentsList, 'sheetName')];
  // BU.CLI(wb.SheetNames);
  /* TEST: properties */
  wb.Props = {
    Title: sheetName,
    Subject: '6kW TB',
    Author: 'SmSoft',
    Manager: 'Kepco',
    Company: 'SmSoft',
    Category: 'UPMS',
    Keywords: 'Power',
    Comments: 'Nothing to say here',
    LastAuthor: 'j.hyuk',
    CreatedDate: new Date(),
  };

  excelContentsList.forEach(currentItem => {
    XLSX.utils.book_append_sheet(wb, currentItem.ws, currentItem.sheetName);
  });
  // BU.CLI(wb);

  return wb;
}
exports.makeExcelWorkBook = makeExcelWorkBook;

/**
 * 장소 분류로 만들 엑셀 워크 시트
 * @param {V_DV_PLACE} placeRow 장소 단위로 만들 엑셀
 * @param {{strGroupDateList: string[], searchRangeInfo: searchRange}} makeOption 엑셀을 만드는데 필요한 옵션
 */
function makeEWSWithPlaceRow(placeRow, makeOption) {
  try {
    const ws = XLSX.utils.aoa_to_sheet([]);

    const { searchRangeInfo, strGroupDateList } = makeOption;
    const {
      m_name: mainSiteName = '',
      pd_target_name: placeDefName = '',
      p_target_name: placeLastName = '',
      nodeDefStorageList,
      sensorRepStorageList,
    } = placeRow;

    // 검색 기간
    const { rangeStart, rangeEnd = '' } = searchRangeInfo;
    const strSearchRange = `${rangeStart}${rangeEnd && ` ~ ${rangeEnd}`}`;
    const placeName = `${mainSiteName} ${placeDefName} ${
      _.isEmpty(placeLastName) ? '' : placeLastName
    }`;

    /** 개요 구성 시작 */
    // const searchRowsEC = ['검색 기간', strSearchRange];
    // const placeInfoRowsEC = ['장소', placeName];

    // BU.CLIN(sensorReportStorageList);

    // const dataReportList = _(placeRow.nodeDefStorageList)
    //   .map('sensorDataRows')
    //   .value();

    const dataHeaderList = ['날짜'];
    const dataSubHeaderList = [''];
    // const dataBodyList = [strGroupDateList]

    // BU.CLIN(nodeDefStorageList, 3);

    // 데이터 개요를 구성
    const reportList = [];
    const dataBodyList = [];
    _.forEach(nodeDefStorageList, nodeDefStorage => {
      const { ndName = '', dataUnit = '', nodePlaceList = [] } = nodeDefStorage;
      // 헤더 명 추가
      const headerName = `${ndName}${!_.isEmpty(dataUnit) ? ` (${dataUnit})` : ''}`;

      // ND가 여러개라면 목록 만큼 빈 공간 추가
      for (let index = 0; index < nodePlaceList.length; index += 1) {
        index === 0 ? dataHeaderList.push(headerName) : dataHeaderList.push('');
        dataSubHeaderList.push(_.get(nodePlaceList[index], 'node_name', ''));
      }

      // 장소에 해당 ND를 가진 데이터 장치가 하나일 경우
      const dataBody = [];
      if (nodePlaceList.length === 1) {
        const nodePlace = _.head(nodePlaceList);

        dataBodyList.push(
          _(nodePlace.sensorDataRows)
            .map('avg_data')
            .value(),
        );

        // dataBody = makeTrendToReport(reportList, strGroupDateList, [
        //   { pickValueKeyList: ['avg_data'], trend: nodePlace.sensorDataRows },
        // ]);
      } else {
        nodePlaceList.forEach(nodePlace => {
          dataBodyList.push(
            _(nodePlace.sensorDataRows)
              .map('avg_data')
              .value(),
          );
        });
      }
      // // FIXME: 임시로 평균 값 산출
      // else {
      //   const mapData = _(nodePlaceList)
      //     .map('sensorDataRows')
      //     .flatten()
      //     .value();

      //   if (!mapData.length) return [];

      //   strGroupDateList.map((strDate, index) => {
      //     const mean = _(mapData)
      //       .filter(info => _.eq(_.get(info, 'group_date', ''), strDate))
      //       .map('avg_data')
      //       .mean();
      //     return _.isNaN(mean) ? '' : _.round(mean, 1);
      //   });
      // }

      // return dataBody;
    });

    // dataBodyList = _.flatten(dataBodyList);

    // nodePlaceList.forEach(nodePlaceInfo => {
    //   dataBody = _(nodePlaceInfo.sensorDataRows)
    //     .map('avg_data')
    //     .value();

    //   const dataContents = _.map(strGroupDateList, (strDate, index) => {
    //     const dataRows = _.map(dataBodyList, bodyList => bodyList[index]);
    //     // dataRows.unshift(strDate);
    //     return dataRows;
    //   });
    // });

    // BU.CLI(dataHeaderList);
    // 날짜 Header 입력
    // 좌측열에 세울 날짜 삽입
    // BU.CLI(dataBodyList);
    dataBodyList.unshift(strGroupDateList);

    const dataContents = _.map(strGroupDateList, (strDate, index) => {
      const dataRows = _.map(dataBodyList, bodyList => bodyList[index]);
      // dataRows.unshift(strDate);
      return dataRows;
    });

    dataContents.unshift(dataSubHeaderList);
    dataContents.unshift(dataHeaderList);

    const wb = XLSX.utils.book_new();
    wb.SheetNames = [placeName];

    /* TEST: properties */
    wb.Props = {
      Title: placeName,
      Subject: '',
      Author: 'SmSoft',
      Manager: 'SmSoft',
      Company: 'SmSoft',
      Category: '',
      Keywords: 'Excel',
      Comments: 'Nothing to say here',
      LastAuthor: 'j.hyuk',
      CreatedDate: new Date(),
    };

    XLSX.utils.sheet_add_aoa(ws, dataContents, { origin: 'B2' });

    return { sheetName: placeName, ws };
  } catch (error) {
    BU.CLI(error);
  }
}
exports.makeEWSWithPlaceRow = makeEWSWithPlaceRow;

/**
 * Block 단위로 만들 EWS
 * @param {Object[]} trendList 장소 단위로 만들 엑셀
 * @param {Object} makeOption Block Option
 * @param {string[]} makeOption.strGroupDateList
 * @param {searchRange} makeOption.searchRangeInfo
 * @param {string} makeOption.blockName
 * @param {blockViewMakeOption[]} makeOption.blockViewOptionList EWS를 구성할 Data Table 정보
 */
function makeEWSWithBlock(trendList, makeOption) {
  try {
    const ws = XLSX.utils.aoa_to_sheet([]);

    const {
      searchRangeInfo,
      strGroupDateList,
      blockName: placeName,
      blockViewOptionList,
    } = makeOption;

    // BU.CLI(blockViewOptionList);
    // 검색 기간
    const { rangeStart, rangeEnd = '' } = searchRangeInfo;
    // const strSearchRange = `${rangeStart}${rangeEnd && ` ~ ${rangeEnd}`}`;

    const headerMainList = ['날짜'];
    const headerSubList = [''];

    // 시트별 Data Table 제목 목록 생성
    _.forEach(blockViewOptionList, blockInfo => {
      const { mainTitle = '', dataName = '', dataUnit } = blockInfo;

      headerMainList.push(mainTitle);
      headerSubList.push(`${dataName}${_.isString(dataUnit) ? ` (${dataUnit})` : ''}`);
    });
    // 중복 제거
    _.reduceRight(headerMainList, (prev, next, index) => {
      if (prev.length && next.length && prev === next) {
        headerMainList[index + 1] = '';
      }
      return next;
    });

    _.reduce(headerSubList, (prev, next, index) => {
      if (prev.length && next.length && prev === next) {
        headerSubList[index + 1] = '';
      }
      return next;
    });

    // 데이터 Table
    const dataBodyList = [];

    // BU.CLI(blockViewOptionList);
    // Array Data Table 을 생성
    makeBlockToTable(dataBodyList, strGroupDateList, {
      blockRows: trendList,
      // pickDataKeyList: _.map(blockViewOptionList, 'dataKey'),
      blockViewOptionList,
    });

    // BU.CLI(dataBodyList);

    // 좌측열에 세울 날짜 삽입
    dataBodyList.unshift(headerSubList);
    dataBodyList.unshift(headerMainList);

    const wb = XLSX.utils.book_new();
    wb.SheetNames = [placeName];

    /* TEST: properties */
    wb.Props = {
      Title: placeName,
      Subject: '',
      Author: 'SmSoft',
      Manager: 'SmSoft',
      Company: 'SmSoft',
      Category: '',
      Keywords: 'Excel',
      Comments: 'Nothing to say here',
      LastAuthor: 'j.hyuk',
      CreatedDate: new Date(),
    };

    XLSX.utils.sheet_add_aoa(ws, dataBodyList, { origin: 'B2' });

    return { sheetName: placeName, ws };
  } catch (error) {
    BU.CLI(error);
  }
}
exports.makeEWSWithBlock = makeEWSWithBlock;

// 누적 발전량 (쓰이지 않음)
// let maxList = _.pluck(optionList, 'max');
// maxList.forEach((currentItem, index) => {
//   maxList[index] = isNaN(currentItem) ? '' : currentItem;
// });

/* TEST: row props */
// let rowsInfoList = [{ hpt: 20 }, { hpt: 20 }, { hpt: 20}, { hpt: 40 }, { hpt: 20 }, { hpt: 40 }];
// ws['!rows'] = rowsInfoList;
// reportSubTitleList;

// let reportColumnList = ['C', 'I'];
// let reportSubTitleList = [];
// reportColumnList.forEach((currentItem, index) => {
//   if(reportColumnList.length === index + 1){
//     ws[currentItem + 10] = { t: 's', v: '기상계측장치' };
//   } else {
//     ws[currentItem + 10] = { t: 's', v: reportTitleList[index] };
//     reportSubTitleList = reportSubTitleList.concat(['출력(W)', powerChartDecoration.yAxisTitle]);
//   }
// });

// ws['!merges'] = [
//   XLSX.utils.decode_range('C2:H2'),
//   XLSX.utils.decode_range('Q8:T8'),

//   XLSX.utils.decode_range('C3:D3'),
//   XLSX.utils.decode_range('C4:D4'),
//   XLSX.utils.decode_range('C5:D5'),
//   XLSX.utils.decode_range('C6:D6'),
//   XLSX.utils.decode_range('C7:D7'),
//   XLSX.utils.decode_range('C8:D8'),
//   XLSX.utils.decode_range('C9:D9'),
//   XLSX.utils.decode_range('C10:D10'),

//   XLSX.utils.decode_range('E3:F3'),
//   XLSX.utils.decode_range('E4:F4'),
//   XLSX.utils.decode_range('E5:F5'),
//   XLSX.utils.decode_range('E6:F6'),
//   XLSX.utils.decode_range('E7:F7'),
//   XLSX.utils.decode_range('E8:F8'),
//   XLSX.utils.decode_range('E9:F9'),
//   XLSX.utils.decode_range('E10:F10'),

//   XLSX.utils.decode_range('G3:H3'),
//   XLSX.utils.decode_range('G4:H4'),
//   XLSX.utils.decode_range('G5:H5'),
//   XLSX.utils.decode_range('G6:H6'),
//   XLSX.utils.decode_range('G7:H7'),
//   XLSX.utils.decode_range('G8:H8'),
//   XLSX.utils.decode_range('G9:H9'),
//   XLSX.utils.decode_range('G10:H10'),

//   XLSX.utils.decode_range('I3:J3'),
//   XLSX.utils.decode_range('I4:J4'),
//   XLSX.utils.decode_range('I5:J5'),
//   XLSX.utils.decode_range('I6:J6'),
//   XLSX.utils.decode_range('I7:J7'),
//   XLSX.utils.decode_range('I8:J8'),
//   XLSX.utils.decode_range('I9:J9'),
//   XLSX.utils.decode_range('I10:J10'),

//   XLSX.utils.decode_range('K3:L3'),
//   XLSX.utils.decode_range('K4:L4'),
//   XLSX.utils.decode_range('K5:L5'),
//   XLSX.utils.decode_range('K6:L6'),
//   XLSX.utils.decode_range('K7:L7'),
//   XLSX.utils.decode_range('K8:L8'),
//   XLSX.utils.decode_range('K9:L9'),
//   XLSX.utils.decode_range('K10:L10'),

//   XLSX.utils.decode_range('M3:N3'),
//   XLSX.utils.decode_range('M4:N4'),
//   XLSX.utils.decode_range('M5:N5'),
//   XLSX.utils.decode_range('M6:N6'),
//   XLSX.utils.decode_range('M7:N7'),
//   XLSX.utils.decode_range('M8:N8'),
//   XLSX.utils.decode_range('M9:N9'),
//   XLSX.utils.decode_range('M10:N10'),

//   XLSX.utils.decode_range('P3:T3'),

//   // XLSX.utils.decode_range('B14:B15'),

//   XLSX.utils.decode_range('C14:H14'),
//   XLSX.utils.decode_range('I14:N14'),
//   XLSX.utils.decode_range('P14:S14'),
// ];
