const _ = require('lodash');
const moment = require('moment');

const { BU } = require('base-util-jh');

class SolarPowerCalc {
  constructor(map, waterlevel) {
    const testInfo = this.collectInfo(waterlevel);

    // 태양 적위 계산
    const solarDeclination = this.calcSolarDeclination(testInfo.date);
    // 가조 시간 계산 (PossibleDurationSunshine)
    const pds = this.calcPossibleDurationSunshine(testInfo.latitude, solarDeclination);
    // 운량을 적용한 가조시간 (PDS Scalage)
    const pdsScalage = this.calcPdsScalage(testInfo.cloud);
    // 일조 시간 계산 (Duation Sunshine)
    const ds = this.calcDurationSunshine(pds, pdsScalage);
    // 일사량 계산
    const solarRadiation = this.calcSolarRadiation(
      pds,
      ds,
      testInfo.latitude,
      solarDeclination,
    );

    testInfo.solarRadiation = solarRadiation;

    // 일일 발전량(Wh)
    const solarPower = this.calcSolarPower(solarRadiation, testInfo.moduleCapacity);

    const waterEvaporation = this.calcWaterEvaporation(
      testInfo.moduleWide,
      pds,
      testInfo.windSpeed,
    );
    const efficiency = this.calcEfficiency(
      testInfo.waterLevel,
      testInfo.airTemperature,
      waterEvaporation,
      testInfo.modulewide,
    );

    testInfo.solarPower = _.multiply(solarPower, efficiency);

    BU.CLI('다음날 발전 예측 ', testInfo);
  }

  /**
   * 일사량 예측 필요 정보
   * @typedef {Object} predictSolarConfig
   * @property {string} group_date 계측 일자
   * @property {number} latitude
   * @property {number} avg_cloud 기상청 구름
   */

  /**
   * 발전량 예측 필요 정보
   * @typedef {Object} predictPowerConfig
   * @property {Date} date 계측 일자
   * @property {number} temp 기온 (℃)
   * @property {number} solar 일사량 (kW)
   * @property {number} moduleEfficiency 모듈 효율 (%)
   * @property {number} moduleSquare 모듈 면적 모듈 효율 (㎡)
   */

  // 발전량 예측
  /**
   *
   * @param {predictSolarConfig} predictSolarConfig
   */
  getPredictSolar(predictSolarConfig) {
    const {
      group_date: sDate,
      avg_cloud: cloud,
      latitude,
      temp,
      windSpeed,
    } = predictSolarConfig;

    const date = new Date(sDate);
    // 태양 적위 계산
    const solarDeclination = this.calcSolarDeclination(new Date(date));
    // 가조 시간 계산 (PossibleDurationSunshine)
    const pds = this.calcPossibleDurationSunshine(latitude, solarDeclination);
    // 운량을 적용한 가조시간 (PDS Scalage)
    const pdsScalage = this.calcPdsScalage(cloud);
    // 일조 시간 계산 (Duation Sunshine)
    const ds = this.calcDurationSunshine(pds, pdsScalage);
    // 일사량 계산
    const solarRadiation = this.calcSolarRadiation(pds, ds, latitude, solarDeclination);

    return Object.assign(predictSolarConfig, {
      pds,
      pdsScalage,
      ds,
      solarRadiation,
    });

    // return {
    //   ...predictSolarConfig,
    //   pds,
    //   pdsScalage,
    //   ds,
    //   solarRadiation,
    // };

    // return solarRadiation;
  }

  /**
   *
   * @param {*} predictConfig
   */
  getPredictPower(predictConfig) {}

  // FIXME: 이름 생각
  // TODO: 발전 예측에 필요한 정보 객체 생성
  collectInfo(waterlevel) {
    // TODO: 기상청 데이터 수집
    // TODO: map에서 모듈크기, 장소 수집

    const test = {
      date: new Date().addDays(1),
      cloud: 4,
      latitude: 35.053004,
      moduleCapacity: 6000,
      moduleWide: 38,
      windSpeed: 1,
      airTemperature: 20,
      solarPower: 0,
      waterLevel: waterlevel,
    };

    return test;
  }

  /**
   * 태양 적위 계산 -> 23.5*xsin((월-3)*30 + (일-21))
   * @param {Date} date 날짜
   */
  calcSolarDeclination(date) {
    const month = date.getMonth(); // 월
    const day = date.getDate();
    // // 1월 1 일 이후로 경과 한 일수를 결정하십시오. 예를 들어, 1 월 1 일과 2 월 14 일 사이의 일 수는 44 일입니다.
    // const startDate = moment(date);
    // startDate.set({
    //   month: 0,
    //   day: 1,
    //   hour: 0,
    // });

    // let diffDay = moment(date).diff(startDate, 'day');

    // // 경과 일수에 10을 더합니다. 이 번호를 써라. 예제에 따라 44에 10을 더하면 54가됩니다.
    // diffDay += 10;

    // // 360 일을 일수로 나누십시오. 매년 윤년을 제외하고는 365 일이 걸립니다. 이 번호를 써라. 이 예에서 360을 365 = 0.9863으로 나눈 값입니다.
    // const r1 = 0.9863;

    // // 2 단계 (동지 이후 대략적인 일수)에 3 단계의 금액 (1 일 회전 수)을 곱하십시오. 결과를 기록하십시오. 이 예에서 54 배의.9863은 53.2603과 같습니다.
    // const r2 = diffDay * r1;

    // // 4 단계에서 얻은 결과의 코사인을 찾습니다. 지구 축의 기울기 인 -23.44를 곱합니다. 그 결과는 일년 중 그 날의 태양의 적위입니다. 이 예제에서 53.2603의 코사인은 0.5982입니다. -14.02도를 얻기 위해 -23.44를 곱하십시오.
    // // console.log('18', r2, Math.cos(r2));
    // // BU.CLIS(diffDay, r2, Math.cos(r2), this.convertToRadian(53.2603));
    // const declination = Math.cos(this.convertToRadian(r2)) * -23.44;
    // // const declination = Math.cos((r2 * Math.PI) / 180) * -23.44;

    // 일
    // 태양적위 계산
    const solarDeclination = _.multiply(
      23.5,
      Math.sin(this.convertToRadian(_.add(_.multiply(month - 3, 30), day - 21))),
    );

    BU.CLIS(solarDeclination);

    return solarDeclination;
  }

  /**
   * 각도를 라디안으로 변환 -> 각도*원주율/180
   * @param {num} angle 각도
   * @example 45도 -> 0.78라디안
   */
  convertToRadian(angle) {
    //
    return _.multiply(angle, _.divide(3.14, 180));
  }

  /**
   * 가조시간(h) 계산 -> (24/원주율)*arccos(-tan(위도)*tan(태양적위))
   * 가조시간(h) : 일출에서 일몰까지의 시간
   * @param {num} latitude 위도 (각도)
   * @param {num} solarDeclination 태양적위 (각도)
   */
  calcPossibleDurationSunshine(latitude, solarDeclination) {
    const radianLatitude = this.convertToRadian(latitude); // 변환된 위도(라디안)
    const radianSolarDeclination = this.convertToRadian(solarDeclination); // 변환된 태양적위(라디안)

    const tanLatitude = Math.tan(radianLatitude); // tan(위도(라디안))
    const tanSolarDeclination = Math.tan(radianSolarDeclination); // tan(태양적위(라디안))

    return _.multiply(
      _.divide(24, 3.14),
      Math.acos(-_.multiply(tanLatitude, tanSolarDeclination)),
    );
  }

  /**
   * 운량에 따른 가조시간(h) 감소율 계산 (pds : possibleDurationSunshine) -> 90.5-0.6*운량^2.2
   * @param {num} cloud 운량 (0~10)
   */
  calcPdsScalage(cloud) {
    return 90.5 - _.multiply(0.6, Math.pow(cloud, 2.2));
  }

  /**
   * 일조시간(h) 계산 -> 가조시간(h)*(가조시간(h) 감소율/100)
   * 일조시간(h) : 태양의 직사광선이 지표를 비추는 시간
   * @param {num} pds 가조시간(h) (possible duration of sunshine)
   * @param {num} pdsScalage  가조시간 감소율 (%)
   */
  calcDurationSunshine(pds, pdsScalage) {
    return _.multiply(pds, _.divide(pdsScalage, 100));
  }

  /**
   *  일사량(Wh/m^2) 계산
   * -> (0.18 +0.55(일조시간(h)/가조시간(h)))*37.6*(accos(-tan(위도)tan(태양적위))*sin(위도)sin(태양적위)+cos(위도)cos(태양적위)sin(accos(-tan(위도)tan(태양적위))))
   * @param {num} pds 가조시간(h)
   * @param {num} ds 일조시간(h)
   * @param {num} latitude 위도 (각도)
   * @param {num} solarDeclination 태양적위 (각도)
   */
  calcSolarRadiation(pds, ds, latitude, solarDeclination) {
    const radianLatitude = this.convertToRadian(latitude); // 위도 라디안 변환
    const radianSolarDeclination = this.convertToRadian(solarDeclination); // 태양적위 라디안 변환
    const w = Math.acos(
      _.multiply(-Math.tan(radianLatitude), Math.tan(radianSolarDeclination)),
    );
    // FIXME: 변수명 변경
    // 대기 밖 일사량 계산
    const outsideSolarRadiation = _.multiply(
      37.6,
      _.add(
        _.multiply(
          w,
          _.multiply(Math.sin(radianLatitude), Math.sin(radianSolarDeclination)),
        ),
        _.multiply(
          _.multiply(Math.cos(radianLatitude), Math.cos(radianSolarDeclination)),
          Math.sin(w),
        ),
      ),
    );

    // 일사량(MJ/m^2) 계산
    const solarRadiation = _.multiply(
      _.add(0.18, _.multiply(0.55, _.divide(ds, pds))),
      outsideSolarRadiation,
    );

    // 단위를 MJ -> Wh 로 변환 후 반환
    // return _.divide(solarRadiation * 1000000, 3600);
    return _.divide(_.multiply(solarRadiation, 1000000), 3600);
  }

  /**
   * 일일 발전량(Wh) 계산
   * @param {num} solarRadiation 일사량 (Wh/m^2)
   * @param {num} moduleCapacity  모듈 총 발전 용량 (W)
   */
  calcSolarPower(solarRadiation, moduleCapacity) {
    const moduleDesignFactor = 0.8;
    // 모듈 설계 계수 : 모듈 설계 특성으로 인해 손상되는 발전량 평균적인 계수

    // 발전량(Wh) 계산
    return _.divide(
      _.multiply(solarRadiation, _.multiply(moduleDesignFactor, moduleCapacity)),
      1000,
    );
  }

  /**
   *
   * @param {*} moduleWide
   * @param {*} psd
   * @param {*} windSpeed
   */
  calcWaterEvaporation(moduleWide, psd, windSpeed) {
    const numerator = _.multiply(
      _.multiply(1.4, Math.pow(windSpeed, 0.78)),
      _.multiply(Math.pow(18, 2 / 3), moduleWide * 15.477),
    );
    const denominator = 82.05 * (100 + 273.15);

    const waterEvaporationMinute = _.divide(numerator, denominator);

    return waterEvaporationMinute * psd * 60;
  }

  /**
   *
   * @param {*} waterLevel
   * @param {*} airTemperature
   * @param {*} waterEvaporation
   * @param {*} moduleWide
   */
  calcEfficiency(waterLevel, airTemperature, waterEvaporation, moduleWide) {
    const waterLevelLoss = Math.pow(0.98, waterLevel);
    const airMass = _.multiply(moduleWide, 1.293);
    const temperatureDiffrence = _.divide(waterEvaporation, airMass) * 2.2;
    const reducedTemperature = _.subtract(airTemperature, temperatureDiffrence);

    return _.subtract(waterLevelLoss, _.divide(-0.004977, reducedTemperature)) + 0.0767;
  }
}

module.exports = SolarPowerCalc;
