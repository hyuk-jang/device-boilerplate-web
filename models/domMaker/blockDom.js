const _ = require('lodash');

const { BU } = require('base-util-jh');

const defaultDom = require('./defaultDom');

module.exports = {
  /**
   *
   * @param {Object[]} dataRows
   * @param {blockViewMakeOption[]} blockViewOptions
   */
  makeBlockDom(dataRows, blockViewOptions) {
    const tableHeaderDom = defaultDom.makeDynamicHeaderDom({
      staticTitleList: [],
      mainTitleList: _.map(blockViewOptions, 'mainTitle'),
      subTitleOptionList: _.map(blockViewOptions, blockInfo => {
        const { dataName, dataUnit } = blockInfo;
        return {
          title: dataName,
          dataUnit,
        };
      }),
    });

    const bodyTemplate = _.template(`
      <tr>
        ${defaultDom.makeStaticBodyElements(_.map(blockViewOptions, 'dataKey'))}
      </tr>
    `);

    const tableBodyDom = dataRows.map((dataRow, index) => {
      defaultDom.applyCalcDataRow({
        dataRow,
        bodyConfigList: blockViewOptions,
      });

      return bodyTemplate(dataRow);
    });

    return {
      tableHeaderDom,
      tableBodyDom,
    };
  },
};
