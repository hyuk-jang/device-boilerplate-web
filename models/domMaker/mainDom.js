const _ = require('lodash');
const moment = require('moment');
const { BU } = require('base-util-jh');

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
    const madeDom = domMainSensorList.map(row => sensorStatusTemplate(row)).join('');

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
    const madeDom = validInverterStatusRows
      .map(validRow => {
        if (!validRow.hasValidData) {
          _.set(validRow.data, 'grid_rs_v', '-');
          _.set(validRow.data, 'grid_r_a', '-');
        }

        return inverterStatusTemplate(validRow.data);
      })
      .join('');

    return madeDom;
  },

  /**
   * 기상 환경 정보 테이블
   * @param {Array} weatherCastRows
   * @param {Array} blockStatusList
   */
  makeWeatherCastTableDom(weatherCastRows, blockStatusList) {
    moment.locale('ko'); // moment.js 한글 확장팩 적용

    /**
     * collection을 키값을 기준으로 데이터를 배열화
     * @type {WC_KMA_DATA} 날씨 정보
     * */
    const weatherChastInfo = _.reduce(
      weatherCastRows,
      (result, weatherCastRow) =>
        _.mergeWith(result, weatherCastRow, (resultVal, weatherCastRowVal) =>
          (resultVal || []).concat(weatherCastRowVal),
        ),
      {},
    );

    // table header 생성 (날짜 정보)
    let checkNextDayCount = 1; // 날짜가 바뀌는 부분을 체크하는 카운트
    const dynamicHeader = ` <tr>
      <th scope="row" class="date">날짜</th>
      ${_.map(weatherChastInfo.applydate, (date, index, dates) => {
        let madeHeader; //
        const day = moment.weekdaysShort(moment(date).day()); // 요일

        // 날짜가 바뀌는 시점 레이아웃 나누기
        if (moment(dates[index]).format('D') === moment(dates[index + 1]).format('D')) {
          checkNextDayCount += 1;
        } else {
          madeHeader = `<th class="elipsis" colspan="${checkNextDayCount}">${moment(
            date,
          ).format('D')}일 (${day})</th>`;
          checkNextDayCount = 1;
        }
        return madeHeader;
      }).toString()}
    </tr>`;

    // table body 생성
    const dynamicBody = _.map(blockStatusList, blockStatusInfo => {
      const { dataKey = '', dataUnit = '', mainTitle = '' } = blockStatusInfo;
      const dataList = _.result(weatherChastInfo, dataKey);
      let madeBody;

      // 기상 정보에 따른 태그 변화
      switch (dataKey) {
        case 'applydate':
          madeBody = _.map(
            dataList,
            data => `<p class ="color_black">${moment(data).format('H')}</p>`,
          );
          break;
        case 'wf':
          madeBody = _.map(
            dataList,
            data => `<img src="/image/weather/weather_${data}.png" width="17"/>`,
          );
          break;
        case 'temp':
          madeBody = _.map(dataList, data => `<p class="color_red">${data}</p>`);
          break;
        case 'reh':
          madeBody = _.map(dataList, data => `<p class="color_green">${data}</p>`);
          break;
        case 'ws':
          madeBody = _.map(dataList, data => `<p class="color_blue">${data}</p>`);
          break;
        case 'wd':
          madeBody = _.map(
            dataList,
            data => `<img src="/image/weather/wd_${data}.gif" />`,
          );
          break;
        default:
          madeBody = dataList;
      }

      return `
        <tr>
        <th nowrap>${mainTitle} ${dataUnit}</th>
        ${_.map(madeBody, data => {
          return _.includes(data, 'img')
            ? `<td class="txt_align_c">${data} </td>`
            : `<td>${data} </td>`;
        })}
        </tr>
      `;
    }).join('');

    const dynamicColgroup = _.map(weatherCastRows, () => '<col class="w_2rem">');

    // result
    const madeDom = `
    <table class="table table-bordered number_table weather_forecast_table" cellspacing='0'>
    <colgroup>
      <col class="w_7rem"> 
      ${dynamicColgroup}
    </colgroup>
    <thead>
      ${dynamicHeader}
     </thead
    <tbody>
      ${dynamicBody}
    </tbody>
    </table>
`;
    return madeDom.replace(/,/gi, '');
  },
};
