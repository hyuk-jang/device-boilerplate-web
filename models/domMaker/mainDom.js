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
      <div class="ele_status_area">
        <article class="ele_data_status">
          <div class="ele_data_name">
            전압
          </div>
          <div class="ele_data_value_area">
            <span class="ele_data_value"><%= grid_rs_v %></span><span> A</span>
          </div>
        </article>
        <article class="ele_data_status">
          <div class="ele_data_name">전류</div>
          <div class="ele_data_value_area">
            <span class="ele_data_value"><%= grid_r_a %></span><span> A</span>
          </div>
        </article>
      </div>
    </article>
    `);
    const madeDom = inverterStatusRows.map(row => inverterStatusTemplate(row));

    return madeDom;
  },
};
