const _ = require('lodash');

const {BU} = require('base-util-jh');
const moment = require('moment');

const BiModule = require('./BiModule');
const webUtil = require('./web.util');

class BiDevice extends BiModule {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;
  }

  /**
   * 장소 시퀀스를 기준으로 장소 관계 정보를 가져옴
   * @param {{place_seq: number}[]} receiveObjList
   */
  async getPlaceRelation(receiveObjList) {
    // 장소 SeqList 추출
    const placeSeqList = _.map(receiveObjList, receiveDataInfo =>
      _.get(receiveDataInfo, 'place_seq'),
    );
    // BU.CLI(placeSeqList);
    // 추출된 seqList를 기준으로 장소 관계를 불러옴
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeList = await this.getTable('v_dv_place_relation', {place_seq: placeSeqList}, false);
    return placeList;
  }

  /**
   * 장소 시퀀스를 기준으로 관련된 현재 데이터를 모두 가져옴
   * @param {{place_seq: number}[]} receiveObjList
   * @param {string} pickId nd_target_id 입력
   */
  async extendsPlaceDeviceData(receiveObjList, pickId) {
    const placeList = await this.getPlaceRelation(receiveObjList);
    // BU.CLI(placeList);
    // 장소 관계에 관련된 내용이 없다면 그냥 반환
    if (_.isEmpty(placeList)) {
      return receiveObjList;
    }
    // 검색 조건에 맞는 데이터
    const filteringPlaceList = _.filter(placeList, {nd_target_id: pickId});
    // BU.CLI(filteringPlaceList);

    // 검색 조건에 맞는 데이터가 없다면 그냥 반환
    if (_.isEmpty(filteringPlaceList)) {
      return receiveObjList;
    }

    // 검색 조건에 맞는 Node Seq 목록을 만듬
    const nodeSeqList = _.map(filteringPlaceList, 'node_seq');
    // BU.CLI(nodeSeqList);

    // 장소 관계 리스트에서 nodeSeq 리스트를 추출하고 해당 장치의 최신 데이터를 가져옴
    const nodeDataList = await this.getTable('v_dv_sensor_profile', {
      node_seq: nodeSeqList,
    });
    // 검색된 노드가 없다면 그냥 반환
    if (_.isEmpty(nodeDataList)) {
      return receiveObjList;
    }

    const now = moment();
    // 검색 결과 노드를 순회
    _.forEach(nodeDataList, nodeInfo => {
      // 장소 정보 테이블 Row 정보
      const filteringPlaceInfo = _.find(filteringPlaceList, {node_seq: nodeInfo.node_seq});
      // 수신 받은 데이터 객체 정보
      const receiveObj = _.find(receiveObjList, {place_seq: filteringPlaceInfo.place_seq});

      const diffNum = now.diff(moment(nodeInfo.writeDate), 'minutes');
      // 10분을 벗어나면 데이터 가치가 없다고 판단
      if (diffNum < 10) {
        // 키 확장
        _.assign(receiveObj, {[pickId]: _.get(nodeInfo, 'node_data')});
      } else {
        _.assign(receiveObj, {[pickId]: null});
      }
    });

    // BU.CLI(receiveObjList);
    return receiveObjList;
  }

  /**
   * 센서 장치 데이터를 구해옴
   * @param {searchRange} searchRange
   * @param {number[]} node_seq
   */
  getSensorTrend(searchRange, node_seq) {
    searchRange = searchRange || this.getSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
      SELECT 
          *,
          ${dateFormat.selectViewDate},
          ${dateFormat.selectGroupDate},
          ROUND(AVG(num_data), 1)  AS avg_num_data
      FROM v_dv_sensor_data
      WHERE node_seq IN (${node_seq})
        AND writedate>= "${searchRange.strStartDate}" and writedate<"${searchRange.strEndDate}"
        AND DATE_FORMAT(writedate, '%H') >= '05' AND DATE_FORMAT(writedate, '%H') < '20'
      GROUP BY ${dateFormat.groupByFormat}, node_seq
      ORDER BY node_seq, writedate
    `;

    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 차트 반환
   * @param {V_UPSAS_PROFILE[]} viewUpsasProfileList
   * @param {string} pickId nd_target_id 입력
   * @param {searchRange} searchRange
   * @param {{fullTxtPoint: [], shortTxtPoint: []}} betweenDatePoint
   * @return {{sensorChartData: chartData, sensorTrend: V_DV_SENSOR_DATA[]}} chartData
   */
  async getDeviceChart(viewUpsasProfileList, pickId, searchRange, betweenDatePoint) {
    // BU.CLI(searchRange);
    /** @type {chartData} */
    const chartInfo = {
      range: [],
      series: [],
    };
    const returnValue = {
      sensorChartData: chartInfo,
      sensorTrend: [],
    };

    // 태양광 구성 정보 리스트를 기준으로 장소 관계 목록을 가져옴
    const placeRelationList = await this.getPlaceRelation(viewUpsasProfileList);

    // 장소 관계에 관련된 내용이 없다면 그냥 반환
    if (_.isEmpty(placeRelationList)) {
      return returnValue;
    }
    // 검색 조건에 맞는 데이터
    const filterdPlaceRelationList = _.filter(placeRelationList, {nd_target_id: pickId});
    // BU.CLI(filteringPlaceList);

    // 검색 조건에 맞는 데이터가 없다면 그냥 반환
    if (_.isEmpty(filterdPlaceRelationList)) {
      return returnValue;
    }
    // 추출된 장소 관계 목록에 인버터 시퀀스를 추가
    webUtil.addKeyToReport(
      filterdPlaceRelationList,
      viewUpsasProfileList,
      'inverter_seq',
      'place_seq',
    );

    // BU.CLI(filterdPlaceRelationList)
    // 검색 조건에 맞는 Node Seq 목록을 만듬
    const nodeSeqList = _.map(filterdPlaceRelationList, 'node_seq');
    // BU.CLI(nodeSeqList);

    // node_seq 목록이 없을 경우 반환
    if (!nodeSeqList.length) {
      return returnValue;
    }

    // 센서 데이터를 추출
    const sensorTrend = await this.getSensorTrend(searchRange, nodeSeqList);
    // BU.CLI(sensorTrend);

    if (_.isEmpty(sensorTrend)) {
      return returnValue;
    }

    // BU.CLI(sensorTrend);

    // 추출된 데이터에 인버터 Seq를 붙임
    webUtil.addKeyToReport(sensorTrend, filterdPlaceRelationList, 'inverter_seq', 'node_seq');
    // sensorTrend.forEach(e => BU.CLI(e));
    // BU.CLI(sensorTrend)
    // webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'ivt_target_id', 'inverter_seq');
    // webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'ivt_target_name', 'inverter_seq');
    webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'pv_chart_color', 'inverter_seq');
    webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'pv_chart_sort_rank', 'inverter_seq');
    // 검색 기간을 기준으로 data 비율을 조정함
    // BU.CLI(sensorTrend);

    /** @type {chartOption} */
    const chartOpt = {
      selectKey: 'avg_num_data',
      maxKey: 'avg_num_data',
      minKey: 'avg_num_data',
      averKey: 'avg_num_data',
      dateKey: 'group_date',
      groupKey: 'node_seq',
      colorKey: 'pv_chart_color',
      sortKey: 'pv_chart_sort_rank',
    };
    // BU.CLI(betweenDatePoint);

    /** 정해진 column을 기준으로 모듈 데이터를 정리 */
    const sensorChart = webUtil.makeStaticChartData(sensorTrend, betweenDatePoint, chartOpt);

    // BU.CLI(sensorChart);
    // return;
    /** Grouping Chart에 의미있는 이름을 부여함. */
    sensorChart.series.forEach(seriesInfo => {
      const sensorInfo = _.find(sensorTrend, {node_seq: _.toNumber(seriesInfo.name)});
      if (!_.isEmpty(sensorInfo)) {
        seriesInfo.name = _.find(viewUpsasProfileList, {
          inverter_seq: _.get(sensorInfo, 'inverter_seq'),
        }).ivt_target_name;
      }
    });
    // webUtil.mappingChartDataName(
    //   chartData,
    //   viewUpsasProfileList,
    //   'inverter_seq',
    //   'ivt_target_name',
    // );

    // BU.CLIS(sensorChart);

    return {
      sensorChartData: sensorChart,
      sensorTrend,
    };
  }
}
module.exports = BiDevice;
