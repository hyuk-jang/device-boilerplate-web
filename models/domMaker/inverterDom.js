const _ = require('lodash');

const { BU } = require('base-util-jh');

const { addComma } = require('../templates/common.util');

module.exports = {
  /**
   * 인버터 현재 상태
   * @param {V_PW_INVERTER_STATUS[]} inverterStatusList
   * @param {string} siteId
   */
  makeCurrInverterStatus(inverterStatusList) {
    const inverterStatusTemplate = _.template(`
    <tr>
    <td class="table_title" title="<%= siteName %>"><%= siteName %></td>
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
    <td class="text-center">
      <img src="/image/<%= operImgName %>" />
    </td>
  </tr>
    `);
    const madeDom = inverterStatusList.map(inverterStatusInfo => {
      BU.toLocaleString(inverterStatusInfo);
      const operImgName = inverterStatusInfo.isOperation ? 'green.png' : 'red.png';
      inverterStatusInfo.operImgName = operImgName;

      return inverterStatusTemplate(inverterStatusInfo);
    });
    return madeDom;
  },

  /**
   * 인버터 현재 상태
   * @param {{dataList: V_PW_INVERTER_STATUS[], totalInfo: {pv_kw: number, grid_kw: number, d_kwh: number, m_kwh: number}}} inverterStatusList
   * @param {string} siteId
   */
  makeInverterStatusList(inverterStatusList) {
    const inverterStatusTemplate = _.template(`
    <tr>
    <td class="table_title" title="<%= siteName %>"><%= siteName %></td>
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
    <td class="text-center">
      <img src="/image/<%= operImgName %>" />
    </td>
  </tr>
    `);
    const madeDom = inverterStatusList.dataList.map(inverterStatusInfo => {
      const operImgName = inverterStatusInfo.isOperation ? 'green.png' : 'red.png';
      inverterStatusInfo.operImgName = operImgName;
      // 데이터 중 이상 데이터일 경우 - 변환
      _.forEach(inverterStatusInfo, (v, k) => {
        if (_.isNumber(v)) {
          // 일반 숫자형은 천단위 기호 추가, NaN or Infinite 경우 - 기호 처리
          inverterStatusInfo[k] = Number.isFinite(v) ? addComma(v) : '-';
        }
      });

      return inverterStatusTemplate(inverterStatusInfo);
    });
    return madeDom.join('');
  },
};
