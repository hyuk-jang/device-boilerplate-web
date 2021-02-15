const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const inverter = require('./inverter');
const sensor = require('./sensor');
const trend = require('./trend');
const report = require('./report');
const control = require('./control');
const admin = require('./admin');
const myPage = require('./myPage');

const routerInfo = {
  main,
  inverter,
  sensor,
  trend,
  report,
  control,
  admin,
  myPage,
};

const commonUtil = require('../../models/templates/common.util');

const domMakerMaster = require('../../models/domMaker/masterDom');

const DEFAULT_SITE_ID = 'all';

// const accountUserGradeRange = ['manager', 'owner', 'guest'];

// server middleware
// router.use((req, res, next) => {
//   BU.CLI('Main Middile Ware', req.user);
//   // if (process.env.DEV_AUTO_AUTH !== '1') {
//   // if (global.app.get('auth')) {

//   if (!req.user) {
//     return res.redirect('/auth/login');
//   }
//   // }

//   next();
// });

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';

/** @type {projectConfig} */
const pConfig = global.projectConfig;

const {
  naviList,
  viewInfo: { titleInfo, homeInfo, footerInfo },
} = pConfig;
// server middleware
router.get(
  [
    '/',
    '/:naviMenu',
    '/:naviMenu/:siteId',
    '/:naviMenu/:siteId/:subCategory',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    // BU.CLI(req.params);
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    const { grade } = user;

    // 사용자가 Manager 등급이라면 기본 siteId를 all로 지정
    // FIXME: GS 인증용. 쓸모없는 계정이라 함
    // const userMainSeq = grade === 'manager' ? DEFAULT_SITE_ID : user.main_seq;

    // 선택한 SiteId와 인버터 Id를 정의
    const { naviMenu, siteId = user.main_seq, subCategory, subCategoryId } = req.params;

    /* *********      ↓↓↓  Navi 관련 설정  ↓↓↓       ********* */
    /** @type {Object[]} */
    const currNaviList = _.filter(naviList, naviInfo => {
      const { grade: naviGrade = [] } = naviInfo;

      // 권한 등급이 지정되어 있을 경우 체크
      return naviGrade.length ? _.includes(naviGrade, grade) : true;
    });

    // 경로를 설정하지 않았거나 존재하지 않는 경로일 경우 Redirect
    if (_.find(currNaviList, { href: naviMenu }) === undefined) {
      return res.redirect(`/${currNaviList[0].href}`);
    }

    /* *********      ↓↓↓  searchRange, siteInfo   ↓↓↓       ********* */
    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');

    // req.query 값 비구조화 할당
    const {
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      searchOption = DEFAULT_SEARCH_OPTION,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });

    // const searchRange = biModule.createSearchRange({
    //   searchType,
    //   searchInterval,
    //   searchOption,
    //   strStartDate: '2020-08-21',
    //   // strEndDate: '2020-08-22',
    // });

    _.set(req, 'locals.searchRange', searchRange);

    /** @type {MAIN[]} */
    const mainRows = await biModule.getTable('main', { is_deleted: 0 });
    // Site All일 경우 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    let totalSiteAmount = 0;
    const siteList = mainRows.map(mRow => {
      const { name: mainName, main_seq: mSeq, power_amount: pAmount = 0 } = mRow;

      totalSiteAmount += pAmount;

      const siteName = `${pAmount} kW (${mainName})`;
      return { siteId: mSeq.toString(), name: siteName, m_name: mainName };
    });

    siteList.unshift({ siteId: DEFAULT_SITE_ID, name: `모두(${totalSiteAmount} kW)` });
    _.set(req, 'locals.viewPowerProfileRows', _.filter(viewPowerProfileRows, mainWhere));

    _.set(req, 'locals.mainInfo.projectMainId', titleInfo.name);
    _.set(req, 'locals.mainInfo.footerInfo', footerInfo);
    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);
    _.set(req, 'locals.mainInfo.subCategory', subCategory);
    _.set(req, 'locals.mainInfo.subCategoryId', subCategoryId);
    _.set(req, 'locals.mainInfo.siteList', siteList);
    _.set(req, 'locals.mainInfo.mainWhere', mainWhere);
    _.set(req, 'locals.mainInfo.uuid', mainRow.uuid);

    /* *********      ↓↓↓  DOM   ↓↓↓       ********* */
    const naviListDom = domMakerMaster.makeNaviListDom(currNaviList, naviMenu, siteId);
    _.set(req, 'locals.dom.naviListDom', naviListDom);
    // 프로젝트 홈
    _.set(req, 'locals.dom.projectHomeDom', domMakerMaster.makeProjectHome(homeInfo));
    // 사이트 목록 추가
    const loginUserDom = domMakerMaster.makeLoginUser(user);
    _.set(req, 'locals.dom.loginUserDom', loginUserDom);

    const siteListDom = domMakerMaster.makeSiteListDom(siteList, siteId);
    _.set(req, 'locals.dom.siteListDom', siteListDom);

    // Site 기상청 날씨 정보 구성
    let currWeatherCastInfo = {};
    if (_.isNumber(mainRow.weather_location_seq)) {
      currWeatherCastInfo = await weatherModel.getCurrWeatherCast(
        mainRow.weather_location_seq,
      );
    }

    const weathercastDom = domMakerMaster.makeWeathercastDom(currWeatherCastInfo);
    _.set(req, 'locals.dom.weathercastDom', weathercastDom);

    _.set(req, 'locals.modalMsg', req.flash('modalMsg'));

    next();
  }),
);

// Router 추가
naviList.forEach((naviInfo, index) => {
  const { href } = naviInfo;
  // index === 0
  //   ? router.use('/', routerInfo[href])
  //   : router.use(`/${href}`, routerInfo[href]);
  router.use(`/${href}`, routerInfo[href]);
});
// router.use('/myPage', myPage);

module.exports = router;
