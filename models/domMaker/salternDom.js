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

      const { pvKw = '', gridKw = '', gridPf } = dataRow;

      // 발전 효율
      if (!_.isNumber(gridPf)) {
        dataRow.gridPf = _.round(_.divide(gridKw, pvKw) * 100, 1);
      }
      if (!Number.isFinite(dataRow.gridPf)) {
        dataRow.gridPf = '-';
      }
      // 번호
      // _.set(dataRow, 'num', index + 1);
      // 발전 효율 (계산하여 재정의 함)

      // 계산식 반영 및 천단위 기호 추가
      defaultDom.applyCalcDataRow({
        dataRow,
        bodyConfigList: blockViewList,
      });

      return bodyTemplate(dataRow);
    });

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },

  /**
   * 센서 현재 정보값 생성 돔. 좌측 사이드 영역을 생성할 때 사용
   * @param {SEB_RELATION[]} analysisStatusList
   * @param {blockViewMakeOption[]} blockViewList
   */
  makeAnalysisStatusDom(analysisStatusList, blockViewList) {
    const tableHeaderDom = defaultDom.makeDynamicBlockTableHeader({
      blockTableOptions: blockViewList,
    });

    const placeRegeditList = [];

    const tableBodyDom = analysisStatusList
      .sort((pRow, nRow) => pRow.chart_sort_rank - nRow.chart_sort_rank)
      .map((dataRow, index) => {
        let contentsTemplate = '';

        // 최초 인버터 인지 확인
        const isMergePlace = _.includes(placeRegeditList, dataRow.install_place);
        // 인버터를 찾지 못하였다면 병합 대상
        if (isMergePlace === false) {
          // 병합 처리한 걸로 등록
          placeRegeditList.push(dataRow.install_place);

          // 인버터가 포함하는 모듈은 몇개인지 확인
          const placeMergeLength = _.filter(analysisStatusList, {
            install_place: dataRow.install_place,
          }).length;

          // 인버터가 mainTitle에 걸릴경우 병합 처리.
          contentsTemplate = _.chain(blockViewList)
            .map(blockInfo => {
              const { dataKey } = blockInfo;
              switch (dataKey) {
                case 'install_place':
                  return `<td rowspan=${placeMergeLength}><%= ${dataKey} %></td>`;
                case 'avg_temp':
                  return index === 0
                    ? `<td rowspan=${analysisStatusList.length}><%= ${dataKey} %></td>`
                    : '';
                default:
                  return `<td><%= ${dataKey} %></td>`;
              }
            })
            .value()
            .toString();
        } else {
          contentsTemplate = _.chain(blockViewList)
            .map(blockInfo => {
              const { dataKey } = blockInfo;
              switch (dataKey) {
                case 'install_place':
                case 'avg_temp':
                  return '';
                default:
                  return `<td><%= ${dataKey} %></td>`;
              }
            })
            .value()
            .toString();
        }
        // 온전한 바디 템플릿 돔 생성
        const bodyTemplate = _.template(`<tr>${contentsTemplate}</tr>`);

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
