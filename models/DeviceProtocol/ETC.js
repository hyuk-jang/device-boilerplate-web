const { BaseModel } = require('../../src/module').dpc;

const {
  ETC: { BASE_KEY },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

module.exports = class extends DeviceProtocol {
  /**
   * 트렌드 생성 정보
   * @return {trendSensorDomConfig[]}
   */
  get trendSensorViewList() {
    return [
      {
        domId: 'battery',
        title: '배터리',
        subtitle: '',
        chartOptionList: [
          {
            keys: [BASE_KEY.percentBattery],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '배터리 용량',
            dataUnit: ' %',
          },
        ],
      },
    ];
  }
};
