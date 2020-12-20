const { BaseModel } = require('../../src/module').dpc;

const {
  STP: { BASE_KEY: BK },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

module.exports = class extends DeviceProtocol {
  constructor() {
    super();

    this.BASE_KEY = BK;
  }

  /**
   * 트렌드 생성 정보
   * @return {trendSensorDomConfig[]}
   */
  get trendSensorViewList() {
    return [
      {
        domId: 'ampChart',
        title: '전류',
        subtitle: '',
        chartOptionList: [
          {
            keys: [BK.ampOp],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '전류',
            dataUnit: 'A',
          },
        ],
      },
      {
        domId: 'fdValveChart',
        title: '밸브 피드백',
        subtitle: '오일탱크, PTC, 증기발생기',
        chartOptionList: [
          {
            keys: [BK.fdValveOt, BK.fdValvePtc, BK.fdValveSg],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '개폐 백분율',
            dataUnit: '%',
          },
        ],
      },
      {
        domId: 'frCumChart',
        title: '유량',
        subtitle: '순시유량, 누계유량',
        chartOptionList: [
          {
            keys: [BK.frInsSg, BK.frInsPipe],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '유량',
            dataUnit: '㎥/m',
          },
          {
            keys: [BK.frCumSg, BK.frCumPipe],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '유량',
            dataUnit: '㎥/h',
          },
        ],
      },
      {
        domId: 'frequencyChart',
        title: '주파수',
        subtitle: '',
        chartOptionList: [
          {
            keys: [BK.frequencyPipe],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '주파수',
            dataUnit: '㎏/㎝',
          },
        ],
      },
      {
        domId: 'pressureChart',
        title: '압력',
        subtitle: '',
        chartOptionList: [
          {
            keys: [BK.pressureGaugePipe, BK.pressureGaugeSg],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '압력',
            dataUnit: 'bar',
          },
        ],
      },
      {
        domId: 'envChart',
        title: '조도, 일사량',
        subtitle: '',
        chartOptionList: [
          {
            keys: [BK.irradianceEnv],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '조도',
            dataUnit: 'KLUX',
          },
          {
            keys: [BK.solarEnv],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '일사량',
            dataUnit: 'W/m²',
          },
        ],
      },
    ];
  }
};
