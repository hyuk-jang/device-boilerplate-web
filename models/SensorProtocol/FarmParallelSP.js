const { BaseModel } = require('../../../device-protocol-converter-jh');

const { BASE_KEY } = BaseModel.FarmParallel;

const SensorProtocol = require('./SensorProtocol');

class FarmParallelSP extends SensorProtocol {
  /**
   * @return {string[]} 현 프로젝트에서 사용할 Sensor 목록, ND Id List
   */
  get pickedNodeDefIdList() {
    return [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
    ];
  }

  /**
   * @return {string[]} 내부 센서 ND ID 목록
   */
  get sInsideNdIdList() {
    return [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
    ];
  }

  /**
   * @return {string[]} 외기 센서 ND ID 목록
   */
  get sOutsideNdIdList() {
    return [
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      // BASE_KEY.windDirection,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
      BASE_KEY.isRain,
    ];
  }

  /**
   * Main 화면에 나타낼 데이터 목록
   * @return {string[]} Node Def Id List
   */
  get mainViewList() {
    return [
      BASE_KEY.inclinedSolar,
      BASE_KEY.lux,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.co2,
    ];
  }

  /**
   * 레포트 - 센서 페이지에서 나타낼 목록
   * @return {{key: string, protocol: string}[]} key: ND ID, protocol: CALC_TYPE
   */
  get senorReportProtocol() {
    const avgPickList = [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
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
        domId: 'solarChart',
        title: '일사량 정보',
        subtitle: '경사 일사량, 수평 일사량, 모듈 하부 일사량',
        chartOptionList: [
          {
            keys: [BASE_KEY.inclinedSolar, BASE_KEY.horizontalSolar, BASE_KEY.pvUnderlyingSolar],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '일사량',
            dataUnit: ' W/m²',
          },
        ],
      },
      {
        domId: 'luxChart',
        title: '조도 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.lux],
            mixColors: [null, '#d9480f'],
            yTitle: '조도',
            dataUnit: ' lx',
          },
        ],
      },
      {
        domId: 'waterValueChart',
        title: '양액 농도 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.soilWaterValue],
            mixColors: [null, '#d9480f'],
            yTitle: '양액 농도',
            dataUnit: ' %',
          },
        ],
      },
      {
        domId: 'temperatureChart',
        title: '온도 정보',
        subtitle: '토양 온도, 외기 온도',
        chartOptionList: [
          {
            keys: [BASE_KEY.soilTemperature, BASE_KEY.outsideAirTemperature],
            mixColors: [null, '#5c940d'],
            yTitle: '온도',
            dataUnit: ' ℃',
          },
        ],
      },
      {
        domId: 'rehChart',
        title: '습도 정보',
        subtitle: '토양 습도, 외기 습도',
        chartOptionList: [
          {
            keys: [BASE_KEY.soilReh, BASE_KEY.outsideAirReh],
            mixColors: [null, '#d9480f'],
            yTitle: '습도',
            dataUnit: ' %',
          },
        ],
      },
      {
        domId: 'windSpeedChart',
        title: '풍속 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.windSpeed],
            mixColors: [],
            yTitle: '풍속',
            dataUnit: ' m/s',
          },
        ],
      },
      {
        domId: 'co2Chart',
        title: '이산화탄소 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.co2],
            mixColors: [],
            yTitle: 'co2',
            dataUnit: ' ppm',
          },
        ],
      },
      {
        domId: 'r1Chart',
        title: '시간당 강우량 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.r1],
            mixColors: [],
            yTitle: '강우량',
            dataUnit: ' mm/h',
          },
        ],
      },
      {
        domId: 'isRainChart',
        title: '강우 감지 여부 정보',
        chartOptionList: [
          {
            keys: [BASE_KEY.isRain],
            mixColors: [],
            yTitle: '강우 감지 여부',
            // dataUnit: 'ㅇd',
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
    return [BASE_KEY.inclinedSolar];
  }
}

module.exports = FarmParallelSP;
