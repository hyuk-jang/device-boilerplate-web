const { BaseModel } = require('../../../device-protocol-converter-jh');

const { BASE_KEY } = BaseModel.Sensor;

const SensorProtocol = require('./SensorProtocol');

class EanTB1 extends SensorProtocol {
  /**
   * @return {string[]} 현 프로젝트에서 사용할 Sensor 목록, ND Id List
   */
  get pickedNodeDefIdList() {
    return [
      BASE_KEY.pvAmp,
      BASE_KEY.pvVol,
      BASE_KEY.pvW,
      BASE_KEY.powerCpKwh,
      BASE_KEY.pvRearTemperature,
      BASE_KEY.waterTemperature,
      BASE_KEY.outsideAirTemperature,
    ];
  }

  /**
   * @return {string[]} 내부 센서 ND ID 목록
   */
  get sInsideNdIdList() {
    return [
      // BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.horizontalSolar,
      BASE_KEY.lux,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.windSpeed,
      BASE_KEY.windDirection,
    ];
  }

  /**
   * @return {string[]} 외기 센서 ND ID 목록
   */
  get sOutsideNdIdList() {
    return [];
  }

  /**
   * Main 화면에 나타낼 데이터 목록
   * @return {string[]} Node Def Id List
   */
  get mainViewList() {
    return [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.waterTemperature,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.pvW,
      BASE_KEY.powerCpKwh,
    ];
  }

  /**
   * 레포트 - 센서 페이지에서 나타낼 목록
   * @return {{key: string, protocol: string}[]} key: ND ID, protocol: CALC_TYPE
   */
  get senorReportProtocol() {
    const avgPickList = [
      BASE_KEY.pvAmp,
      BASE_KEY.pvVol,
      BASE_KEY.pvW,
      BASE_KEY.powerCpKwh,
      BASE_KEY.pvRearTemperature,
      BASE_KEY.waterTemperature,
      BASE_KEY.outsideAirTemperature,
    ];

    return avgPickList.map(key => ({
      key,
      protocol: this.CALC_TYPE.AVG,
    }));
  }

  /**
   * 트렌드 생성 정보
   * @return {trendDomConfig[]}
   */
  get trendViewList() {
    return [
      {
        domId: 'temperature',
        title: '온도 정보',
        subtitle: '모듈 후면 온도, 수중 온도, 외기 온도',
        chartOptionList: [
          {
            keys: [
              BASE_KEY.pvRearTemperature,
              BASE_KEY.waterTemperature,
              BASE_KEY.outsideAirTemperature,
            ],
            mixColors: [null, '#5c940d'],
            yTitle: '온도',
            dataUnit: ' ℃',
          },
        ],
      },
      {
        domId: 'pvVol',
        title: '전압',
        chartOptionList: [
          {
            keys: [BASE_KEY.pvVol],
            mixColors: [null, '#d9480f', '#d9480f'],
            yTitle: '전압',
            dataUnit: ' V',
          },
        ],
      },
      {
        domId: 'pvAmp',
        title: '전류',
        chartOptionList: [
          {
            keys: [BASE_KEY.pvAmp],
            mixColors: [null, '#d9480f'],
            yTitle: '전류',
            dataUnit: ' A',
          },
        ],
      },
      {
        domId: 'pvW',
        title: '출력',
        chartOptionList: [
          {
            keys: [BASE_KEY.pvW],
            mixColors: [null, '#d9480f'],
            yTitle: '출력',
            dataUnit: ' W',
          },
        ],
      },
    ];
  }

  /**
   * @desc App
   * @return {string[]} 앱 Master로 쓸 센서  ND ID 목록
   */
  get appMasterViewList() {
    return [BASE_KEY.horizontalSolar];
  }
}

module.exports = EanTB1;
