const _ = require('lodash');

module.exports = {
  /**
   * @param {V_INVERTER_STATUS[]} inverterStatusRows
   */
  makeInverterStatusDom(inverterStatusRows) {
    // <input class="input-tx" type="text" value="<%= siteName %>">
    const inverterStatusTemplate = _.template(`
    <div class="box_5_in">
    <div class="box_5_a" style="display:flex; align-items: center; min-height:50px; word-break: keep-all;word-wrap: break-word; padding: 5px; text-align: left">
      <b><%= siteName %> </b>
    </div>
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전압</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_rs_v %>"><span> V</span></div>
    </div>
    <div class="box_5_a">
      <div class="box_5_in_sp">
        <p>AC전류</p>
      </div>
      <div> <input class="wed_3" type="text" value="<%= grid_r_a %>"><span> A</span></div>
    </div>
  </div>
    `);
    const madeDom = inverterStatusRows.map(row => inverterStatusTemplate(row));

    return madeDom;
  },
};
