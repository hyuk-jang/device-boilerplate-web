const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    _.set(req, 'locals.menuNum', 2);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // BU.CLI(req.user);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {{siteid: string, m_name: string}[]} */
    const mainSiteList = req.locals.siteList;

    // 지점 Id를 불러옴
    const { siteId } = req.locals;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const profileWhere = _.eq(siteId, 'all') ? null : { main_seq: siteId };

    // Power 현황 테이블에서 선택한 Site에 속해있는 인버터 목록을 가져옴
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biModule.getTable('v_dv_sensor_profile', profileWhere);
    /** @type {V_DV_PLACE_RELATION[]} */
    let viewPlaceRelationRows = await biModule.getTable('v_dv_place_relation', profileWhere);

    // TODO: 각  relation에 동일 node_seq를 사용하고 있다면 profile 현재 데이터 기입, 아니라면 row는 제거

    // IVT가 포함된 장소는 제거.
    viewPlaceRelationRows = _.reject(viewPlaceRelationRows, placeRelation =>
      _.includes(placeRelation.place_id, 'IVT'),
    );

    // 각 Relation에 해당 데이터 확장
    viewPlaceRelationRows.forEach(placeRelation => {
      const foundIt = _.find(viewSensorProfileRows, { node_seq: placeRelation.node_seq });
      // 데이터가 존재한다면 sensorProfile Node Def ID로 해당 데이터 입력
      if (foundIt) {
        _.set(placeRelation, foundIt.nd_target_id, foundIt.node_data);
        _.set(placeRelation, 'writedate', foundIt.writedate);
      }
    });

    // place_seq를 기준으로 grouping 후 총 지점 개수를 구함
    const groupByMainSeqRelation = _.groupBy(viewPlaceRelationRows, 'main_seq');

    // rowsPan을 포함한 TR을 생성하기 위한 템플릿
    const firstTemplateTR = _.template(
      `<tr>
        <td scope="row"><%= siteName %></td>
        <td><%= lux %></td>
        <td><%= co2 %></td>
        <td><%= soilWaterValue %></td>
        <td><%= soilTemperature %></td>
        <td><%= soilReh %></td>
        <td rowspan=<%= rowsPan %>> <%= outsideAirTemperature %> </td>
        <td rowspan=<%= rowsPan %>> <%= outsideAirReh %> </td>
        <td rowspan=<%= rowsPan %>> <%= horizontalSolar %> </td>
        <td rowspan=<%= rowsPan %>> <%= windDirection %> </td>
        <td rowspan=<%= rowsPan %>> <%= windSpeed %> </td>
        <td rowspan=<%= rowsPan %>> <%= r1 %> </td>
        <td rowspan=<%= rowsPan %>> <img src="image/weather/weather_<%= rainImgSrc %>.png" > </td>
      </tr>`,
    );

    // 생육 센서만을 표현하기 위한 TR 템플릿
    const secondRowTemplateTR = _.template(
      `<tr>
        <td scope="row"><%= siteName %></td>
        <td><%= lux %></td>
        <td><%= co2 %></td>
        <td><%= soilWaterValue %></td>
        <td><%= soilTemperature %></td>
        <td><%= soilReh %></td>
      </tr>`,
    );

    // 생육 센서 목록
    const INSIDE_LIST = ['lux', 'co2', 'soilWaterValue', 'soilTemperature', 'soilReh'];

    // 외기 센서 목록
    const OUTSIDE_LIST = [
      'outsideAirTemperature',
      'outsideAirReh',
      'horizontalSolar',
      'windDirection',
      'windSpeed',
      'r1',
      'isRain',
    ];

    let sensorTableList = [];

    // main Site 지점별 목록 순회
    _.forEach(groupByMainSeqRelation, (groupPlaceRelationRows, strMainSeq) => {
      const siteInfo = _.find(mainSiteList, { siteid: strMainSeq });
      const mainName = _.get(siteInfo, 'm_name', '');
      // 공통으로 들어갈 외기 환경 부분을 추출
      const outsidePlaceRows = groupPlaceRelationRows.filter(row =>
        _.includes(row.place_id, 'OS_'),
      );

      const outsideSensor = _.assign(..._.map(outsidePlaceRows, row => _.pick(row, OUTSIDE_LIST)));

      // 풍향 재설정
      _.set(
        outsideSensor,
        'windDirection',
        BU.getWindDirection(_.get(outsideSensor, 'windDirection', '')),
      );

      // 강우 상황 설정 (rainImg: weather_5.png, sunImg: weather_1.png)
      _.set(outsideSensor, 'rainImgSrc', _.get(outsideSensor, 'isRain', '') === 1 ? 5 : 1);

      // 센서 군 장소 목록 길이
      const rowsLength = _(groupPlaceRelationRows)
        .map('place_seq')
        .uniq()
        .value().length;

      // 장소 단위로 그룹
      let isFirst = true;
      const groupByPlaceSeqRelation = _.groupBy(groupPlaceRelationRows, 'place_seq');

      const sensorTable = _.map(groupByPlaceSeqRelation, pRows => {
        const insideSensor = _.assign(..._.map(pRows, row => _.pick(row, INSIDE_LIST)));

        // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
        const { pd_target_name: subName, p_target_name: lastName } = _.head(pRows);
        const siteName = `${mainName} ${subName || ''} ${lastName || ''}`;

        _.set(insideSensor, 'siteName', siteName);

        // Site의 첫번째를 구성할 경우에는 rowsPan 처리를 하여야 하므로 외기 환경과의 데이터를 합침
        if (isFirst) {
          isFirst = false;
          // rowsPan 입력
          _.set(insideSensor, 'rowsPan', rowsLength);

          return firstTemplateTR(_.assign(insideSensor, outsideSensor));
        }
        return secondRowTemplateTR(insideSensor);
      });

      sensorTableList = sensorTableList.concat(sensorTable);
    });

    // BU.CLI(sensorTableList);

    req.locals.sensorTableList = sensorTableList;

    // 지점 Id를 불러옴

    // BU.CLIN(req.locals);
    res.render('./sensor/sensor', req.locals);
  }),
);

module.exports = router;
