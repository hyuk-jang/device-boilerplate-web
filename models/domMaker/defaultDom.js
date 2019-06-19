const _ = require('lodash');
const { BU } = require('base-util-jh');

const defaultDom = {
  /**
   *
   * @param {Object} dynamicHeaderInfo
   * @param {string[]} dynamicHeaderInfo.staticTitleList 기본으로 포함시킬 코드
   * @param {string[]=} dynamicHeaderInfo.mainTitleList 대분류 ['태양광', '태양광', '인버터', '인버터'] => 태양광, 인버터 각 2열 병합
   * @param {Object[]} dynamicHeaderInfo.subTitleOptionList
   * @param {string} dynamicHeaderInfo.subTitleOptionList.title 제목
   * @param {string=} dynamicHeaderInfo.subTitleOptionList.dataUnit 표기 단위
   */
  makeDynamicHeaderDom(dynamicHeaderInfo) {
    const { staticTitleList, mainTitleList = [], subTitleOptionList } = dynamicHeaderInfo;
    let staticTitleTemplate = _.template('<th><%= title %></th>');
    let subTitleTemplate = _.template('<th><%= title %><%= dataUnit %></th>');

    // 대분류 제목이 없다면 일반적인 1줄 반환
    if (!mainTitleList.length) {
      const staticDom = staticTitleList.map(title => staticTitleTemplate({ title }));
      // 중분류 Header Dom 생성
      const subTitleDom = _.map(subTitleOptionList, titleInfo => {
        // 단위 기호가 없을 경우 공란, 있을 경우에 () 기호 추가
        titleInfo.dataUnit = _.isNil(titleInfo.dataUnit) ? '' : `(${titleInfo.dataUnit})`;
        // 기존 타이틀 정보에 열 병합 추가 후 Dom 생성
        return subTitleTemplate(titleInfo);
      });

      return `
        <tr>
        ${_.concat(staticDom, subTitleDom)}
        </tr>
      `;
    }
    const mainTitleTemplate = _.template('<th colspan=<%= colsPan %>><%= title %></th>');
    staticTitleTemplate = _.template('<th rowsPan=<%= rowsPan %>><%= title %></th>');
    subTitleTemplate = _.template('<th rowspan=<%= rowsPan %>><%= title %><%= dataUnit %></th>');

    const staticDom = staticTitleList.map(title => staticTitleTemplate({ title, rowsPan: 2 }));

    // BU.CLI(mainTitleList);
    // BU.CLI(subTitleOptionList);

    // 대분류 Header Dom 생성
    const mainTitleDom = _.chain(mainTitleList)
      .union()
      .map(title => {
        return {
          title,
          colsPan: _(mainTitleList) // [인버터, 인버터]
            .groupBy() // [인버터: [인버터, 인버터]]
            .get(title).length, // get(인버터) -> [인버터, 인버터].length = 2
        };
      })
      .map(domInfo => mainTitleTemplate(domInfo))
      .value();

    // 중분류 Header Dom 생성
    const subTitleDom = _.map(subTitleOptionList, (titleInfo, index) => {
      // 대분류가 있으면 열병합 2, 없으면 1
      const rowsPan = _.isEmpty(mainTitleList[index]) ? 2 : 1;
      // 단위 기호가 없을 경우 공란, 있을 경우에 () 기호 추가
      titleInfo.dataUnit = _.isNil(titleInfo.dataUnit) ? '' : `(${titleInfo.dataUnit})`;
      // 기존 타이틀 정보에 열 병합 추가 후 Dom 생성
      return subTitleTemplate(_.assign(titleInfo, { rowsPan }));
    });

    return `
      <tr>
        ${_.concat(staticDom, mainTitleDom)}
      </tr>
      <tr>
        ${subTitleDom}
      </tr>
  `;
  },

  /**
   *
   * @param {string[]} dataKeyList json 객체에서 가져올 key 목록
   */
  makeStaticBodyElements(dataKeyList) {
    return _.map(dataKeyList, dataKey => `<td><%= ${dataKey} %></td>`).toString();
  },

  /**
   *
   * @param {Object} staticInfo
   * @param {Object[]} staticInfo.dataRows DB Data Rows
   * @param {Object[]} staticInfo.bodyConfigList json 객체에서 가져올 key 목록
   * @param {string} staticInfo.bodyConfigList.dataKey json 객체에서 가져올 key 목록
   * @param {number=} staticInfo.bodyConfigList.scale 배율
   * @param {number=} staticInfo.bodyConfigList.toFixed 소수점 자리수
   */
  makeStaticBody(staticInfo) {
    const { dataRows, bodyConfigList } = staticInfo;
    const bodyTemplate = _.template(
      `<tr>${_.map(
        bodyConfigList,
        configInfo => `<td><%= ${configInfo.dataKey} %></td>`,
      ).toString()}</tr>`,
    );

    // 데이터 변형을 사용할 목록 필터링
    const calcBodyConfigList = bodyConfigList.filter(bodyInfo => {
      return _.isNumber(bodyInfo.scale) || _.isNumber(bodyInfo.toFixed);
    });

    // dataRows 를 순회하면서 데이터 변형을 필요로 할 경우 계산. 천단위 기호를 적용한뒤 Dom 반환
    return dataRows.map(dataRow => {
      bodyConfigList.forEach(bodyConfig => {
        const { dataKey, scale = 1, toFixed = 1 } = bodyConfig;
        let calcData = _.get(dataRow, [dataKey]);
        // 데이터 변형 목록에 있는지 확인
        if (_.findIndex(calcBodyConfigList, bodyConfig) !== -1) {
          calcData = scale !== 1 ? _.multiply(calcData, scale) : calcData;
          calcData = _.isNumber(toFixed) ? _.round(calcData, toFixed) : calcData;
        }
        // 천단위 기호 추가 후 본 객체에 적용
        _.set(dataRow, [dataKey], this.addComma(calcData));
      });

      return bodyTemplate(dataRow);
    });
  },

  /**
   * 원 데이터에 계산하고자하는 값들에 배율을 반영하고 천단위 기호 추가
   * @param {Object} calcDataRowInfo
   * @param {Object} calcDataRowInfo.dataRow
   * @param {Object[]} calcDataRowInfo.bodyConfigList json 객체에서 가져올 key 목록
   * @param {string} calcDataRowInfo.bodyConfigList.dataKey json 객체에서 가져올 key 목록
   * @param {number=} calcDataRowInfo.bodyConfigList.scale 배율
   * @param {number=} calcDataRowInfo.bodyConfigList.toFixed 소수점 자리수
   */
  applyCalcDataRow(calcDataRowInfo) {
    const { bodyConfigList, dataRow } = calcDataRowInfo;

    // 데이터 변형을 사용할 목록 필터링
    const calcBodyConfigList = bodyConfigList.filter(bodyInfo => {
      return _.isNumber(bodyInfo.scale) || _.isNumber(bodyInfo.toFixed);
    });

    bodyConfigList.forEach(bodyConfig => {
      const { dataKey, scale = 1, toFixed = 1 } = bodyConfig;
      let calcData = _.get(dataRow, [dataKey]);
      // 데이터 변형 목록에 있는지 확인
      if (_.findIndex(calcBodyConfigList, bodyConfig) !== -1) {
        calcData = scale !== 1 ? _.multiply(calcData, scale) : calcData;
        calcData = _.isNumber(toFixed) ? _.round(calcData, toFixed) : calcData;
      }
      // 천단위 기호 추가 후 본 객체에 적용
      _.set(dataRow, [dataKey], this.addComma(calcData));
    });
  },

  /**
   * 천단위 기호 추가 함수
   * @param {number} num 수
   */
  addComma(num) {
    try {
      const regexp = /\B(?=(\d{3})+(?!\d))/g;
      return num.toString().replace(regexp, ',');
    } catch (error) {
      return '';
    }
  },
};

module.exports = defaultDom;

// if __main process
if (require !== undefined && require.main === module) {
  const staticBodyConfig = {
    bodyConfigList: [
      {
        dataKey: 'one',
        scale: 0.1,
      },
      {
        dataKey: 'two',
        toFixed: 2,
      },
      {
        dataKey: 'three',
        scale: 10,
        toFixed: 1,
      },
    ],
    dataRows: [
      {
        one: 100.11,
        two: 200.22,
        three: 300.33,
      },
      {
        one: 1000.111,
        two: 2000.222,
        three: 3000.333,
      },
    ],
  };

  const bodyElements = defaultDom.makeStaticBodyElements(
    _.map(staticBodyConfig.bodyConfigList, 'dataKey'),
  );

  console.log(bodyElements);
}
