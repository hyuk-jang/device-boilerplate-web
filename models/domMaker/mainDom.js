const _ = require('lodash');

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
};
