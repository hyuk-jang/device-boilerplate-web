const _ = require('lodash');
const { BU } = require('base-util-jh');

const { addComma } = require('../templates/common.util');

const defaultDom = {
  /**
   * @description makeDynamicHeaderDom
   * blockStatusTableOptions 내용을 makeDynamicHeaderDom.subTitleOptionList 에 맞는 형식으로 변경하여 반환
   * @param {blockViewMakeOption[]} blockStatusTableOptions
   */
  convertBlockStatusToSubTitleOption(blockStatusTableOptions) {
    return _.map(blockStatusTableOptions, blockInfo => {
      const { dataName, dataUnit, cssWidthPer } = blockInfo;
      return {
        title: dataName,
        dataUnit,
        cssWidthPer,
      };
    });
  },

  /**
   * DataRows와 BlcokStatusViewOptions를 활용하여 Table 생성 반환
   * @param {Object[]} dataRows
   * @param {blockViewMakeOption[]} blockViewOptions
   */
  makeDefaultTable(dataRows, blockViewOptions) {
    const tableHeaderDom = this.makeDynamicHeaderDom({
      staticTitleList: [],
      mainTitleList: _.map(blockViewOptions, 'mainTitle'),
      subTitleOptionList: this.convertBlockStatusToSubTitleOption(blockViewOptions),
    });

    const tableBodyDom = this.makeStaticBody({
      dataRows,
      bodyConfigList: blockViewOptions,
    });

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },

  /**
   *
   * @param {Object} dynamicHeaderInfo
   * @param {string[]} dynamicHeaderInfo.staticTitleList 기본으로 포함시킬 코드
   * @param {string[]=} dynamicHeaderInfo.mainTitleList 대분류 ['태양광', '태양광', '인버터', '인버터'] => 태양광, 인버터 각 2열 병합
   * @param {Object[]} dynamicHeaderInfo.subTitleOptionList
   * @param {string} dynamicHeaderInfo.subTitleOptionList.title 제목
   * @param {string=} dynamicHeaderInfo.subTitleOptionList.dataUnit 표기 단위
   * @param {string=} dynamicHeaderInfo.subTitleOptionList.cssWidthPer 테이블 구성할 경우 col width %
   */
  makeDynamicHeaderDom(dynamicHeaderInfo) {
    const {
      staticTitleList = [],
      mainTitleList = [],
      subTitleOptionList,
    } = dynamicHeaderInfo;
    let staticTitleTemplate = _.template('<th><%= title %></th>');
    let subTitleTemplate = _.template('<th><%= title %><%= dataUnit %></th>');

    // 실제적으로 사용될 MainTitle 길이
    const realMainTitle = _(mainTitleList).reject(_.isEmpty).value();

    // 대분류 제목이 없다면 일반적인 1줄 반환
    if (!realMainTitle.length) {
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
    subTitleTemplate = _.template(
      '<th rowspan=<%= rowsPan %>><%= title %><%= dataUnit %></th>',
    );

    const staticDom = staticTitleList
      .map(title => staticTitleTemplate({ title, rowsPan: 2 }))
      .join('');

    // 대분류 Header Dom 생성
    const mainTitleDom = _.chain(mainTitleList)
      .union()
      .map(title => ({
        title,
        colsPan: _(mainTitleList) // [인버터, 인버터]
          .groupBy() // [인버터: [인버터, 인버터]]
          .get(title).length, // get(인버터) -> [인버터, 인버터].length = 2
      }))
      .map(mainTitleTemplate)
      .value();

    // 중분류 Header Dom 생성
    const subTitleDom = _.map(subTitleOptionList, (titleInfo, index) => {
      // 대분류가 있으면 열병합 2, 없으면 1
      const rowsPan = _.isEmpty(mainTitleList[index]) ? 2 : 1;
      // 단위 기호가 없을 경우 공란, 있을 경우에 () 기호 추가
      titleInfo.dataUnit = _.isNil(titleInfo.dataUnit) ? '' : `(${titleInfo.dataUnit})`;
      // 기존 타이틀 정보에 열 병합 추가 후 Dom 생성
      return subTitleTemplate(_.assign(titleInfo, { rowsPan }));
    }).join('');

    return `
      <tr>
        ${_.concat(staticDom, mainTitleDom).join('')}
      </tr>
      <tr>
        ${subTitleDom}
      </tr>
  `;
  },

  /**
   * 데이터 숫자로 변환 및 배율 적용. 아닌 경우 '-' or '' 처리
   * @param {*} data
   * @param {blockViewMakeOption} bodyConfig
   */
  refineData(calcData, bodyConfig) {
    const { scale = 1, toFixed = 1, isAddComma = true } = bodyConfig;

    // 데이터 변형 목록에 있는지 확인
    if (_.isNumber(calcData)) {
      // 유한 수 일 경우
      if (Number.isFinite(calcData)) {
        calcData = _.chain(calcData)
          .multiply(scale)
          .round(toFixed)
          .thru(cValue =>
            // 천단위 기호 추가
            isAddComma ? addComma(cValue) : cValue,
          )
          .value();
      } else {
        calcData = '-';
      }
    } else if (calcData === undefined || calcData === null) {
      calcData = '';
    }
    return calcData;
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
    const calcBodyConfigList = bodyConfigList.filter(
      bodyInfo => _.isNumber(bodyInfo.scale) || _.isNumber(bodyInfo.toFixed),
    );

    // dataRows 를 순회하면서 데이터 변형을 필요로 할 경우 계산. 천단위 기호를 적용한뒤 Dom 반환
    return dataRows
      .map(dataRow => {
        bodyConfigList.forEach(bodyConfig => {
          const { dataKey } = bodyConfig;
          let calcData = _.get(dataRow, [dataKey]);
          // 데이터 변형 목록에 있는지 확인
          if (_.findIndex(calcBodyConfigList, bodyConfig) !== -1) {
            calcData = this.refineData(calcData, bodyConfig);
          }
          _.set(dataRow, [dataKey], calcData);
        });

        return bodyTemplate(dataRow);
      })
      .join('');
  },

  /**
   * dataKeyList에 해당하는 TD Html 생성하여 반환
   * @param {string[]} dataKeyList json 객체에서 가져올 key 목록
   */
  makeStaticBodyElements(dataKeyList) {
    return _.map(dataKeyList, dataKey => `<td><%= ${dataKey} %></td>`).join('');
  },

  /**
   *
   * @param {Object} blockTableInfo
   * @param {Object[]} blockTableInfo.dataRows
   * @param {blockViewMakeOption[]} blockTableInfo.blockTableOptions
   * @param {pageInfo=} pageInfo
   */
  makeDynamicBlockTable(blockTableInfo, pageInfo) {
    const tableHeaderDom = this.makeDynamicBlockTableHeader(blockTableInfo, !!pageInfo);
    const tableBodyDom = this.makeDynamicBlockTableBody(blockTableInfo, pageInfo);

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },

  /**
   *
   * @param {Object} blockTableInfo
   * @param {string[]=} blockTableInfo.baseBuiltInTitleTHs
   * @param {blockViewMakeOption[]} blockTableInfo.blockTableOptions
   * @param {boolean=} isAddNumbering 번호 추가 여부
   */
  makeDynamicBlockTableHeader(blockTableInfo, isAddNumbering = false) {
    const { baseBuiltInTitleTHs = [], blockTableOptions } = blockTableInfo;

    // 번호 추가
    isAddNumbering && baseBuiltInTitleTHs.unshift('번호');

    const headerMainDomList = [];
    const headerSubDomList = [];

    let mainTitleOverlapLength = -1;
    _.forEach(blockTableOptions, (blockInfo, index) => {
      mainTitleOverlapLength -= 1;

      const { mainTitle, dataName, dataUnit, cssWidthPer } = blockInfo;

      // Main Title을 추가해야 할 경우
      if (mainTitleOverlapLength <= 0) {
        mainTitleOverlapLength = 1;

        // 다음 index부터 확인하여 중복될 경우 중복 갯수 1 증가
        for (let i = index + 1; i < blockTableOptions.length; i += 1) {
          if (blockTableOptions[i].mainTitle === mainTitle) {
            mainTitleOverlapLength += 1;
          } else break;
        }

        // BU.CLI(mainTitleOverlapLength);
        // 부제목이 없을 경우 가로 셀 병합
        const rowspan = _.isNil(dataName) ? 2 : 1;
        const colspan = mainTitleOverlapLength;

        const headerColspan = colspan > 1 ? `colspan=<%= ${colspan} %>` : '';
        const headerRowspan = rowspan > 1 ? `rowspan=<%= ${rowspan} %>` : '';
        const headerWidthCss = _.isNumber(cssWidthPer)
          ? `style="width: ${cssWidthPer}%"`
          : '';
        const dataUnitEle = _.isString(dataUnit) ? ` (${dataUnit})` : '';

        const headerMainTemplate = _.template(
          `<th ${headerColspan} ${headerRowspan} ${headerWidthCss}><%= mainTitle %> ${
            rowspan > 1 ? dataUnitEle : ''
          }</th>`,
        );

        headerMainDomList.push(
          headerMainTemplate({
            colspan,
            rowspan,
            mainTitle,
            cssWidthPer,
          }),
        );
      }

      // dataName이 없을 경우 Sub Header를 사용하지 않고 Main Title에서 rows 셀 병합 처리를 한 것으로 간주
      if (!_.isNil(dataName)) {
        const dataUnitEle = _.isString(dataUnit) ? ` (${dataUnit})` : '';
        const headerSubTemplate = _.template(`<th><%= dataName %>${dataUnitEle}</th>`);

        headerSubDomList.push(headerSubTemplate(blockInfo));
      }
    });

    // 서브 Title이 있는 경우에는 2줄로 반환
    if (headerSubDomList.length) {
      const staticTitleTemplate = _.template('<th rowspan=2><%= title %></th>');
      const staticDom = baseBuiltInTitleTHs.map(title => staticTitleTemplate({ title }));
      return `
        <tr>${_.concat(staticDom, headerMainDomList)}</tr>
        <tr>${headerSubDomList}</tr>
      `;
    }
    // mainTitle 만 존재할 경우 1줄로 반환
    return `<tr>${headerMainDomList}</tr>`;
  },

  /**
   * Table Body Dom 생성
   * @param {Object} blockTableInfo
   * @param {Object[]} blockTableInfo.dataRows
   * @param {blockViewMakeOption[]} blockTableInfo.blockTableOptions
   * @param {pageInfo=} pageInfo 번호
   */
  makeDynamicBlockTableBody(blockTableInfo, pageInfo = {}) {
    const { blockTableOptions, dataRows } = blockTableInfo;
    // 레포트 옵션 중 넘버링을 추가할 경우
    const { page, pageListCount } = pageInfo;
    const firstRowNum = _.chain(page).subtract(1).multiply(pageListCount).value();

    const bodyTemplate = _.template(
      `<tr>
          ${_.isNumber(page) ? '<td class="text-center"><%= num %></td>' : ''}
      ${_.map(
        blockTableOptions,
        configInfo =>
          `<td ${
            _.isArray(configInfo.classList)
              ? `class='${configInfo.classList.toString()}'`
              : ''
          } ><%= ${configInfo.dataKey} %></td>`,
      ).toString()}</tr>`,
    );

    // dataRows 를 순회하면서 데이터 변형을 필요로 할 경우 계산. 천단위 기호를 적용한뒤 Dom 반환
    return dataRows
      .map((dataRow, index) => {
        // 첫번째 시작 번호가 숫자일 경우
        _.isNumber(page) && _.set(dataRow, 'num', firstRowNum + index + 1);

        blockTableOptions.forEach(bodyConfig => {
          const { dataKey } = bodyConfig;

          dataRow[dataKey] = this.refineData(dataRow[dataKey], bodyConfig);
        });

        return bodyTemplate(dataRow);
      })
      .join('');
  },

  /**
   *
   * @param {string} selectedSubCategory
   * @param {setCategoryInfo[]} setSubCategoryList
   */
  makeSubCategoryDom(selectedSubCategory, setSubCategoryList) {
    const subCategoryBtnTemplate = _.template(
      '<button type="button" value="<%= subCategory %>" class="btn <%= btnClass %> <%= btnType %>"><%= btnName %></button> ',
    );

    return _.map(setSubCategoryList, (categoryInfo, index) => {
      const { subCategory } = categoryInfo;
      const btnType = index === 0 ? 'btn1' : 'btn2';
      const btnClass =
        selectedSubCategory === subCategory ? 'btn-success' : 'btn-default';

      return subCategoryBtnTemplate(_.assign(categoryInfo, { btnType, btnClass }));
    }).join('');
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
    const calcBodyConfigList = bodyConfigList.filter(
      bodyInfo => _.isNumber(bodyInfo.scale) || _.isNumber(bodyInfo.toFixed),
    );

    bodyConfigList.forEach(bodyConfig => {
      const { dataKey } = bodyConfig;
      let calcData = _.get(dataRow, [dataKey]);
      // 데이터 변형 목록에 있는지 확인
      if (_.findIndex(calcBodyConfigList, bodyConfig) !== -1) {
        calcData = this.refineData(calcData, bodyConfig);
        // 데이터 변형 목록에 있는지 확인
      }
      _.set(dataRow, [dataKey], calcData);
      // 천단위 기호 추가 후 본 객체에 적용
    });
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
