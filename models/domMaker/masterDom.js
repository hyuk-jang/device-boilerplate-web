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
  makeLoginUser(userInfo) {
    // console.log('userInfo', userInfo);
    const loginAreaTemplate = _.template(
      `<span class="user_id"><%= nick_name %></span><span class="user_nim">님</span>
      <input type="button" class="logout" onclick="location.href='/auth/logout'" value="로그아웃" />`,
    );

    const madeMap = loginAreaTemplate(userInfo);

    return madeMap;
  },

  /**
   * 프로젝트 Home 생성
   * @param {{name: string, imgPath: string}} projectSource
   */
  makeProjectHome(projectSource) {
    const projectTitle = _.template(
      `<img src="/image/icon/<%= imgPath %>" />
      <span><%= name %></span>`,
    );

    const madeMap = projectTitle(projectSource);

    return madeMap;
  },

  /**
   *
   * @param {fDetailFooterInfo} footerInfo
   */
  makeProjectFooter(footerInfo) {
    const {
      copyrightInfo: { address, company, href, imgPath },
      noticeList = [],
    } = footerInfo;

    const copyrightTemplate = _.template(
      `
        <img width="20" height="20" src="<%= imgPath >" />
        <a href="<%= href %>"><b>© <%= company %></b></a>
      `,
    );

    const noticeTemplate = _.template(
      `
        <span>|</span>
        <a href="<%= href %>"><%= name %></a>
       `,
    );
  },

  /**
   * 금일 날짜 생성
   * @param {WC_KMA_DATA} currWeatherCastInfo
   */
  makeWeathercastDom(currWeatherCastInfo) {
    const { wf, temp } = currWeatherCastInfo;
    const weatherCastTemplate = _.template(
      `<span><%= currDate %></span>
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
   * @param {{siteId: string, name: string}[]} siteList
   * @param {string} selectedSiteId
   */
  makeSiteListDom(siteList, selectedSiteId) {
    selectedSiteId = selectedSiteId.toString();
    const siteOptionTemplate = _.template(
      '<option <%= isSelected %> value="<%= siteId %>"><%= name %></option>',
    );
    const madeDom = siteList.map(siteInfo => {
      const { siteId, name } = siteInfo;
      let isSelected = '';
      if (selectedSiteId === siteId) {
        isSelected = 'selected';
      }
      return siteOptionTemplate({ siteId, name, isSelected });
    });
    return madeDom;
  },

  /**
   * 네비게이션 메뉴 생성
   * @param {{href: string, name: string}[]} naviList
   * @param {string} selectedNavi
   * @param {string=} userSeq
   */
  makeNaviListDom(naviList = [], selectedNavi = '', userSeq = '') {
    // 네비가 존재하지 않을 경우 첫번째 선택
    if (naviList.findIndex(naviInfo => naviInfo.href === selectedNavi) === -1) {
      selectedNavi = naviList[0].href;
    }
    // siteId가 존재할 경우
    const siteParam = userSeq ? `/${userSeq}` : '';

    const siteOptionTemplate = _.template(
      '<li class="<%= isSelected %>"><a href="/<%= href %><%= siteParam %>"><%= name %></a></li>',
    );
    const madeDom = naviList
      .filter(naviInfo => !naviInfo.isHidden)
      .map(naviInfo => {
        const { href, name } = naviInfo;
        let isSelected = '';
        if (selectedNavi === href) {
          isSelected = 'active';
        }
        return siteOptionTemplate({ href, name, isSelected, siteParam });
      });
    return madeDom.join('');
  },

  makeShadowDom() {},
};
