const _ = require('lodash');

module.exports = {
  /**
   * 인버터 현재 상태
   * @param {{dataList: V_PW_INVERTER_STATUS[], totalInfo: {pv_kw: number, grid_kw: number, d_kwh: number, m_kwh: number}}} inverterStatusList
   * @param {string} siteId
   */
  makeInverterStatusList(inverterStatusList) {
    const inverterStatusTemplate = _.template(`
    <tr>
    <td title="<%= siteName %>"><%= siteName %></td>
    <td class="text-right"> <%= inclinedSolar %> </td>
    <td class="text-right"> <%= pv_a %> </td>
    <td class="text-right"> <%= pv_v %> </td>
    <td class="text-right"> <%= pv_kw %> </td>
    <td class="text-right"> <%= grid_r_a %> </td>
    <td class="text-right"> <%= grid_rs_v %> </td>
    <td class="text-right"> <%= line_f %> </td>
    <td class="text-right"> <%= power_kw %> </td>
    <td class="text-right"> <%= power_f %> </td>
    <td class="text-right"> <%= daily_power_kwh %> </td>
    <td class="text-right"> <%= power_total_kwh %> </td>
    <td class="text-center">
      <img src="/image/<%= operImgName %>" />
    </td>
  </tr>
    `);
    const madeDom = inverterStatusList.dataList.map(inverterStatusInfo => {
      const operImgName = inverterStatusInfo.hasOperation ? 'green.png' : 'red.png';
      inverterStatusInfo.operImgName = operImgName;

      return inverterStatusTemplate(inverterStatusInfo);
    });
    return madeDom;
  },
};
