const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

const { BaseModel } = require('../../device-protocol-converter-jh');

// 가져올려는 Report Key로 필터링
const { BASE_KEY } = BaseModel.FarmParallel;
const EAN_BASE_KEY = BaseModel.Sensor.BASE_KEY;

const CALC_TYPE = {
  // 평균 값
  AVG: 'AVG',
  // 시간 당 데이터로 환산 (searchRange 필요)
  AMOUNT: 'AMOUNT',
  // 두 날짜 간격 사이의 데이터 중 큰 값의 차
  INTERVAL_MAX: 'INTERVAL_MAX',
};

class SensorProtocol {
  constructor(siteId) {
    this.BASE_KEY = BASE_KEY;
    this.EAN_BASE_KEY = EAN_BASE_KEY;

    this.pickedNodeDefIdList = [
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

    // 생육 센서 목록
    this.SENSOR_INSIDE_ND_ID_LIST = [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
    ];

    // 외기 센서 목록
    this.SENSOR_OUTSIDE_ND_ID_LIST = [
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      // BASE_KEY.windDirection,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
      BASE_KEY.isRain,
    ];

    // 나주를 선택할 경우
    // if (siteId === 1) {
    //   this.pickedNodeDefIdList.unshift(BASE_KEY.pvRearTemperature);
    //   this.SENSOR_INSIDE_ND_ID_LIST.unshift(BASE_KEY.pvRearTemperature);
    // }
  }

  static get CALC_TYPE() {
    return CALC_TYPE;
  }

  get mainViewList() {
    return [
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.inclinedSolar,
    ];
  }

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
      protocol: CALC_TYPE.AVG,
    }));
  }

  get trendViewList() {
    return [
      {
        domId: 'solarChart',
        title: '일사량 정보',
        subtitle: '경사 일사량, 수평 일사량, 모듈 하부 일사량',
        chartOptionList: [
          {
            keys: [BASE_KEY.inclinedSolar, BASE_KEY.horizontalSolar, BASE_KEY.pvUnderlyingSolar],
            mixColors: [null, '#d9480f', '#d9480f'],
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

  /** 이안용 */
  get mainEanViewList() {
    return [
      EAN_BASE_KEY.pvRearTemperature,
      EAN_BASE_KEY.waterTemperature,
      EAN_BASE_KEY.outsideAirTemperature,
      EAN_BASE_KEY.pvW,
      EAN_BASE_KEY.powerCpKwh,
    ];
  }

  get pickedNodeDefIdListEan() {
    return [
      EAN_BASE_KEY.pvAmp,
      EAN_BASE_KEY.pvVol,
      EAN_BASE_KEY.pvW,
      EAN_BASE_KEY.powerCpKwh,
      EAN_BASE_KEY.pvRearTemperature,
      EAN_BASE_KEY.waterTemperature,
      EAN_BASE_KEY.outsideAirTemperature,
    ];
  }

  get senorReportProtocolEan() {
    const avgPickList = [
      EAN_BASE_KEY.pvAmp,
      EAN_BASE_KEY.pvVol,
      EAN_BASE_KEY.pvW,
      EAN_BASE_KEY.powerCpKwh,
      EAN_BASE_KEY.pvRearTemperature,
      EAN_BASE_KEY.waterTemperature,
      EAN_BASE_KEY.outsideAirTemperature,
    ];

    return avgPickList.map(key => ({
      key,
      protocol: CALC_TYPE.AVG,
    }));
  }

  get trendEanViewList() {
    return [
      {
        domId: 'temperature',
        title: '온도 정보',
        subtitle: '모듈 후면 온도, 수중 온도, 외기 온도',
        chartOptionList: [
          {
            keys: [
              EAN_BASE_KEY.pvRearTemperature,
              EAN_BASE_KEY.waterTemperature,
              EAN_BASE_KEY.outsideAirTemperature,
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
            keys: [EAN_BASE_KEY.pvVol],
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
            keys: [EAN_BASE_KEY.pvAmp],
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
            keys: [EAN_BASE_KEY.pvW],
            mixColors: [null, '#d9480f'],
            yTitle: '출력',
            dataUnit: ' W',
          },
        ],
      },
    ];
  }
}
module.exports = SensorProtocol;
