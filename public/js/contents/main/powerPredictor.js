const _ = require('lodash');
const { BU } = require('base-util-jh');

class SolarPowerCalc {
  constructor(latitude, moduleCapacity, moduleWide, sky, ws, temp) {
    // 발전량 예측에 필요한 필요 정보 수집
    const testInfo = this.collectInfo(latitude, moduleCapacity, moduleWide, sky, ws, temp);

    // 발전량 예측에 필요한 요소 계산
    const solarDeclination = this.calcSolarDeclination(testInfo.date); // 태양적위
    const maxSunshineHours = this.calcMaxSunshineHours(testInfo.latitude, solarDeclination); // 가조시간
    const minSunshineHours = this.calcMinSunshineHours(maxSunshineHours, testInfo.sky); // 일조시간
    // 일사량
    const solarRadiation = this.calcSolarRadiation(
      maxSunshineHours,
      minSunshineHours,
      testInfo.latitude,
      solarDeclination,
    );
    // 발전량
    const solarPower = this.calcSolarPower(solarRadiation, testInfo.moduleCapacity);
    // 증발량 계산
    const waterEvaporation = this.calcWaterEvaporation(
      testInfo.moduleWide,
      maxSunshineHours,
      testInfo.ws,
    );
    // 기온, 수위에 대한 발전 효율 계산 FIXME:
    const waterLevel = [0, 3, 5, 7];
    const solarPowerEfficiencys = this.calcSolarPowerEfficiency(
      waterLevel,
      testInfo.temp,
      waterEvaporation,
      testInfo.moduleWide,
    );

    // 발전량 예측 결과 FIXME:
    _.forEach(solarPowerEfficiencys, value => {
      testInfo.solarPower.push(_.multiply(value, solarPower));
    });
    // testInfo.solarPower = _.multiply(solarPower, solarPowerEfficiencys);

    BU.CLI('다음날 발전 예측 정보 ', testInfo);
  }

  // FIXME: 이름 생각
  // TODO: 발전 예측에 필요한 정보 객체 생성
  collectInfo(latitude, moduleCapacity, moduleWide, sky, ws, temp) {
    // TODO: 지역에 따른 위도 추출
    // TODO: 운량 값 변환 (1,2,3,4) -> (0,4,7,10)
    switch (sky) {
      case 1:
        sky = 0;
        break;
      case 2:
        sky = 4;
        break;
      case 3:
        sky = 7;
        break;
      case 4:
        sky = 10;
        break;
      default:
    }
    const test = {
      date: new Date().addDays(1),
      latitude,
      moduleCapacity,
      moduleWide,
      sky,
      ws,
      temp,
      solarPower: [],
    };
    // const test = {
    //   date: new Date().addDays(1),
    //   weatherInfo:{
    //       sky: 4,
    //       ws: 1,
    //   }
    //   astronomyInfo:{
    //       latitude: 35.053004,

    //   }
    //   solarModuleInfo:{
    //       moduleCapacity: 6000,
    //       moduleWide: 38,
    //       waterLevel,
    //   }
    //   temp: 20,
    //   solarPower: 0,
    // };

    return test;
  }

  /**
   * 태양 적위 계산 -> 23.5*xsin((월-3)*30 + (일-21))
   * @param {Date} date 날짜
   */
  calcSolarDeclination(date) {
    const month = date.getMonth() + 1; // 월
    const day = date.getDate() + 1; // 일
    // 태양적위 계산
    const solarDeclination = _.chain(month)
      .subtract(3)
      .multiply(30)
      .add(_.subtract(day, 21))
      .thru(this.convertToRadian)
      .thru(Math.sin)
      .multiply(23.5)
      .value();

    return solarDeclination;
  }

  /**
   * 각도를 라디안으로 변환 -> 각도*원주율/180
   * @param {number} angle 각도 (˚)
   * @example 45도 -> 0.78라디안
   */
  convertToRadian(angle) {
    return _.chain(angle).multiply(_.divide(3.14, 180));
  }

  /**
   * 가조시간(h) 계산 -> (24/원주율)*arccos(-tan(위도)*tan(태양적위))
   * 가조시간(h) : 일출에서 일몰까지의 시간
   * @param {number} latitude 위도 (각도)
   * @param {number} solarDeclination 태양적위 (각도)
   */
  calcMaxSunshineHours(latitude, solarDeclination) {
    const radianLatitude = this.convertToRadian(latitude); // 변환된 위도(라디안)
    const radianSolarDeclination = this.convertToRadian(solarDeclination); // 변환된 태양적위(라디안)

    const tanLatitude = Math.tan(radianLatitude); // tan(위도(라디안))
    const tanSolarDeclination = Math.tan(radianSolarDeclination); // tan(태양적위(라디안))

    return _.chain(tanLatitude)
      .multiply(tanSolarDeclination)
      .multiply(-1)
      .thru(Math.acos)
      .multiply(_.divide(24, 3.14))
      .value();
  }

  /**
   * 운량에 따른 가조시간(h) 감소율 계산 -> 90.5-0.6*운량^2.2
   * @param {number} sky 운량 (0~10)
   */
  calcSunshineHoursReductionRate(sky) {
    return _.chain(sky ** 2.2)
      .multiply(0.6)
      .multiply(-1)
      .add(90.5)
      .value();
  }

  /**
   * 일조시간(h) 계산 -> 가조시간(h)*(가조시간(h) 감소율/100)
   * 일조시간(h) : 태양의 직사광선이 지표를 비추는 시간
   * @param {number} maxSunshineHours 가조시간(h)
   * @param {number} sky  가조시간 감소율 (%)
   */
  calcMinSunshineHours(maxSunshineHours, sky) {
    const sunshineHoursReductionRate = this.calcSunshineHoursReductionRate(sky); // 가조시간 감소율

    return _.chain(maxSunshineHours)
      .multiply(_.divide(sunshineHoursReductionRate, 100))
      .value();
  }

  /**
   *  일사량(Wh/m^2) 계산
   * -> (0.18 +0.55(일조시간(h)/가조시간(h)))*37.6*(accos(-tan(위도)tan(태양적위))*sin(위도)sin(태양적위)+cos(위도)cos(태양적위)sin(accos(-tan(위도)tan(태양적위))))
   * @param {number} maxSunshineHours 가조시간(h)
   * @param {number} minSunshineHours 일조시간(h)
   * @param {number} latitude 위도 (˚)
   * @param {number} solarDeclination 태양적위 (˚)
   */
  calcSolarRadiation(maxSunshineHours, minSunshineHours, latitude, solarDeclination) {
    const radianLatitude = this.convertToRadian(latitude); // 위도 라디안 단위 변환
    const radianSolarDeclination = this.convertToRadian(solarDeclination); // 태양적위 라디안 단위 변환
    // 위도 삼각함수 적용
    const sinLatitude = Math.sin(radianLatitude);
    const cosLatitude = Math.cos(radianLatitude);
    const tanLatitude = Math.tan(radianLatitude);
    // 태양적위 삼각함수 적용
    const sinSolarDeclination = Math.sin(radianSolarDeclination);
    const cosSolarDeclination = Math.cos(radianSolarDeclination);
    const tanSolarDeclination = Math.tan(radianSolarDeclination);

    // 일몰 시간 각 (˚)
    const sunsetTimeAngle = _.chain(tanLatitude)
      .multiply(-1)
      .multiply(tanSolarDeclination)
      .thru(Math.acos)
      .value();

    // 대기 밖 일사량 계산
    const outsideSolarRadiation = _.chain(sinLatitude)
      .multiply(sinSolarDeclination)
      .multiply(sunsetTimeAngle)
      .thru(result => {
        return _.chain(cosLatitude)
          .multiply(cosSolarDeclination)
          .multiply(Math.sin(sunsetTimeAngle))
          .add(result);
      })
      .multiply(37.6)
      .value();

    // 일사량(MJ/m^2) 계산
    const solarRadiation = _.chain(minSunshineHours)
      .divide(maxSunshineHours)
      .multiply(0.55)
      .add(0.18)
      .multiply(outsideSolarRadiation)
      .value();

    // 단위를 MJ -> Wh 로 변환 후 반환
    return _.chain(solarRadiation)
      .multiply(1000000)
      .divide(3600)
      .value();
  }

  /**
   * 일일 발전량(kWh) 계산
   * @param {number} solarRadiation 일사량 (Wh/m^2)
   * @param {number} moduleCapacity  모듈 총 발전 용량 (W)
   */
  calcSolarPower(solarRadiation, moduleCapacity) {
    // 모듈 설계 계수 : 모듈 설계 특성으로 인해 손상되는 발전량 평균적인 계수
    const moduleDesignFactor = 0.8;

    return _.chain(moduleDesignFactor)
      .multiply(moduleCapacity)
      .multiply(solarRadiation)
      .divide(1000)
      .value();
  }

  /**
   * 증발량 계산 (kg)
   * @param {number} moduleWide 모듈 면적 (m^2)
   * @param {number} maxSunshineHours 가조시간 (h)
   * @param {number} ws 풍속(m/s)
   */
  calcWaterEvaporation(moduleWide, maxSunshineHours, ws) {
    // 증발속도 공식 중 분자 부분
    const waterEvaporationRateNumberator = _.chain(ws ** 0.78)
      .multiply(1.4)
      .thru(result => {
        return _.chain(18 ** _.divide(2, 3))
          .multiply(moduleWide)
          .multiply(15.477)
          .multiply(result);
      })
      .value();

    // 증발속도 공식 중 분모 부분
    const waterEvaporationRateDenominator = _.chain(100)
      .add(273.15)
      .multiply(82.05)
      .value();

    // 분당 증발 속도 (kg/분)
    const waterEvaporationRate = _.divide(
      waterEvaporationRateNumberator,
      waterEvaporationRateDenominator,
    );

    return _.chain(waterEvaporationRate)
      .multiply(maxSunshineHours)
      .multiply(60)
      .value();
  }

  /**
   * 발전 효율 계산 (%)
   * @param {number} waterLevel 수위 (cm)
   * @param {number} temp 기온 (℃)
   * @param {number} waterEvaporation 증발량 (kg)
   * @param {number} moduleWide 모듈 면적 (m^2)
   */
  calcSolarPowerEfficiency(waterLevel, temp, waterEvaporation, moduleWide) {
    const solarPowerEfficiencys = [];
    _.forEach(waterLevel, wl => {
      const waterLevelLoss = 0.98 ** wl; // 수위에 대한 효율 감소
      const airMass = _.multiply(moduleWide, 1.293); // 공기의 질량
      const temperatureDiffrence = _.divide(waterEvaporation, airMass) * 2.2; // 기온 차
      const reducedTemperature = _.subtract(temp, temperatureDiffrence); // 감소 된 기온

      const solarPowerEfficiency = _.chain(reducedTemperature)
        .multiply(0.004977)
        .multiply(-1)
        .add(waterLevelLoss)
        .add(0.0767)
        .value();
      solarPowerEfficiencys.push(solarPowerEfficiency);
    });
    return solarPowerEfficiencys;
  }
}

module.exports = SolarPowerCalc;
