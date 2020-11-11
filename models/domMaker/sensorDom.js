const _ = require('lodash');
const { BU } = require('base-util-jh');

module.exports = {
  /**
   *
   * @param {V_DV_PLACE_RELATION[]} viewPlaceRelationRows
   * @param {{rowsNdIdList: string[], rowspanNdIdList: string[]}} pickedIdInfo
   * @param {{siteId: string, m_name: string}[]} mainSiteList
   */
  makeDynamicSensorDom(viewPlaceRelationRows, pickedIdInfo, mainSiteList) {
    const { rowsNdIdList = [], rowspanNdIdList = [] } = pickedIdInfo;
    // place_seq를 기준으로 grouping 후 총 지점 개수를 구함
    const gPlaceRelationInfo = _.groupBy(viewPlaceRelationRows, 'main_seq');

    const headerTemplate = _.template('<th><%= nd_target_name %>(<%= data_unit %>)</th>');

    // Picked목록에 따라 동적 Header 생성
    const dynamicHeaderDom = _.concat(rowsNdIdList, rowspanNdIdList)
      .reduce((domList, key) => {
        const placeRelationRow = _.find(viewPlaceRelationRows, {
          nd_target_id: key,
        });

        // 해당 결과물이 없을 경우 ndId는 없는 것으로 판단하고 ndIdList 재조정
        if (_.isUndefined(placeRelationRow)) {
          _.pull(rowsNdIdList, key);
          _.pull(rowspanNdIdList, key);
        } else {
          domList.push(headerTemplate(placeRelationRow));
        }
        return domList;
      }, [])
      .join('');

    // 만들어진 동적 Table Header Dom
    const sensorEnvHeaderDom = `
        <tr>
        <th style="width:14%"></th>
        ${dynamicHeaderDom}
        </tr>
      `;

    // BU.CLI(sensorReportHeaderDom);

    // Picked 목록에 따라 동적으로 만들 Table Tr TD 템플릿 초안 정의
    // 외기 환경을 제외한 Body
    const dynamicRowsBodyTemplate = rowsNdIdList.map(
      key => `<td style="width:6%" ><%= ${key} %></td>`,
    );
    // 외기 환경을 포함한 Body
    const dynamicRowspanBodyTemplate = rowspanNdIdList.map(
      key => `<td style="width:6%" rowspan=<%= rowsPan %>><%= ${key} %></td>`,
    );

    const partBodyTemplate = _.template(
      `<tr>
      <td class="table_title" title="<%= siteName %>"><%= siteName %></td>
      ${dynamicRowsBodyTemplate.join('')}
      </tr>`,
    );

    const fullBodyTemplate = _.template(
      `<tr>
      <td class="table_title"><%= siteName %></td>
      ${_.concat(dynamicRowsBodyTemplate, dynamicRowspanBodyTemplate).join('')}
      </tr>`,
    );

    // main Site 지점별 목록 순회
    const sensorEnvBodyDomList = _.map(gPlaceRelationInfo, (gPlaRelRows, strMainSeq) => {
      const siteInfo = _.find(mainSiteList, { siteId: strMainSeq });
      const mainName = _.get(siteInfo, 'm_name', '');

      // 공통으로 들어갈 외기 환경 부분을 추출
      const rowspanSensor = _.assign(
        ..._.map(gPlaRelRows, row => _.pick(row, rowspanNdIdList)),
      );

      // 데이터 가공
      this.convertData(rowspanSensor);
      // 천단위 기호 삽입
      BU.toLocaleString(rowspanSensor);
      // 만약 해당 Node Def Id가 없을 경우 공백 데이터 삽입
      _.forEach(rowspanNdIdList, ndId => {
        !_.has(rowspanSensor, ndId) && _.set(rowspanSensor, ndId, '');
      });

      // 강우 상황 설정 (rainImg: weather_5.png, sunImg: weather_1.png)
      // _.set(outsideSensor, 'rainStatus', _.get(outsideSensor, 'isRain', '') === 1 ? 5 : 1);

      // 센서 군 장소 목록 길이
      const rowsLength = _(gPlaRelRows).map('place_seq').uniq().value().length;

      // 장소 단위로 그룹
      let isFirst = true;
      const gSubPlaRelList = _(gPlaRelRows)
        .groupBy('place_seq')
        .sortBy(row => _.head(row).chart_sort_rank)
        .value();

      const sensorTableTR = _.map(gSubPlaRelList, pRows => {
        // Place Rows에서 Node Def Id Key를 가진 요소 추출하여 배열 생성 ex) [{lux: 34}, {co2: 11}, {lux: 11}, {windSpeed: 2.1}]
        const pRowsSensorDataRows = _.map(pRows, row => _.pick(row, rowsNdIdList));

        // 중복된 Key를 가진 객체는 평균치로 환산하고 없는 데이터는 제거.
        // 완전한 하나의 데이터 객체로 만듬 ex) {lux: 15, co2: 66, windSpeed: 2.1}
        const rowsSensor = _.assign(
          // Node Def Id 목록 만큼 데이터 객체를 생성 한 후 해체처리
          ..._.map(rowsNdIdList, ndId => {
            // ndId에 맞는 Rows. ex) [{lux: 15}, {lux: 23}]
            const filterdRows = _.filter(pRowsSensorDataRows, row => _.has(row, ndId));
            // 데이터가 존재할 경우에만 평균치 객체 생성
            return filterdRows.length
              ? { [ndId]: _.round(_.meanBy(filterdRows, ndId), 1) }
              : {};
          }),
        );

        // 데이터 가공
        this.convertData(rowsSensor);
        // 천단위 기호 삽입
        BU.toLocaleString(rowsSensor);
        // 만약 해당 Node Def Id가 없을 경우 공백 데이터 삽입
        _.forEach(rowsNdIdList, ndId => {
          !_.has(rowsSensor, ndId) && _.set(rowsSensor, ndId, '');
        });

        // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
        const {
          pd_target_name: subName = '',
          p_target_name: lastName = '',
          // p_target_code: lastCode = '',
        } = _.head(pRows);

        const siteName = `${mainName ? ` ${mainName}` : ''}${
          subName ? ` ${subName}` : ''
        }${lastName ? ` ${lastName}` : ''}`;

        _.set(rowsSensor, 'siteName', siteName);

        // Site의 첫번째를 구성할 경우에는 rowsPan 처리를 하여야 하므로 외기 환경과의 데이터를 합침
        if (isFirst) {
          isFirst = false;
          // rowsPan 입력
          _.set(rowsSensor, 'rowsPan', rowsLength);
          // BU.CLIS(insideSensor, outsideSensor);
          return fullBodyTemplate(_.assign(rowsSensor, rowspanSensor));
        }
        return partBodyTemplate(rowsSensor);
      });

      return sensorTableTR.join('');
    });

    // BU.CLIN(sensorEnvBodyDomList);
    return {
      sensorEnvHeaderDom,
      sensorEnvBodyDom: _.flatten(sensorEnvBodyDomList).join(''),
    };

    // return _.flatten(sensorEnvBodyDomList);
  },

  /**
   * 데이터를 가공
   * @param {Object} sensorInfo
   */
  convertData(sensorInfo) {
    // 풍향 재설정
    if (_.has(sensorInfo, 'windDirection')) {
      _.set(
        sensorInfo,
        'windDirection',
        BU.getWindDirection(_.get(sensorInfo, 'windDirection', '')),
      );
    }

    // 우천 감지 재설정
    if (_.has(sensorInfo, 'isRain')) {
      const isRain = _.get(sensorInfo, 'isRain', '');
      let rainValue = '';
      switch (isRain) {
        case 0:
          rainValue = 'X';
          break;
        case 1:
          rainValue = 'O';
          break;
        default:
          break;
      }
      _.set(sensorInfo, 'rainStatus', rainValue);
    }
  },

  /**
   *
   * @param {V_INVERTER_STATUS[]} viewPlaceRelationRows
   * @param {{siteId: string, m_name: string}[]} mainSiteList
   */
  makeSensorStatusDom(viewPlaceRelationRows, mainSiteList) {
    // place_seq를 기준으로 grouping 후 총 지점 개수를 구함
    const groupByMainSeqRelation = _.groupBy(viewPlaceRelationRows, 'main_seq');

    // rowsPan을 포함한 TR을 생성하기 위한 템플릿
    const firstTemplateTR = _.template(
      `<tr>
        <td class="table_title"><%= siteName %></td>
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
        <td class="table_title"><%= siteName %></td>
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
    const madeDom = _.map(
      groupByMainSeqRelation,
      (groupPlaceRelationRows, strMainSeq) => {
        const siteInfo = _.find(mainSiteList, { siteId: strMainSeq });
        const mainName = _.get(siteInfo, 'm_name', '');
        // 공통으로 들어갈 외기 환경 부분을 추출
        const outsidePlaceRows = groupPlaceRelationRows.filter(row =>
          _.includes(row.place_id, 'OS_'),
        );

        const outsideSensor = _.assign(
          ..._.map(outsidePlaceRows, row => _.pick(row, OUTSIDE_LIST)),
        );

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

        _.forEach(OUTSIDE_LIST, ndId => {
          !_.has(outsideSensor, ndId) && _.set(outsideSensor, ndId, '');
        });

        // 강우 상황 설정 (rainImg: weather_5.png, sunImg: weather_1.png)
        // _.set(outsideSensor, 'rainStatus', _.get(outsideSensor, 'isRain', '') === 1 ? 5 : 1);

        // 센서 군 장소 목록 길이
        const rowsLength = _(groupPlaceRelationRows).map('place_seq').uniq().value()
          .length;

        // 장소 단위로 그룹
        let isFirst = true;
        const groupByPlaceSeqRelation = _.groupBy(groupPlaceRelationRows, 'place_seq');

        const sensorTable = _.map(groupByPlaceSeqRelation, pRows => {
          const insideSensor = _.assign(..._.map(pRows, row => _.pick(row, INSIDE_LIST)));
          // 만약 해당 Node Def Id가 없을 경우 공백 데이터 삽입
          _.forEach(INSIDE_LIST, ndId => {
            !_.has(insideSensor, ndId) && _.set(insideSensor, ndId, '');
          });

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
      },
    );

    return _.flatten(madeDom);
  },
};
