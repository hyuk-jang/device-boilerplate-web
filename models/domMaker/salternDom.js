const _ = require('lodash');

const { BU } = require('base-util-jh');

const defaultDom = require('./defaultDom');

module.exports = {
  /**
   * 센서 현재 정보값 생성 돔. 좌측 사이드 영역을 생성할 때 사용
   * @param {SEB_RELATION[]} measureStatusList
   * @param {blockViewMakeOption[]} blockViewList
   */
  makeMeasureStatusDom(measureStatusList, blockViewList) {
    const tableHeaderDom = defaultDom.makeDynamicBlockTableHeader({
      blockTableOptions: blockViewList,
    });

    const inverterRegeditList = [];

    const tableBodyDom = measureStatusList.map(dataRow => {
      let contentsTemplate = '';
      // 최초 인버터 인지 확인
      const isMergeInverter = _.includes(inverterRegeditList, dataRow.inverter_seq);
      // 인버터를 찾지 못하였다면 병합 대상
      if (isMergeInverter === false) {
        // 병합 처리한 걸로 등록
        inverterRegeditList.push(dataRow.inverter_seq);

        // 인버터가 포함하는 모듈은 몇개인지 확인
        const inverterMergeLength = _.filter(measureStatusList, {
          inverter_seq: dataRow.inverter_seq,
        }).length;

        // 인버터가 mainTitle에 걸릴경우 병합 처리.
        contentsTemplate = _.chain(blockViewList)
          .map(blockInfo => {
            const { dataKey, mainTitle } = blockInfo;
            if (mainTitle === '인버터') {
              return `<td rowspan=${inverterMergeLength}><%= ${dataKey} %></td>`;
            }
            return `<td><%= ${dataKey} %></td>`;
          })
          .value()
          .toString();
      } else {
        contentsTemplate = _.chain(blockViewList)
          .map(blockInfo => {
            const { dataKey, mainTitle } = blockInfo;
            return mainTitle !== '인버터' ? `<td><%= ${dataKey} %></td>` : '';
          })
          .value()
          .toString();
      }

      // 온전한 바디 템플릿 돔 생성
      const bodyTemplate = _.template(`<tr>${contentsTemplate}</tr>`);

      const pvKw = _.get(dataRow, 'pvKw', '');
      const powerKw = _.get(dataRow, 'gridKw', '');

      // 번호
      // _.set(dataRow, 'num', index + 1);
      // 발전 효율 (계산하여 재정의 함)

      // 발전 효율
      const gridPf =
        _.isNumber(powerKw) && _.isNumber(pvKw) ? _.round(_.divide(powerKw, pvKw) * 100, 1) : '';

      _.set(dataRow, 'gridPf', gridPf);
      // 계산식 반영 및 천단위 기호 추가
      defaultDom.applyCalcDataRow({
        dataRow,
        bodyConfigList: blockViewList,
      });

      // BU.toLocaleString(dataRow);

      return bodyTemplate(dataRow);
    });

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },
  /**
   * 센서 현재 정보값 생성 돔. 좌측 사이드 영역을 생성할 때 사용
   * @param {SEB_RELATION[]} measureStatusList
   */
  makeMeasureViewDom(measureStatusList) {
    const headerDom = _.chain(measureStatusList)
      .map(measureStatus => {
        const headerTemplate = _.template('<th><%= seb_name %></th>');
        return headerTemplate(measureStatus);
      })
      .thru(dom => {
        return `
          <tr>
            <th></th>
            ${dom}
          </tr>
        `;
      })
      .value();

    const trTemplate = _.template(`
        <tr>
          <td><%= rowName %></td>
          <%= contents %>
        </tr>
    `);
    const trContentsTemplate = _.template('<td><%= value %></td>');

    const viewList = [
      {
        rowName: '제조사',
        rowKey: 'manufacturer',
      },
      {
        rowName: '용량 (kW)',
        rowKey: 'power_amount',
      },
      {
        rowName: 'DC 전류 (A)',
        rowKey: 'pvAmp',
      },
      {
        rowName: 'DC 전압 (V)',
        rowKey: 'pvVol',
      },
      {
        rowName: 'AC 출력 (kW)',
        rowKey: 'gridKw',
      },
      {
        rowName: '수위 (cm)',
        rowKey: 'water_level',
      },
      {
        rowName: '염도 (%)',
        rowKey: 'salinity',
      },
      {
        rowName: '모듈온도 (℃)',
        rowKey: 'module_rear_temp',
      },
    ];

    const bodyDom = _.map(viewList, viewInfo => {
      const { rowKey, rowName } = viewInfo;
      const trContentsDom = _.map(measureStatusList, masureStatus => {
        return trContentsTemplate({ value: _.get(masureStatus, [rowKey], '') });
      });

      return trTemplate({
        rowName,
        contents: trContentsDom,
      });
    });

    return {
      headerDom,
      bodyDom,
    };
  },
};

/**
 * @typedef {Object} SEB_RELATION
 * @property {number} place_seq
 * @property {number} inverter_seq
 * @property {number} connector_seq
 * @property {string} connector_ch
 * @property {string} seb_name
 * @property {string} manufacturer
 * @property {number} power_amount
 * @property {number} pvAmp
 * @property {number} pvVol
 * @property {number} gridKw
 * @property {number} water_level
 * @property {number} salinity
 * @property {number} module_rear_temp
 */
