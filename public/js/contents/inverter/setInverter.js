/**
 *
 * @param {HTMLElement} domElement
 * @param {{dataList: V_PW_INVERTER_STATUS[], totalInfo: {pv_kw: number, grid_kw: number, d_kwh: number, m_kwh: number}}} inverterStatusList
 * @param {string} siteId
 */
function setInverterList(domElement, inverterStatusList) {
  const inverterStatusTemplate = _.template(
    '\n    <tr class="sel">\n    <td scope="row"><%= siteName %></td>\n    <td > <%= inclinedSolar %> </td>\n    <td> <%= pv_a %> </td>\n    <td> <%= pv_v %> </td>\n    <td> <%= pv_kw %> </td>\n    <td> <%= grid_r_a %> </td>\n    <td> <%= grid_rs_v %> </td>\n    <td> <%= line_f %> </td>\n    <td> <%= power_kw %> </td>\n    <td> <%= power_f %> </td>\n    <td> <%= daily_power_kwh %> </td>\n    <td> <%= power_c_kwh %> </td>\n    <td class="center_ball">\n      <img src="/image/<%= operImgName %>" />\n    </td>\n  </tr>\n    ',
  );

  const optionList = inverterStatusList.dataList.map(function(inverterStatusInfo) {
    const operImgName = inverterStatusInfo.isOperation ? 'green.png' : 'red.png';
    inverterStatusInfo.operImgName = operImgName;
    return inverterStatusTemplate(inverterStatusInfo);
  });
  $(domElement).html(optionList); // domElement.innerHTML = optionList;
}
