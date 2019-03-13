const _ = require('lodash');
const moment = require('moment');

moment.locale('ko', {
  weekdays: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  weekdaysShort: ['일', '월', '화', '수', '목', '금', '토'],
});

module.exports = {
  /**
   *
   * @param {MEMBER} userInfo
   */
  makeTopHeader(userInfo) {
    // console.log('userInfo', userInfo);
    const loginAreaTemplate = _.template(
      `<span class="user_id"><%= name %></span><span class="user_nim">님</span>
      <input type="button" class="logout" onclick="location.href='/auth/logout'" value="Logout" />`,
    );

    const madeMap = loginAreaTemplate(userInfo);

    return madeMap;
  },
  /**
   *
   * @param {MEMBER} userInfo
   */
  makeWayHeader(userInfo) {
    // console.log('userInfo', userInfo);
    const loginAreaTemplate = _.template(
      `<span class="user_id"><%= name %></span><span class="user_nim">님</span>
      <input type="button" class="logout" onclick="location.href='/auth/logout'" value="Logout" />`,
    );

    const madeMap = loginAreaTemplate(userInfo);

    return madeMap;
  },

  /**
   * 금일 날짜 생성
   * @param {WC_KMA_DATA} currWeatherCastInfo
   */
  makeWeathercastDom(currWeatherCastInfo) {
    const { wf, temp } = currWeatherCastInfo;
    const weatherCastTemplate = _.template(
      `<span><%= currDate %></span>
      <span class="weacast_txt">날씨</span>
      <img src="/image/weather/weather_<%= wf %>.png">
      <input type="text" class="weathercast_temp" readonly value="<%= temp %>">
      <span class="weathercast_data_unit">℃</span>`,
    );

    const currDate = moment().format('YYYY.MM.DD(ddd)');
    const madeMap = weatherCastTemplate({
      currDate,
      wf,
      temp,
    });

    return madeMap;
  },
  /**
   * 지점 목록 생성
   * @param {{siteid: string, name: string}[]} siteList
   * @param {string} siteId
   */
  makeSiteListDom(siteList, siteId) {
    siteId = siteId.toString();
    const siteOptionTemplate = _.template(
      '<option <%= isSelected %> value="<%= siteid %>"><%= name %></option>',
    );
    const madeDom = siteList.map(siteInfo => {
      const { siteid, name } = siteInfo;
      let isSelected = '';
      if (siteId.toString() === siteid) {
        isSelected = 'selected';
      }
      return siteOptionTemplate({ siteid, name, isSelected });
    });
    return madeDom;
  },

  /**
   * 네비게이션 메뉴 생성
   * @param {{href: string, name: string}[]} naviList
   * @param {string} selectedNavi
   * @param {string=} userSeq
   */
  makeNaviListDom(naviList = [], selectedNavi = 'main', userSeq = '') {
    selectedNavi = selectedNavi.length ? selectedNavi : 'main';
    // siteId가 존재할 경우
    const siteParam = userSeq ? `/${userSeq}` : '';

    const siteOptionTemplate = _.template(
      '<li class="<%= isSelected %>"><a href="/<%= href %><%= siteParam %>"><%= name %></a></li>',
    );
    const madeDom = naviList.map(naviInfo => {
      const { href, name } = naviInfo;
      let isSelected = '';
      if (selectedNavi === href) {
        isSelected = 'active';
      }
      return siteOptionTemplate({ href, name, isSelected, siteParam });
    });
    return madeDom;
  },

  makeShadowDom() {},
};
