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

  // FIXME: 함수 이름 고민..
  /**
   *
   * @param {Array} weatherCastList
   */
  makeweatherCastTableDom(weatherCastList) {
    const todayWeatherCast = [];
    const futureWeaterCast = [];

    _.forEach(weatherCastList, weaterCastInfo => {
      const day = moment(weaterCastInfo.applydate).date();
      day === moment().date() && todayWeatherCast.push(weaterCastInfo);
    });

    const dynamicRowsBodyTemplate = weatherCastList.map();

    // TODO: 시각 row
    const hourRowTemplate = _.template(`<tr class="time" >
    <th scope="row">시각</th>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
    <td><p>0</p></td>
  </tr>`);
    // TODO: 날씨 row
    const weatherRowTemplate = _.template(` <tr class="weather">
    <th scope="row">날씨</th>
    <td><img src="" width="20"></td>
  </tr>`);
    // TODO: 강수율 row
    const popRowTemplate = _.template(` <tr>
    <th scope="row">강수율</th>
    <td>0</td>
  </tr>`);
    // TODO: 기온 row
    const tempRowTemplate = _.template(` <tr class="degree">
    <th scope="row">기온(℃)</th>  
    <td><p>0</p></td>
  </tr> `);
    // TODO: 풍향/풍속 row
    const wsRowTemplate = _.template(`<tr class="wind"> 
    <th scope="row" style="letter-spacing: -1px">풍향/<br>풍속(km/h)</th>
    <td><p><img src=""></p><p><span>0</span></p></td>
  </tr>`);
    // TODO: 습도 row
    const rehRowTemplate = _.template(`<tr class="humidity">   
    <th scope="row">습도(%)</th>
    <td><p>0</p></td>                 
  </tr>`);

    // TODO: result
    const weatherCastTableTemplate = _.template(`
    <table class="table table-bordered number_table growthEnv_table">
    <colgroup>
      <col style="width:70px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:30px">
      <col style="width:0px">
    </colgroup>
    <thead>
      <tr>
        <th scope="row" class="date">날짜</th>
        <th colspan="${
          todayWeatherCast.length
        }" scope="colgroup" class="today">오늘(${moment().format('D')}일)</th>
        <th colspan="8" scope="colgroup" class="tommorow">내일(${moment()
          .add(1, 'days')
          .format('D')}일)</th>
        <th colspan="8" scope="colgroup" class="twoday">모레(${moment()
          .add(2, 'days')
          .format('D')}일)</th>
        <th scope="col" class="last"></th>
      </tr>
    </thead>
    <tbody>
    ${hourRowTemplate()}
    ${weatherRowTemplate()}
    ${popRowTemplate()}
    ${tempRowTemplate()}
    ${wsRowTemplate()}
    ${rehRowTemplate()}
    </tbody>
    </table>`);

    return weatherCastTableTemplate();
  },
};
