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
      '<span style="font-weight:bold"><%= name %></span>님. 환영합니다. <a href="/auth/logout" style="color: black"><span class="glyphicon glyphicon-log-out" aria-hidden="true"></a>',
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
      `<span style="margin-right:40px;"><%= currDate %></span>
      <span>날씨</span>
      <img src="/image/weather/weather_<%= wf %>.png">
      <input type="text" readonly value="<%= temp %>" class="form-control" style="text-align: center">
      <span class="Temperature">℃</span>`,
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
   * @param {string} selectedNavi
   * @param {string=} userSeq
   */
  makeNaviListDom(selectedNavi = 'main', userSeq = '') {
    selectedNavi = selectedNavi.length ? selectedNavi : 'main';
    // siteId가 존재할 경우
    const siteParam = userSeq.length ? `/${userSeq}` : '';

    const naviList = [
      {
        href: 'main',
        name: '메인',
      },
      {
        href: 'inverter',
        name: '인버터',
      },
      {
        href: 'sensor',
        name: '생육센서',
      },
      // {
      //   href: 'trend',
      //   name: '트렌드',
      // },
      {
        href: 'report',
        name: '보고서',
      },
    ];

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
};
