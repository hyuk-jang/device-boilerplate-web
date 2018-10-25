const _ = require('lodash');
const { BU } = require('base-util-jh');
const { BM } = require('base-model-jh');

const Weathercast = require('../../../weather-cast');

module.exports = class {
  /**
   *
   * @param {dbInfo} dbInfo
   */
  constructor(dbInfo) {
    // 기본 dbInfo 설정
    this.dbInfo = dbInfo;
  }

  /**
   * 기상청 동네예보 계측 동작
   */
  async init() {
    BU.CLI(this.dbInfo);
    const biModule = new BM(this.dbInfo);
    const sql = `
    select wl.* from (
      select weather_location_seq from MAIN
      where is_deleted = 0
      group by weather_location_seq
    ) m
    left join wc_weather_location wl
     on m.weather_location_seq = wl.weather_location_seq
  `;
    const deviceList = await biModule.db.single(sql);
    // BU.CLI(deviceList);

    deviceList.forEach(currentItem => {
      const axis = _.pick(currentItem, ['x', 'y']);
      /** @type {{dbInfo: dbInfo, locationSeq: number, locationInfo: {x: number, y: number}}} */
      const config = {
        dbInfo: this.dbInfo,
        locationInfo: axis,
        locationSeq: _.get(currentItem, 'weather_location_seq'),
      };

      // BU.CLI(config);
      const weathercast = new Weathercast(config);
      weathercast.init();
    });
  }

  /**
   * 저장할 DB 접속 정보를 변경하고자 할 경우 정의
   * @param {dbInfo} dbInfo
   */
  setDB(dbInfo) {
    this.dbInfo = dbInfo;
  }
};
