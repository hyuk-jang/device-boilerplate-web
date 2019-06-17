/**
 *
 * @param {HTMLElement} domElement
 * @param {{dataList: V_PW_INVERTER_STATUS[], totalInfo: {pv_kw: number, grid_kw: number, d_kwh: number, m_kwh: number}}} inverterStatusList
 * @param {string} siteId
 */
function setInverterList(domElement, inverterStatusList) {
  const inverterStatusTemplate = _.template(`
    <tr class="sel">
    <td scope="row"><%= siteName %></td>
    <td > <%= horizontalSolar %> </td>
    <td> <%= pv_a %> </td>
    <td> <%= pv_v %> </td>
    <td> <%= pv_kw %> </td>
    <td> <%= grid_r_a %> </td>
    <td> <%= grid_rs_v %> </td>
    <td> <%= line_f %> </td>
    <td> <%= power_kw %> </td>
    <td> <%= power_f %> </td>
    <td> <%= daily_power_kwh %> </td>
    <td> <%= power_cp_kwh %> </td>
    <td class="center_ball">
      <img src="/image/<%= operImgName %>" />
    </td>
  </tr>
    `);
  const optionList = inverterStatusList.dataList.map(inverterStatusInfo => {
    const operImgName = inverterStatusInfo.isOperation ? 'green.png' : 'red.png';
    inverterStatusInfo.operImgName = operImgName;

    return inverterStatusTemplate(inverterStatusInfo);
  });
  $(domElement).html(optionList);
  // domElement.innerHTML = optionList;
}
