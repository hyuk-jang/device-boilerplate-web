const _ = require('lodash');

const { BU } = require('base-util-jh');

const defaultDom = require('./defaultDom');

module.exports = {
  /**
   *
   * @param {V_PW_PROFILE[]} inverterProfileRows
   * @param {number} inverterSeq
   * @param {string=} dataKey 직접적으로 삽입할 인버터 Key
   */
  makeInverterSiteDom(inverterProfileRows, inverterSeq, dataKey) {
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
      const inverterName =
        dataKey === undefined
          ? `${mainName} ${_.round(ivtAmount)}kW급 ${ivtName} ${
              ivtDirectorName === null ? '' : ivtDirectorName
            }`
          : row[dataKey];

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
   * @param {V_DV_PLACE[]} placeRows
   * @param {number} placeSeq
   */
  makePlaceSiteDom(placeRows, placeSeq) {
    placeSeq = BU.isNumberic(placeSeq) ? Number(placeSeq) : placeSeq;
    const placeSiteDom = _.template(`
  <option <%= selected %> data-type="place" value="<%= place_seq %>"><%= placeName %></option>
`);
    const madeDom = placeRows.map(row => {
      const {
        m_name: mainName = '',
        pd_target_name: pName = '',
        p_target_name: pTargetName = '',
      } = row;
      _.set(row, 'selected', _.eq(row.place_seq, placeSeq) ? 'selected' : '');
      const placeName = `${mainName} ${_.isString(pName) ? pName : ''} ${
        _.isString(pTargetName) ? pTargetName : ''
      }`;
      _.set(row, 'placeName', placeName);
      return placeSiteDom(row);
    });

    madeDom.unshift(
      placeSiteDom({
        selected: '',
        place_seq: 'all',
        placeName: '모두',
      }),
    );

    return madeDom;
  },

  /**
   * @desc searchOption -> Combine(병합)
   * 생육 환경 보고서 돔 생성
   * @param {nodeDefStorage[]} nodeDefStorage
   * @param {{groupDateInfo: sensorGroupDateInfo, pickedNodeDefIdList: string[]}} reportOption
   */
  makeSensorReportDomByCombine(nodeDefStorage, reportOption) {
    // 기본 페이지 값 설정
    const { groupDateInfo, pickedNodeDefIdList } = reportOption;
    const { strGroupDateList = [], page = 1, pageListCount = 20 } = groupDateInfo;
    // 보고서의 열을 가져오기 위한 첫번째 시작 번호 설정
    const firstRowNum = (page - 1) * pageListCount;

    // 동적으로 Table Header를 구성하기 위한 템플릿 초안 정의
    const headerTemplate = _.template(
      '<th style="width:7%"><%= ndName %>(<%= dataUnit %>)</th>',
    );

    const pickNdIdList = _.filter(pickedNodeDefIdList, ndId => {
      return _.chain(_.find(nodeDefStorage, { ndId })).get('ndName', '').value();
    });

    // Picked목록에 따라 동적 Header 생성
    const dynamicHeaderDom = _.chain(pickNdIdList)
      .map(ndId =>
        _.find(nodeDefStorage, {
          ndId,
        }),
      )
      .map(dom => headerTemplate(dom))
      .join('')
      .value();

    // 만들어진 동적 Table Header Dom
    const sensorReportHeaderDom = `
      <tr>
      <th style="width:5%">번호</th>
      <th style="width:9%">일시</th>
      ${dynamicHeaderDom}
      </tr>
    `;

    // Picked 목록에 따라 동적으로 만들 Table Tr TD 템플릿 초안 정의
    const dynamicTemplate = pickNdIdList.map(key => `<td><%= ${key} %></td>`).join('');
    // 기본으로 생성할 TR 열 틀에 해당 동적 템플릿을 삽입
    const sensorReportTemplate = _.template(`
        <tr>
        <td class="text-center"><%= num %></td>
        <td class="text-center"><%= group_date %></td>
        ${dynamicTemplate}
      </tr>
    `);

    // BU.CLI(sensorReportTemplate);
    // 선택한 페이지에 따라 생성할 Dom을 생성하기 위해 기존 ViewStrDateList를 자름
    const sensorReportBodyDom = strGroupDateList
      .map((row, index) => {
        // 실제 데이터를 가져올 Row Index 설정
        const rowNum = _.sum([firstRowNum, index, 1]);
        const sensorData = {
          num: rowNum, // 사용자에게 보여질 번호는 + 1
          group_date: row, // row당 보여질 일시
        };
        // ND_TARGET_ID에 따라 그루핑된 레포트 저장소를 순회하면서 해당 ndId를 Key로 한 데이터 확장
        _.forEach(nodeDefStorage, reportStorage => {
          _.assign(sensorData, {
            [reportStorage.ndId]: reportStorage.mergedAvgList[index],
          });
        });

        BU.toLocaleString(sensorData);

        // 확장한 sensorData를 템플릿에 반영
        return sensorReportTemplate(sensorData);
      })
      .join('');

    return {
      sensorReportHeaderDom,
      sensorReportBodyDom,
    };
  },

  /**
   *
   * @param {{ndId: string, ndName: string, dataUnit: string, realData: number[]}[]} reportStoragesByNdName
   * @param {{groupDateInfo: sensorGroupDateInfo, pickedNodeDefIdList: string[]}} reportOption
   */
  makeSensorReportDomByIndividual(reportStoragesByNdName, reportOption, paginationInfo) {
    // const firstRowNum = (paginationInfo.page - 1) * paginationInfo.pageListCount;

    const { pickedSensorKeys = [], viewStrDateList = [], searchRangeInfo } = reportOption;

    const headerTemplate = _.template(
      '<th style="width:7%"><%= ndName %><%= dataUnit %></th>',
    );

    const dynamicHeaderDom = pickedSensorKeys.map(key => {
      const { ndName = '', dataUnit = '' } = _.find(reportStoragesByNdName, {
        ndId: key,
      });
      return headerTemplate({
        ndName,
        dataUnit: dataUnit.length ? `(${dataUnit})` : '',
      });
    });

    const sensorReportHeaderDom = `
    <tr>
    <th class="text-center">
    <th>일시</th>
    <th>장소</th>
    ${dynamicHeaderDom}
    </tr>
    `;

    const dynamicTemplate = pickedSensorKeys.map(key => `<td><%= ${key} %></td>`);

    const sensorReportTemplate = _.template(`
        <tr>
        <td class="text-center"><%= num %></td>
        <td class="text-center" ><%= group_date %></td>
        <td><%= placeName %></td>
        ${dynamicTemplate.toString()}
      </tr>
    `);

    // BU.CLI(sensorReportTemplate);

    const sensorReportsDom = viewStrDateList.map((row, index) => {
      const sensorData = {
        num: index,
        group_date: row,
      };
      _.forEach(reportStoragesByNdName, reportStorage => {
        _.assign(sensorData, { [reportStorage.ndId]: reportStorage.realData[index] });
      });

      return sensorReportTemplate(sensorData);
    });

    return {
      sensorReportHeaderDom,
      sensorReportsDom,
    };
  },
  /**
   *
   * @param {PW_INVERTER_DATA[]} inverterReportRows
   * @param {Object} reportOption
   * @param {blockViewMakeOption[]} reportOption.blockViewList
   * @param {number} reportOption.page
   * @param {number} reportOption.pageListCount
   */
  makeInverterReportDom(inverterReportRows, reportOption) {
    const { blockViewList, page, pageListCount } = reportOption;

    const firstRowNum = (page - 1) * pageListCount;

    const tableHeaderDom = defaultDom.makeDynamicHeaderDom({
      staticTitleList: ['번호', '일시'],
      mainTitleList: _.map(blockViewList, 'mainTitle'),
      subTitleOptionList: _.map(blockViewList, blockInfo => {
        const { dataName, dataUnit } = blockInfo;
        return {
          title: dataName,
          dataUnit,
        };
      }),
    });

    const bodyTemplate = _.template(`
      <tr>
        <td class="text-center"><%= num %></td>
        <td class="text-center"><%= group_date %></td>
        ${defaultDom.makeStaticBodyElements(_.map(blockViewList, 'dataKey'))}
      </tr>
    `);

    const tableBodyDom = inverterReportRows
      .map((dataRow, index) => {
        defaultDom.applyCalcDataRow({
          dataRow,
          bodyConfigList: blockViewList,
        });

        const pvKw = _.get(dataRow, 'avg_pv_kw', '');
        const powerKw = _.get(dataRow, 'avg_power_kw', '');

        // 번호
        _.set(dataRow, 'num', firstRowNum + index + 1);
        // 발전 효율 (계산하여 재정의 함)
        const avgPF = _.divide(powerKw, pvKw);
        _.set(
          dataRow,
          'avg_p_f',
          Number.isNaN(avgPF) || avgPF === Infinity ? '-' : _.round(avgPF * 100, 1),
        );

        // BU.toLocaleString(dataRow);

        return bodyTemplate(dataRow);
      })
      .join('');

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },

  /**
   * @deprecated
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
