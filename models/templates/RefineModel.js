const _ = require('lodash');

const { BU } = require('base-util-jh');
const moment = require('moment');
// const Promise = require('bluebird');
const BiModule = require('./BiModule');
const PowerModel = require('./PowerModel');
const BiDevice = require('./BiDevice');
const WeatherModel = require('./WeatherModel');

const webUtil = require('./web.util');
const excelUtil = require('./excel.util');
const commonUtil = require('./common.util');
const sensorUtil = require('./sensor.util');

const DeviceProtocol = require('../DeviceProtocol');

const VIEW_DV_PLACE = 'V_DV_PLACE';
const VIEW_DV_NODE_DEF = 'V_DV_NODE_DEF';
const VIEW_DV_PLACE_RELATION = 'V_DV_PLACE_RELATION';

class RefineModel extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;

    this.biDevice = new BiDevice(dbInfo);
    this.powerModel = new PowerModel(dbInfo);
    this.weatherModel = new WeatherModel(dbInfo);
  }

  /**
   * 발전 현황을 나타내는 기본적인 정보 계산
   * @param {number=} siteId
   */
  async refineGeneralPowerInfo(siteId) {
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    // BU.CLI(mainWhere);
    // console.time('viewPowerProfileRows');
    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await this.getTable('v_pw_profile', mainWhere);
    // console.timeEnd('viewPowerProfileRows');
    // 연결된 모든 인버터 Seq 목록 추출
    const inverterSeqList = _.map(viewPowerProfileRows, 'inverter_seq');

    // 인버터 검색 Where 절
    const inverterWhere = inverterSeqList.length
      ? { inverter_seq: inverterSeqList }
      : null;

    // BU.CLI(inverterWhere);

    // 인버터 월간 정보 추출
    const monthSearchRange = this.createSearchRange({
      searchType: 'months',
      searchInterval: 'month',
    });
    // console.time('getInverterStatistics');
    const monthInverterStatusRows = await this.getInverterStatistics(
      monthSearchRange,
      inverterSeqList,
    );
    // console.timeEnd('getInverterStatistics');
    // 금월 발전량 --> inverterMonthRows가 1일 단위의 발전량이 나오므로 해당 발전량을 전부 합산
    const monthPower = webUtil
      .reduceDataList(monthInverterStatusRows, 'interval_power')
      .toFixed(1);

    // console.time('v_pw_inverter_status');
    /** @type {V_PW_INVERTER_STATUS[]} */
    const inverterStatusRows = await this.getTable('v_pw_inverter_status', inverterWhere);
    // console.timeEnd('v_pw_inverter_status');

    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq: inverterSeq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(viewPowerProfileRows, { inverter_seq: inverterSeq });
      // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
      const {
        m_name: mainName = '',
        ivt_target_name: subName,
        ivt_director_name: company = '',
        ivt_amount: amount,
      } = foundProfile;
      const siteName = `${mainName} ${subName || ''} ${_.round(amount)} kW급 ${
        _.isString(company) && company.length ? company : ''
      }`;

      // Inverter Status Row에 경사 일사량 확장
      _.assign(inverterStatus, {
        siteName,
      });
    });

    // BU.CLI(inverterStatusRows);

    // 인버터 발전 현황 데이터 검증
    const validInverterDataList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    // 설치 인버터 총 용량
    const ivtAmount = _(viewPowerProfileRows).map('ivt_amount').sum();

    // Curr PV 전력
    const pvKw = webUtil.calcValue(
      webUtil.calcValidDataList(validInverterDataList, 'pv_kw', false),
      1,
      3,
    );
    // Curr Power 전력
    const currKw = webUtil.calcValue(
      webUtil.calcValidDataList(validInverterDataList, 'power_kw', false),
      1,
      2,
    );

    // 금일 발전량
    const dailyPower = _.chain(inverterStatusRows)
      .map('daily_power_kwh')
      .sum()
      .round(3)
      .value();

    // Curr Power 전력
    const cumulativePower = _.chain(inverterStatusRows)
      .map('power_cp_kwh')
      .sum()
      .divide(1000)
      .round(3)
      .value();

    // 현재 발전 효율
    const currPf =
      _.isNumber(pvKw) && _.isNumber(currKw) ? _.round((currKw / pvKw) * 100, 1) : '-';

    const powerGenerationInfo = {
      currKw,
      currPf: _.isNaN(currPf) ? '-' : currPf,
      currKwYaxisMax: _.round(ivtAmount),
      dailyPower,
      monthPower,
      cumulativePower,
      co2: _.round(cumulativePower * 0.424, 3),
      isOperationInverter: _.chain(validInverterDataList)
        .map('hasValidData')
        .values()
        .every(Boolean)
        .value(),
    };

    return { powerGenerationInfo, validInverterDataList };
  }

  /**
   * 인버터 차트 뽑아옴
   * @param {number[]=} inverterSeqList
   */
  async refineInverterStatus(inverterSeqList) {
    const inverterWhere = inverterSeqList.length
      ? { inverter_seq: inverterSeqList }
      : null;

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await this.powerModel.getTable(
      'v_pw_inverter_status',
      inverterWhere,
    );

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = await this.powerModel.makeInverterNameList(
      inverterSeqList,
    );

    _(inverterStatusRows).forEach(statusRow => {
      statusRow.siteName = _.get(
        _.find(inverterSiteNameList, {
          inverter_seq: Number(statusRow.inverter_seq),
        }),
        'siteName',
        '',
      );
    });

    // 데이터 검증
    const validInverterStatusList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    /** 인버터 메뉴에서 사용 할 데이터 선언 및 부분 정의 */
    const refinedInverterStatusList = webUtil.refineSelectedInverterStatus(
      validInverterStatusList,
    );

    return refinedInverterStatusList;
  }

  /**
   * 인버터 차트 뽑아옴
   * @param {searchRange} searchRange
   * @param {number[]=} inverterSeqList
   * @param {lineChartConfig} lineChartConfig
   */
  async refineInverterChart(searchRange, inverterSeqList, lineChartConfig) {
    const inverterPowerList = await this.powerModel.getInverterPower(
      searchRange,
      inverterSeqList,
    );

    const inverterSiteNameList = await this.powerModel.makeInverterNameList(
      inverterSeqList,
    );

    // 동적 라인 차트를 생성
    const inverterLineChart = webUtil.makeDynamicLineChart(
      lineChartConfig,
      inverterPowerList,
    );

    inverterLineChart.series.forEach(chartInfo => {
      const foundInverterInfo = _.find(inverterSiteNameList, {
        inverter_seq: Number(chartInfo.name),
      });

      if (_.isEmpty(foundInverterInfo)) {
        chartInfo.name = '인버터 총합';
      } else {
        chartInfo.name = _.get(foundInverterInfo, 'siteName', chartInfo.name);
      }
    });

    return inverterLineChart;
  }

  /**
   * 센서 차트 목록을 뽑아옴
   * @param {searchRange} searchRange
   * @param {string[]} chartIdList Block Id
   * @param {number=} mainSeq
   */
  async refineSensorCharts(searchRange, chartIdList, mainSeq) {
    const deviceProtocol = new DeviceProtocol();

    // baseTable이 V_DV_PLACE가 아닐 경우 baseTable.placeKey in [place_seq] 가져옴
    const { trendSensorViewList } = deviceProtocol;

    const mainWhere = _.isNumber(mainSeq) ? { main_seq: mainSeq } : null;

    /** @type {V_DV_PLACE_RELATION[]} */
    let placeRelationRows = await this.biDevice.getTable(
      'v_dv_place_relation',
      { ...mainWhere, is_sensor: 1 },
      false,
    );

    placeRelationRows = _.unionBy(
      placeRelationRows,
      placeRelationInfo => placeRelationInfo.node_seq,
    );

    // console.time('getSensorReport');
    /** @type {sensorReport[]} */
    const sensorReportRows = await this.biDevice.getSensorReport(
      searchRange,
      _.map(placeRelationRows, 'node_seq'),
    );
    // console.timeEnd('getSensorReport');

    // 하루 단위로 검색할 경우에만 시간 제한을 둠
    // if (searchRangeInfo.searchType === 'days') {
    //   const rangeInfo = {
    //     startHour: 7,
    //     endHour: 20,
    //   };
    //   strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo, rangeInfo);
    //   momentFormat = sensorUtil.getMomentFormat(searchRangeInfo, moment(_.head(strGroupDateList)));
    // } else {
    //   strGroupDateList = sensorUtil.getGroupDateList(searchRangeInfo);
    //   momentFormat = sensorUtil.getMomentFormat(searchRangeInfo);
    // }

    // console.time('extPlaRelSensorRep');
    // 그루핑 데이터를 해당 장소에 확장 (Extends Place Realtion Rows With Sensor Report Rows)
    // sensorUtil.extPlaRelWithSenRep(placeRelationRows, sensorReportRows);
    sensorUtil.extPlaRelPerfectSenRep(
      placeRelationRows,
      sensorReportRows,
      // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
      sensorUtil.getGroupDateList(searchRange),
    );
    // console.timeEnd('extPlaRelSensorRep');

    // Node Def Id 목록에 따라 Report Storage 목록을 구성하고 storageList에 Node Def Id가 동일한 확장된 placeRelationRow를 삽입
    // console.time('makeNodeDefStorageList');
    const nodeDefStorageList = sensorUtil.makeNodeDefStorageList(
      placeRelationRows,
      _.values(deviceProtocol.BASE_KEY),
    );
    // console.timeEnd('makeNodeDefStorageList');

    // FIXME: 구간 최대 값 차 차트 --> getSensorReport 밑에 저장해둠. 수정 필요.

    // FIXME: 과도한 쿼리를 발생시키는 SearchRange 는 serarchInterval 조정 후 반환

    const madeLineChartList = trendSensorViewList
      .filter(sensorViewInfo => _.includes(chartIdList, sensorViewInfo.domId))
      .map(chartConfig =>
        sensorUtil.makeSimpleLineChart(
          chartConfig,
          nodeDefStorageList,
          // plotSeries 를 구하기 위한 객체
          sensorUtil.getMomentFormat(searchRange).plotSeries,
        ),
      );

    // BU.CLI(madeLineChartList[0]);

    return madeLineChartList;
  }

  /**
   * 블록 차트 목록을 뽑아옴
   * @param {searchRange} searchRange
   * @param {pcBlockChartInfo} blockInfo Block Id
   * @param {number=} mainSeq
   */
  async refineBlockCharts(searchRange, blockInfo, mainSeq) {
    const { blockId, nameExpInfo: { isMain = true } = {}, chartIdList } = blockInfo;
    const deviceProtocol = new DeviceProtocol();

    // baseTable이 V_DV_PLACE가 아닐 경우 baseTable.placeKey in [place_seq] 가져옴
    const blockTrendViews = deviceProtocol.getBlockChart(blockId);

    const {
      baseTableInfo: { fromToKeyTableList, placeKey },
      blockChartList,
    } = blockTrendViews;

    // mainWhere 추출
    const mainWhere = _.isNumber(mainSeq) ? { main_seq: mainSeq } : null;

    // mainWhere 맞는 V_DV_PLACE_RELATION 목록 가져옴
    /** @type {V_DV_PLACE_RELATION[]} */
    const viewPlaceRelationRows = await this.getTable(VIEW_DV_PLACE_RELATION, mainWhere);

    // 동적 Data Block Rows 결과 요청
    const { viewPlaceRows, baseTableRows, dataRows } = await this.getDynamicBlockRows(
      searchRange,
      blockId,
      mainSeq,
    );

    // BU.CLIN(dataRows);

    const { fromKey: baseFromKey, toKey: baseToKey } = _.head(fromToKeyTableList);

    // plotSeries 를 구하기 위한 객체
    const { plotSeries } = commonUtil.getMomentFormat(searchRange);
    // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
    const strGroupDateList = commonUtil.getGroupDateList(searchRange);

    // fromToKey의 첫번째 인자로 그루핑을 하고 빈 데이터가 있을 경우 집어 넣음
    const blockDataRowsGroup = commonUtil.extPerfectRows(
      baseToKey,
      dataRows,
      strGroupDateList,
    );

    // block 목록만큼의 동적 차트 생성
    const refinedDomChart = blockChartList
      .filter(blockChartInfo => _.includes(chartIdList, blockChartInfo.domId))
      .map(blockChartInfo => {
        // Chart Dom을 생성하기 위한 옵션 선언
        const { domId, title = '', subtitle = '', chartOptionList } = blockChartInfo;
        /** @type {lineChartInfo} 정제된 차트 정보 정의 */
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

        // 차트를 생성하기 위한 목록 순회 (index: 0 = left yAxis, index: 1 = right yAxis)
        chartOptionList.forEach((chartOption, index) => {
          // 보여줄 축 정보
          const { dataUnit = '', yTitle, blockConfigList } = chartOption;
          // Y축 표현 정보 삽입
          refinedChart.yAxis.push({
            yTitle,
            dataUnit,
          });

          // 실제 Block Chart 목록을 돌면서 의미있는 차트 정보 생성
          blockConfigList.forEach(blockConfig => {
            // convertKey가 없을 경우 toKey로 대체
            const {
              fromKey,
              toKey,
              convertKey = toKey,
              convertName,
              mixColor = '',
            } = blockConfig;

            // 현재 Dom 정보에서 표현해줄 chart line 갯수를 뽑아내기 위하여 group 처리된 목록을 순회
            _.forEach(blockDataRowsGroup, (blockDataRows, groupSeq) => {
              // BU.CLI(blockDataRows);
              // 그룹 처리된 seq는 문자형이기 때문에 숫자형으로 변환
              let placeSeq = Number(groupSeq);
              // baseTable이 V_DV_PLACE가 아닐 경우 실제 해당 row의 place_seq를 가져옴
              if (baseTableRows !== viewPlaceRows) {
                const baseRow = _.find(baseTableRows, {
                  [baseFromKey]: Number(groupSeq),
                });
                placeSeq = _.get(baseRow, placeKey);
              }

              // BU.CLIS(placeSeq, fromKey);

              // 장소 관계 Row 검색
              const placeRelationInfo = _.find(viewPlaceRelationRows, {
                place_seq: placeSeq,
                nd_target_id: fromKey,
              });

              // 존재하지 않을경우 throw
              // throw new Error(`${fromKey} is not exist in viewPlaceRelation`);

              // 관계가 있을 경우에만 추가
              if (!_.isEmpty(placeRelationInfo)) {
                // Place Relation 에 있는 속성 선언
                const {
                  m_name: mName,
                  chart_color: chartColor,
                  node_name: nName,
                  nd_target_name: ndName,
                  place_name: pName,
                  place_node_name: pNodeName,
                  p_target_name: pTargetName,
                  p_target_code: pTargetCode,
                  chart_sort_rank: chartSortRank,
                } = placeRelationInfo;

                // BU.CLIN(placeRelationInfo);

                // x 요소 이름 지정
                let xAxisElementName = isMain ? `${mName} ` : '';
                if (_.isString(convertName)) {
                  xAxisElementName += convertName.length
                    ? `${pTargetName} - ${convertName}`
                    : pTargetName;
                } else if (pTargetName) {
                  xAxisElementName += `${pTargetName} - ${ndName}`;
                } else {
                  xAxisElementName += pNodeName;
                }

                // BU.CLI(chartSortRank);

                xAxisLength = blockDataRows.length;

                /** @type {chartSeriesInfo} 의미있는 차트 정보 생성 */
                const chartSeries = {
                  name: xAxisElementName,
                  color: mixColor.length
                    ? BU.blendColors(chartColor, mixColor, 0.5)
                    : chartColor,
                  tooltip: {
                    valueSuffix: dataUnit,
                  },
                  yAxis: index,
                  // 데이터가 없을 경우 빈공간으로 대체
                  data: _.map(blockDataRows, blockDataRow =>
                    _.get(blockDataRow, convertKey, ''),
                  ),
                  chartSortRank,
                };
                // Chart Line 추가
                refinedChart.series.push(chartSeries);
              }
            });
          });
        });
        // 차트 정렬 순서대로 재정렬
        refinedChart.series = _.sortBy(refinedChart.series, 'chartSortRank');

        refinedChart.xAxis.max =
          plotSeries.pointStart + xAxisLength * plotSeries.pointInterval;
        // 정제한 Chart Dom 반환
        return refinedChart;
      });

    // BU.CLIN(refinedDomChart, 4);

    // 정제한 Chart Dom List 반환
    return refinedDomChart;
  }

  /**
   * 블록 차트 목록을 뽑아옴
   * @param {searchRange} searchRange
   * @param {string} blockId Block Id
   * @param {number=} mainSeq
   * @param {string=} addQuery
   */
  async getDynamicBlockRows(searchRange, blockId, mainSeq, addQuery = '') {
    try {
      const deviceProtocol = new DeviceProtocol();
      // mainWhere 추출
      const mainWhere = _.isNumber(mainSeq) ? { main_seq: mainSeq } : null;

      /** @type {V_DV_PLACE[]} SiteId에 맞는 V_DV_PLACE 목록 가져옴 */
      const viewPlaceRows = await this.getTable(VIEW_DV_PLACE, mainWhere);

      const placeSeqList = _.map(viewPlaceRows, 'place_seq');

      // baseTable이 V_DV_PLACE가 아닐 경우 baseTable.placeKey in [place_seq] 가져옴
      const blockTrendViews = deviceProtocol.getBlockChart(blockId);
      const {
        blockTableName,
        baseTableInfo: { tableName, placeKey, fromToKeyTableList },
        blockChartList,
      } = blockTrendViews;

      let baseTableRows = viewPlaceRows;
      // Base Table이 존재할 경우 해당 Base Table Rows를 가져옴
      if (tableName !== VIEW_DV_PLACE) {
        const baseWhere = placeSeqList.length ? { [placeKey]: placeSeqList } : null;
        baseTableRows = await this.getTable(tableName, baseWhere);
      }

      let mainSelectQuery = '';
      let sqlBlockWhere = '';

      // 실제로 가져올 Block Chart Where 절 생성
      _.forEach(fromToKeyTableList, (fromToKeyInfo, index) => {
        const { fromKey, toKey } = fromToKeyInfo;
        mainSelectQuery +=
          fromToKeyTableList.length - 1 === index ? `${toKey}` : `${toKey},`;
        const values = _.map(baseTableRows, fromKey);
        if (values.length === 0) {
          throw new Error(`${toKey} values is 0`);
        }
        sqlBlockWhere += ` AND ${toKey} IN (${values})`;
      });

      const dynamicSelectQuery = _.chain(blockChartList)
        .map('chartOptionList')
        .flatten()
        .map('blockConfigList')
        .flatten()
        .unionBy(blockConfig => {
          const { toKey, convertKey = toKey } = blockConfig;
          return convertKey;
        })
        .map(calcInfo => {
          const {
            expressionInfo,
            toKey,
            convertKey = toKey,
            calcType,
            scale,
            toFixed = 1,
          } = calcInfo;
          const { AVG, INTERVAL_MAX, MAX, MIN } = deviceProtocol.CALC_TYPE;

          let dynamicSql = '';

          if (typeof expressionInfo === 'object') {
            const queryTemplate = _.template('<%= expression %> AS <%= columnId %>');
            const { columnId, scale: expScale, toFixed: expToFixed = 1 } = expressionInfo;
            let { firstExpression } = expressionInfo;

            if (_.isNumber(expScale)) {
              firstExpression = `(${firstExpression}) * ${expScale}`;
            }
            if (_.isNumber(expToFixed)) {
              firstExpression = `ROUND(${firstExpression}, ${expToFixed})`;
            }

            dynamicSql = queryTemplate({
              expression: firstExpression,
              columnId,
            });
            // BU.CLI(dynamicSql);
          } else {
            switch (calcType) {
              case INTERVAL_MAX:
                dynamicSql = `MAX(${toKey}) - MIN(${toKey})`;
                break;
              case MAX:
                dynamicSql = `MAX(${toKey})`;
                break;
              case MIN:
                dynamicSql = `MIN(${toKey})`;
                break;
              case AVG:
              default:
                dynamicSql = `AVG(${toKey})`;
                break;
            }

            if (_.isNumber(scale) && scale !== 1) {
              dynamicSql = `ROUND((${dynamicSql}) * ${scale}, ${toFixed}) AS ${convertKey}`;
            } else {
              dynamicSql = `ROUND(${dynamicSql}, ${toFixed}) AS ${convertKey}`;
            }
          }

          return dynamicSql;
        })
        .value();

      // BU.CLI(dynamicSelectQuery);

      // Make Dynamic Query
      const {
        selectGroupDate,
        selectViewDate,
        firstGroupByFormat,
      } = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

      const mainSql = `
          SELECT
                  ${mainSelectQuery},
                  ${selectViewDate},
                  ${selectGroupDate},
                  ${dynamicSelectQuery.join(',\n\t\t')},
                  COUNT(*) AS row_count
          FROM ${blockTableName}
          WHERE writedate>= "${searchRange.strStartDate}" AND writedate<"${
        searchRange.strEndDate
      }"
          ${addQuery.length ? ` AND ${addQuery}` : ''}
          ${sqlBlockWhere}
          GROUP BY ${firstGroupByFormat}, ${mainSelectQuery}
          ORDER BY ${mainSelectQuery}, writedate
        `;

      // Get Rows
      const dataRows = await this.db.single(mainSql, '', false);

      return {
        viewPlaceRows,
        baseTableRows,
        dataRows,
      };
    } catch (error) {
      // BU.CLI(error);
      return {};
    }
  }
}
module.exports = RefineModel;
