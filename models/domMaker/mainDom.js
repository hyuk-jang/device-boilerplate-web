const _ = require('lodash');
const moment = require('moment');

module.exports = {
  /**
   * 센서 현재 정보값 생성 돔. 좌측 사이드 영역을 생성할 때 사용
   * @param {domMainSensor[]} domMainSensorList
   */
  makeSensorStatusDom(domMainSensorList) {
    const sensorStatusTemplate = _.template(`
    <article class="sensor_data_view sdv_w_side">
      <p title="<%= ndName %>"><%= ndName %></p>
      <p id="<%= ndId %>"><%= value %></p>
      <p><%= dataUnit %></p>
    </article>
    `);
    const madeDom = domMainSensorList.map(row => sensorStatusTemplate(row));

    return madeDom;
  },

  /**
   * @param {{hasValidData: boolean: data: V_INVERTER_STATUS}[]} validInverterStatusRows
   */
  makeInverterStatusDom(validInverterStatusRows) {
    const inverterStatusTemplate = _.template(`
    <article class="component_ele_status">
      <header><%= siteName %></header>
      <section class="sensor_data_view sddv_w35">
        <article class="sensor_data_view sdv_w541 fs_150rem">
          <p>전압</p>
          <p><%= grid_rs_v %></p>
          <p>V</p>
        </article>
        <article class="sensor_data_view sdv_w541 fs_150rem">
          <p>전류</p>
          <p><%= grid_r_a %></p>
          <p>A</p>
        </article>
      </section>
    </article>
    `);
    const madeDom = validInverterStatusRows.map(validRow => {
      if (!validRow.hasValidData) {
        _.set(validRow.data, 'grid_rs_v', '-');
        _.set(validRow.data, 'grid_r_a', '-');
      }

      return inverterStatusTemplate(validRow.data);
    });

    return madeDom;
  },

  /**
   *
   * @param {Array} weatherCastRows
   * @param {Array} blockStatusList
   */
  makeWeatherCastTableDom(weatherCastRows, blockStatusList) {
    // 데이터를 원하는 모양으로 가공
    // FIXME:
    /** @type {WC_KMA_DATA} 날씨 정보 */
    const weatherChastInfo = _.reduce(
      weatherCastRows,
      (r, v) => _.mergeWith(r, v, (x, y) => (x || []).concat(y)),
      {},
    );

    // TODO::
    let count = 1; // 날짜가 바뀌는 부분을 체크하는 카운트
    const dynamicHeader = ` <tr>
      <th scope="row" class="date">날짜</th>
      ${_.map(weatherChastInfo.applydate, (date, index, dates) => {
        let madeHeader; //
        let day = moment(date).day();

        //
        switch (day) {
          case 0:
            day = '일';
            break;
          case 1:
            day = '월';
            break;
          case 2:
            day = '화';
            break;
          case 3:
            day = '수';
            break;
          case 4:
            day = '목';
            break;
          case 5:
            day = '금';
            break;
          case 6:
            day = '토';
            break;
          default:
            break;
        }

        //
        if (moment(dates[index]).format('D') === moment(dates[index + 1]).format('D')) {
          count += 1;
        } else {
          madeHeader = `<th colspan="${count}">${moment(date).format('D')}일 (${day})</th>`;
          count = 1;
        }
        return madeHeader;
      }).toString()}
    </tr>`;

    // TODO::
    const dynamicBody = _.map(blockStatusList, blockStatusInfo => {
      const { dataKey = '', dataUnit = '', mainTitle = '' } = blockStatusInfo;
      const dataList = _.result(weatherChastInfo, dataKey);
      let result; // FIXME: 변수명 수정 필요...

      //
      switch (dataKey) {
        case 'applydate':
          result = _.map(
            dataList,
            data => `<p class ="color_black">${moment(data).format('H')}</p>`,
          );
          break;
        case 'wf':
          result = _.map(dataList, data => `<img src="/image/wf/weather_${data}.png" width="17"/>`);
          break;
        case 'temp':
          result = _.map(dataList, data => `<p class="color_red">${data}</p>`);
          break;
        case 'reh':
          result = _.map(dataList, data => `<p class="color_green">${data}</p>`);
          break;
        case 'ws':
          result = _.map(dataList, data => `<p class="color_blue">${data}</p>`);
          break;
        case 'wd':
          result = _.map(dataList, data => `<img src="/image/wd/wd_${data}.gif" />`);
          break;
        default:
          result = dataList;
      }

      return `
        <tr>
        <th>${mainTitle} ${dataUnit}</th>
        ${_.map(result, data => `<td>${data} </td>`)}
        </tr>
      `;
    }).toString();

    // TODO::
    const dynamicColgroup = _.map(weatherCastRows, () => '<col style="width:33px">');

    // TODO: result
    const madeDom = `
    <table class="table table-bordered number_table growth_env_table">
    <colgroup>
      <col style="width:70px"> 
      ${dynamicColgroup}
    </colgroup>
    <thead>
      ${dynamicHeader}
     </thead
    <tbody>
      ${dynamicBody}
    </tbody>
    </table>
`;
    return madeDom.replace(/,/gi, '');
  },
};
