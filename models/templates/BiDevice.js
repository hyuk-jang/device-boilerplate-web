const _ = require('lodash');

const { BU } = require('base-util-jh');
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
   *
   * @param {Object} whereInfo
   */
  getSensorProfile(whereInfo = {}) {
    let sql = `
          SELECT
            r_dsd.num_data AS node_data,
            r_dsd.writedate,
            vdn.*
      FROM  v_dv_node vdn
      JOIN 
      (
        SELECT 
              dsd.node_seq,
              dsd.num_data,
              dsd.writedate
        FROM dv_sensor_data dsd
        JOIN
        (
          SELECT MAX(sensor_data_seq) AS sensor_data_seq
          FROM dv_sensor_data
          WHERE writedate > CURDATE()
          GROUP BY node_seq
        ) temp
        ON dsd.sensor_data_seq = temp.sensor_data_seq
      ) r_dsd
      ON r_dsd.node_seq = vdn.node_seq 
    `;

    if (_.isObject(whereInfo) && !_.isEmpty(whereInfo)) {
      sql += ' WHERE ';
      let index = 0;
      _.forEach(whereInfo, (value, key) => {
        if (index) {
          sql += ' AND ';
        }
        if (_.isString(value)) {
          value = `'${value}'`;
        }
        sql += Array.isArray(value) ? `r_dsd.${key} IN (${value})` : `${key} = ${value}`;
        index += 1;
      });
    }

    return this.db.single(sql, '', false);
  }

  /**
   * 센서 장치 데이터를 구해옴
   * @param {searchRange} searchRange
   * @param {number[]} nodeSeqList
   * @param {number=} 소수점 절삭 자리수 default: 1
   * @return {sensorReport[]}
   */
  getSensorReport(searchRange = this.createSearchRange(), nodeSeqList, fixed = 1) {
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
      SELECT 
          node_seq,
          ${dateFormat.selectViewDate},
          ${dateFormat.selectGroupDate},
          ROUND(AVG(num_data), ${fixed})  AS avg_data,
          ROUND(MIN(num_data), ${fixed})  AS min_data,
          ROUND(MAX(num_data), ${fixed})  AS max_data,
          ROUND(MAX(num_data) - MIN(num_data), ${fixed})  AS interval_data
      FROM dv_sensor_data
      WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
      ${nodeSeqList.length ? ` AND node_seq IN (${nodeSeqList})` : ''}
      GROUP BY ${dateFormat.groupByFormat}, node_seq
      ORDER BY node_seq, writedate
    `;
    // AND DATE_FORMAT(writedate, '%H') >= '07' AND DATE_FORMAT(writedate, '%H') < '20'

    return this.db.single(sql, '', false);
  }

  //   SELECT
  //   t.*,
  //    if(@prev_node = `node_seq`, ROUND(max_data - @prev, 2), 0) as diff,
  //  @prev := `max_data`,
  //   @prev_node := `node_seq`

  // FROM
  // (
  // SELECT
  //    node_seq,
  //    CONCAT(LEFT(DATE_FORMAT(writedate,"%Y-%m-%d %H:%i"), 15), "0")  AS group_date,
  //    ROUND(MAX(num_data), 1)  AS max_data
  // FROM dv_sensor_data
  // WHERE writedate>= "2018-11-23 00:00:00" and writedate<"2018-11-24 00:00:00"

  // GROUP BY LEFT(DATE_FORMAT(writedate,"%Y-%m-%d %H:%i"), 15), node_seq
  // ORDER BY node_seq, writedate
  // ) AS t,
  // (select @prev := null, @prev_node := null) var_init

  // /**
  //  *
  //  * @param {searchRange} searchRange
  //  * @param {V_DV_PLACE_RELATION[]} placeRelationRows
  //  */
  // getSensorReport(searchRange = this.createSearchRange(), placeRelationRows) {
  //   // BU.CLI(searchRange);
  //   const { groupByFormat, selectViewDate, selectGroupDate } = this.makeDateFormatForReport(
  //     searchRange,
  //     'writedate',
  //   );
  //   const { strStartDate, strEndDate } = searchRange;
  //   // BU.CLI(strStartDate, strEndDate);
  //   let sql = `
  //   SELECT
  //       STRAIGHT_JOIN *
  //   FROM
  //   (
  //     SELECT DISTINCT ${selectGroupDate}
  //     FROM dv_sensor_data
  //   ) AS main
  //   `;

  //   placeRelationRows.forEach((relationRow, index) => {
  //     sql += `
  //     JOIN
  //     (
  //       SELECT
  //               ${selectGroupDate},
  //               ROUND(AVG(num_data), 1) AS ${relationRow.nd_target_id}
  //       FROM dv_sensor_data
  //       WHERE node_seq = ${relationRow.node_seq}
  //       GROUP BY ${groupByFormat}, node_seq
  //       AND writedate>= "${strStartDate}" and writedate<"${strEndDate}"
  //     ) AS group_${index}
  //     ON group_${index}.group_date = main.group_date
  //     `;
  //   });

  //   return this.db.single(sql, '', false);
  // }

  /**
   * 장소 시퀀스를 기준으로 장소 관계 정보를 가져옴
   * @param {{place_seq: number}[]} receiveObjList
   */
  async getPlaceRelation(receiveObjList) {
    // 장소 SeqList 추출
    const placeSeqList = _.map(receiveObjList, receiveDataInfo =>
      _.get(receiveDataInfo, 'place_seq', null),
    );

    const remainPlaceList = _.reject(placeSeqList, _.isNil);
    const where = remainPlaceList.length ? { place_seq: remainPlaceList } : null;

    // BU.CLI(placeSeqList);
    // 추출된 seqList를 기준으로 장소 관계를 불러옴
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeList = await this.getTable('v_dv_place_relation', where, false);
    return placeList;
  }

  /**
   * 장소 시퀀스를 기준으로 관련된 현재 데이터를 모두 가져옴
   * @param {{place_seq: number}[]} powerProfileRows
   * @param {string} pickId nd_target_id 입력
   * @return {{place_seq: number, *: number=}[]} new containedPlaceSeqRows with Extend PickId Key
   */
  async extendsPlaceDeviceData(powerProfileRows, pickId) {
    let relationPlaceRows = await this.getPlaceRelation(powerProfileRows);
    // BU.CLI(relationPlaceRows);
    // 장소 관계에 관련된 내용이 없다면 그냥 반환
    if (_.isEmpty(relationPlaceRows)) {
      return powerProfileRows;
    }

    // 검색 조건에 맞는 데이터
    relationPlaceRows = _.filter(relationPlaceRows, {
      nd_target_id: pickId,
    });

    // 검색 조건에 맞는 데이터가 없다면 그냥 반환
    if (_.isEmpty(relationPlaceRows)) {
      return powerProfileRows;
    }

    // 검색 조건에 맞는 Node Seq 목록을 만듬
    const nodeSeqList = _.map(relationPlaceRows, 'node_seq');

    // 장소 관계 리스트에서 nodeSeq 리스트를 추출하고 해당 장치의 최신 데이터를 가져옴
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const dvSensorProfileRows = await this.getSensorProfile({
      node_seq: nodeSeqList,
    });
    // BU.CLI(dvSensorProfileRows);
    // const dvSensorProfileRows = await this.getTable('v_dv_sensor_profile', {
    //   node_seq: nodeSeqList,
    // });
    // BU.CLI('@@');
    // 검색된 노드가 없다면 그냥 반환
    if (_.isEmpty(dvSensorProfileRows)) {
      return powerProfileRows;
    }

    const now = moment();
    // 검색 결과 노드를 순회
    _.forEach(dvSensorProfileRows, sensorProfile => {
      // 해당 장치가 속해있는 장소 목록 구성
      const containedNodeSeqRelationPlaceRows = _.filter(relationPlaceRows, {
        node_seq: sensorProfile.node_seq,
      });

      // Node Seq를 가진 장소 목록이 없을 경우 종료
      if (_.isEmpty(containedNodeSeqRelationPlaceRows)) return false;

      // Node Seq를 가지고 있는 장소 목록의 Seq 목록 구성
      const foundPlaceSeqList = _.map(containedNodeSeqRelationPlaceRows, 'place_seq');

      // 요청받은 containedPlaceSeqRows 중 실제 해당 장치가 사용중인 목록 필터링
      const filterdPlaceSeqRows = _.filter(powerProfileRows, placeSeqRow =>
        _.includes(foundPlaceSeqList, placeSeqRow.place_seq),
      );

      const diffNum = now.diff(moment(sensorProfile.writedate), 'minutes');
      // 10분을 벗어나면 데이터 가치가 없다고 판단
      if (diffNum < 10) {
        // 키 확장
        filterdPlaceSeqRows.forEach(row => {
          _.assign(row, {
            [pickId]: _.get(sensorProfile, 'node_data'),
          });
        });
      } else {
        filterdPlaceSeqRows.forEach(row => {
          _.assign(row, {
            [pickId]: null,
          });
        });
      }
    });

    // BU.CLI(receiveObjList);
    return powerProfileRows;
  }

  /**
   * 센서 장치 데이터를 구해옴
   * @param {searchRange} searchRange
   * @param {number[]} nodeSeqList
   */
  getSensorTrend(searchRange, nodeSeqList) {
    searchRange = searchRange || this.createSearchRange();
    const dateFormat = this.makeDateFormatForReport(searchRange, 'writedate');

    const sql = `
      SELECT 
          *,
          ${dateFormat.selectViewDate},
          ${dateFormat.selectGroupDate},
          ROUND(AVG(num_data), 1)  AS avg_num_data
      FROM v_dv_sensor_data
      WHERE node_seq IN (${nodeSeqList})
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
    const filterdPlaceRelationList = _.filter(placeRelationList, {
      nd_target_id: pickId,
    });
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
    webUtil.addKeyToReport(
      sensorTrend,
      filterdPlaceRelationList,
      'inverter_seq',
      'node_seq',
    );
    // sensorTrend.forEach(e => BU.CLI(e));
    // BU.CLI(sensorTrend)
    // webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'ivt_target_id', 'inverter_seq');
    // webUtil.addKeyToReport(sensorTrend, viewUpsasProfileList, 'ivt_target_name', 'inverter_seq');
    webUtil.addKeyToReport(
      sensorTrend,
      viewUpsasProfileList,
      'pv_chart_color',
      'inverter_seq',
    );
    webUtil.addKeyToReport(
      sensorTrend,
      viewUpsasProfileList,
      'pv_chart_sort_rank',
      'inverter_seq',
    );
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
    const sensorChart = webUtil.makeStaticLineChart(
      sensorTrend,
      betweenDatePoint,
      chartOpt,
    );

    // BU.CLI(sensorChart);
    // return;
    /** Grouping Chart에 의미있는 이름을 부여함. */
    sensorChart.series.forEach(seriesInfo => {
      const sensorInfo = _.find(sensorTrend, { node_seq: _.toNumber(seriesInfo.name) });
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

  /**
   * FIXME: 스냅샷의 유효성 검증 처리 하지 않음. 필요시 처리
   * 카메라 데이터 추출
   * @param {number[]} cameraSeqList
   * @param {timeIntervalToValidateInfo} diffInfo
   */
  getCameraSnapshot(cameraSeqList, diffInfo = { diffType: 'minutes', duration: 10 }) {
    // BU.CLI(cameraSeqList);
    // 카메라 목록이 존재하지 않는다면 빈 배열 반환
    if (!cameraSeqList.length) return [];
    const sql = `
      SELECT csd.* FROM camera_snapshot_data csd
      INNER JOIN
        (
        SELECT MAX(camera_snapshot_data_seq) AS camera_snapshot_data_seq
        FROM camera_snapshot_data
        WHERE camera_seq IN (${cameraSeqList})
        GROUP BY camera_seq
        ) temp
       ON csd.camera_snapshot_data_seq = temp.camera_snapshot_data_seq
    `;

    return this.db.single(sql, null, false);
  }
}
module.exports = BiDevice;
