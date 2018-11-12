const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

const { BaseModel } = require('../../device-protocol-converter-jh');

// 가져올려는 Report Key로 필터링
const { BASE_KEY } = BaseModel.FarmParallel;

class SensorProtocol {
  constructor(siteId) {
    this.pickedNodeDefIds = [
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
    this.INSIDE_LIST = [
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
    ];

    // 외기 센서 목록
    this.OUTSIDE_LIST = [
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
      this.pickedNodeDefIds.unshift(BASE_KEY.pvRearTemperature);
      this.INSIDE_LIST.unshift(BASE_KEY.pvRearTemperature);
    }
  }

  getPickedNodeDefIdList() {
    return this.pickedNodeDefIds.map(ndId => {
      let isInside;
      if (_.includes(this.INSIDE_LIST, ndId)) {
        isInside = 1;
      } else if (_.includes(this.OUTSIDE_LIST, ndId)) {
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
