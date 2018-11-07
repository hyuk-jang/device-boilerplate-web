const _ = require('lodash');

const { BU } = require('base-util-jh');

module.exports = {
  /**
   *
   * @param {V_PW_PROFILE[]} inverterProfileRows
   * @param {number} inverterSeq
   */
  makeInverterSiteDom(inverterProfileRows, inverterSeq) {
    inverterSeq = BU.isNumberic(inverterSeq) ? Number(inverterSeq) : inverterSeq;
    const inverterSiteDom = _.template(`
  <option <%= selected %> data-type="inverter" value="<%= inverter_seq %>"><%= inverterName %></option>
`);
    const madeDom = inverterProfileRows.map(row => {
      const {
        m_name: mainName = '',
        ivt_amount: ivtAmount = 0,
        ivt_target_name: ivtName = '',
        ivt_director_name: ivtDirectorName = '',
      } = row;
      _.set(row, 'selected', _.eq(row.inverter_seq, inverterSeq) ? 'selected' : '');
      const inverterName = `${mainName} ${_.round(ivtAmount)}kW급 ${ivtName} ${ivtDirectorName}`;
      _.set(row, 'inverterName', inverterName);
      return inverterSiteDom(row);
    });

    madeDom.unshift(
      inverterSiteDom({
        selected: '',
        inverter_seq: 'all',
        inverterName: '모두',
      }),
    );

    return madeDom;
  },

  /**
   *
   * @param {PW_INVERTER_DATA[]} inverterReportRows
   * @param {page: number, pageListCount: number} paginationInfo
   */
  makeInverterReportDom(inverterReportRows, paginationInfo) {
    const firstRowNum = (paginationInfo.page - 1) * paginationInfo.pageListCount;
    const inverterReportTemplate = _.template(`
        <tr>
        <td><%= num %></td>
        <td><%= group_date %></td>
        <td><%= avg_pv_a %></td>
        <td><%= avg_pv_v %></td>
        <td><%= avg_pv_kw %></td>
        <td><%= avg_grid_r_a %></td>
        <td><%= avg_grid_rs_v %></td>
        <td><%= avg_line_f %></td>
        <td><%= avg_power_kw %></td>
        <td><%= powerFactor %></td>
        <td><%= total_c_mwh %></td>
      </tr>
    `);
    const inverterReportsDom = inverterReportRows.map((row, index) => {
      const pvKw = _.get(row, 'avg_pv_kw', '');
      const powerKw = _.get(row, 'avg_power_kw', '');

      // 번호
      _.set(row, 'num', firstRowNum + index + 1);
      // 발전 효율
      _.set(row, 'powerFactor', _.round(_.divide(powerKw, pvKw) * 100, 1));

      return inverterReportTemplate(row);
    });

    return inverterReportsDom;
  },

  /**
   *
   * @param {string} subCategory
   */
  makeSubCategoryDom(subCategory = 'sensor') {
    const selected = 'btn-success';
    const unselected = 'btn-default';

    let sensor = '';
    let inverter = '';

    switch (subCategory) {
      case 'sensor':
        sensor = selected;
        inverter = unselected;
        break;
      case 'inverter':
        sensor = unselected;
        inverter = selected;
        break;
      default:
        sensor = selected;
        inverter = unselected;
        break;
    }

    const subCategoryTemplate = _.template(`
      <button type="button" value="sensor" class="btn <%= sensor %> btn1">생육환경</button>
      <button type="button" value="inverter" class="btn <%= inverter %> btn2">인버터</button>
    `);

    const madeDom = subCategoryTemplate({ sensor, inverter });
    return madeDom;
  },
};
