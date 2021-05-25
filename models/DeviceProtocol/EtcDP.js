const { BaseModel } = require('../../src/module').dpc;

const {
  NI: { BASE_KEY: BASE_NI_KEY },
  Sensor: { BASE_KEY: BASE_S_KEY },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

module.exports = class extends DeviceProtocol {
  constructor() {
    super();

    this.BASE_NI_KEY = BASE_NI_KEY;
    this.BASE_S_KEY = BASE_S_KEY;
  }

  /**
   * 트렌드 생성 정보
   * @return {trendSensorDomConfig[]}
   */
  get trendSensorViewList() {
    return [
      {
        domId: 'frequencyChart',
        title: '주파수',
        subtitle: '',
        chartOptionList: [
          {
            keys: [this.BASE_S_KEY.frequency],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '주파수',
            dataUnit: ' Hz',
          },
          {
            keys: [this.BASE_NI_KEY.temp],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '구동부 온도',
            dataUnit: ' ℃',
          },
        ],
      },
      {
        domId: 'aaaChart',
        title: '압력',
        subtitle: '',
        chartOptionList: [
          {
            keys: [this.BASE_NI_KEY.pressure],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '압력',
            dataUnit: ' bar',
          },
        ],
      },
      {
        domId: 'bbbChart',
        title: '수위',
        subtitle: '',
        chartOptionList: [
          {
            keys: [this.BASE_NI_KEY.waterLevel],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '수위',
            dataUnit: ' m',
          },
        ],
      },
    ];
  }
};
