const _ = require('lodash');
const { BU } = require('base-util-jh');
const { BM } = require('base-model-jh');

const Weathercast = require('weather-cast');
const AbstWeathercast = require('./AbstWeathercast');

module.exports = class extends AbstWeathercast {
  /**
   * db 접속 정보를 바탕으로 Main Table에 지정된 weather_location_seq 만큼 기상청 동네예보 날씨 요청
   * 30분에 한번씩 요청
   * @param {dbInfo} dbInfo
   */
  async init(dbInfo) {
    // BU.CLI(this.dbInfo);
    const biModule = new BM(dbInfo);
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

    deviceList.forEach(currentItem => {
      const axis = _.pick(currentItem, ['x', 'y']);
      /** @type {{dbInfo: dbInfo, locationSeq: number, locationInfo: {x: number, y: number}}} */
      const config = {
        dbInfo,
        locationInfo: axis,
        locationSeq: _.get(currentItem, 'weather_location_seq'),
      };

      // BU.CLI(config);
      const weathercast = new Weathercast(config);
      weathercast.init();
    });
  }
};
