const _ = require('lodash');
const { BU } = require('base-util-jh');

module.exports = {
  /**
   *
   * @param {V_INVERTER_STATUS[]} viewPlaceRelationRows
   * @param {{siteid: string, m_name: string}[]} mainSiteList
   */
  makeSensorStatusDom(viewPlaceRelationRows, mainSiteList) {
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
        <td rowspan=<%= rowsPan %>> <%= rainStatus %> </td>
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

    // main Site 지점별 목록 순회
    const madeDom = _.map(groupByMainSeqRelation, (groupPlaceRelationRows, strMainSeq) => {
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

      if (_.get(outsideSensor, 'isRain', '') === 1) {
        _.set(outsideSensor, 'rainStatus', 'O');
      } else if (_.get(outsideSensor, 'isRain', '') === 0) {
        _.set(outsideSensor, 'rainStatus', 'X');
      } else {
        _.set(outsideSensor, 'rainStatus', '-');
      }

      // 강우 상황 설정 (rainImg: weather_5.png, sunImg: weather_1.png)
      // _.set(outsideSensor, 'rainStatus', _.get(outsideSensor, 'isRain', '') === 1 ? 5 : 1);

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

      return sensorTable;
    });

    return _.flatten(madeDom);
  },
};
