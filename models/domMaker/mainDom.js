const _ = require('lodash');

module.exports = {
  /**
   * @param {V_INVERTER_STATUS[]} inverterStatusRows
   */
  makeInverterStatusDom(inverterStatusRows) {
    // <input class="input-tx" type="text" value="<%= siteName %>">
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
    const madeDom = inverterStatusRows.map(row => inverterStatusTemplate(row));

    return madeDom;
  },
};
