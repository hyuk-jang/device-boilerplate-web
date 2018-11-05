const _ = require('lodash');

module.exports = {
  /**
   *
   * @param {V_INVERTER_STATUS[]} inverterStatusRows
   */
  makeInverterStatusDom(inverterStatusRows) {
    // <input class="input-tx" type="text" value="<%= siteName %>">
    const inverterStatusTemplate = _.template(`
    <div class="box_5_in">
    <div><%= siteName %></div>
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전압</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_rs_v %>"><span>(v)</span></div>
    </div>
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전류</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_r_a %>"><span>(v)</span></div>
    </div>
  </div>
    `);
    const madeDom = inverterStatusRows.map(row => inverterStatusTemplate(row));

    return madeDom;
  },
};
