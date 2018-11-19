const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

const { BaseModel } = require('../../device-protocol-converter-jh');

// 가져올려는 Report Key로 필터링
const { BASE_KEY } = BaseModel.FarmParallel;

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
    this.pickedNodeDefIdList = [
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
    ];

    // 생육 센서 목록
    this.SENSOR_INSIDE_ND_ID_LIST = [
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
      BASE_KEY.windDirection,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
      BASE_KEY.isRain,
    ];

    // 나주를 선택할 경우
    if (siteId === 1) {
      this.pickedNodeDefIdList.unshift(BASE_KEY.pvRearTemperature);
      this.SENSOR_INSIDE_ND_ID_LIST.unshift(BASE_KEY.pvRearTemperature);
    }
  }

  static get CALC_TYPE() {
    return CALC_TYPE;
  }

  getSenRepProtocolFP() {
    const avgPickList = [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
    ];

    return avgPickList.map(key => ({
      key,
      protocol: CALC_TYPE.AVG,
    }));
  }

  getPickedNodeDefIdList() {
    return this.pickedNodeDefIdList.map(ndId => {
      let isInside;
      if (_.includes(this.SENSOR_INSIDE_ND_ID_LIST, ndId)) {
        isInside = 1;
      } else if (_.includes(this.SENSOR_OUTSIDE_ND_ID_LIST, ndId)) {
        isInside = 0;
      }

      return {
        ndId,
        isInside,
      };
    });
  }
}
module.exports = SensorProtocol;
