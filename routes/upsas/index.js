const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const structure = require('./structure');
const status = require('./status');
const trend = require('./trend');
const report = require('./report');
const control = require('./control');

const commonUtil = require('../../models/templates/common.util');

const domMakerMaster = require('../../models/domMaker/masterDom');

const DEFAULT_SITE_ID = 'all';

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
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    const { grade } = user;

    // 사용자가 Manager 등급이라면 기본 siteId를 all로 지정
    const userMainSeq = grade === 'manager' ? DEFAULT_SITE_ID : user.main_seq;

    // 선택한 SiteId와 인버터 Id를 정의
    const { naviMenu = 'main', siteId = userMainSeq } = req.params;

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

    // BU.CLI(req.query);

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });
    // const searchRange = biModule.createSearchRange({
    //   searchType: 'days',
    //   searchInterval: 'hour',
    //   strStartDate: '2019-08-05',
    //   strEndDate: '',
    // });

    _.set(req, 'locals.searchRange', searchRange);

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    _.set(req, 'locals.viewPowerProfileRows', _.filter(viewPowerProfileRows, mainWhere));

    let totalSiteAmount = 0;
    const siteList = _(viewPowerProfileRows)
      .groupBy('main_seq')
      .map((profileRows, strMainSeq) => {
        const totalAmount = _.round(
          _(profileRows)
            .map('ivt_amount')
            .sum(),
        );
        totalSiteAmount += totalAmount;
        const siteMainName = _.get(_.head(profileRows), 'm_name', '');
        const siteName = `${totalAmount}kW급 (${siteMainName})`;
        return { siteId: strMainSeq.toString(), name: siteName, m_name: siteMainName };
      })
      .value();
    siteList.unshift({ siteId: DEFAULT_SITE_ID, name: `모두(${totalSiteAmount}kW급)` });

    // _.set(req, 'locals.siteList', siteList);
    const projectSource = commonUtil.convertProjectSource(process.env.PJ_MAIN_ID);

    _.set(req, 'locals.mainInfo.projectMainId', projectSource.projectName);
    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);
    _.set(req, 'locals.mainInfo.siteList', siteList);
    _.set(req, 'locals.mainInfo.mainWhere', mainWhere);

    // BU.CLI(req.locals.mainInfo);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 프로젝트 홈
    _.set(req, 'locals.dom.projectHome', domMakerMaster.makeProjectTitle(projectSource));
    // 사이트 목록 추가
    const loginAreaDom = domMakerMaster.makeTopHeader(user);
    _.set(req, 'locals.dom.loginAreaDom', loginAreaDom);

    const siteListDom = domMakerMaster.makeSiteListDom(siteList, siteId);
    _.set(req, 'locals.dom.siteListDom', siteListDom);

    // 네비게이션 목록 추가
    const naviList = [
      {
        href: 'main',
        name: '메인',
      },
      {
        href: 'structure',
        name: '구성도',
      },
      {
        href: 'status',
        name: '계측현황',
      },
      // {
      //   href: 'connector',
      //   name: '접속반',
      // },
      // {
      //   href: 'inverter',
      //   name: '인버터',
      // },
      {
        href: 'trend',
        name: '트렌드',
      },
      {
        href: 'report',
        name: '보고서',
      },
      {
        href: 'cctv',
        name: 'CCTV',
      },
    ];

    // admin 등급에선 제어 페이지 노출(무안)
    if (_.eq(grade, 'admin')) {
      naviList.push({
        href: 'control',
        name: '제어',
      });
    }

    const naviListDom = domMakerMaster.makeNaviListDom(naviList, naviMenu, siteId);
    _.set(req, 'locals.dom.naviListDom', naviListDom);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);
    // BU.CLI(mainRow)

    _.set(req, 'locals.mainInfo.uuid', mainRow.uuid);

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await weatherModel.getCurrWeatherCast(mainRow.weather_location_seq);

    const weathercastDom = domMakerMaster.makeWeathercastDom(currWeatherCastInfo);
    _.set(req, 'locals.dom.weathercastDom', weathercastDom);

    // BU.CLI(req.locals.siteId);
    next();
  }),
);

// Router 추가
router.use('/', main);
router.use('/structure', structure);
router.use('/status', status);
// router.use('/connector', connector);
// router.use('/inverter', inverter);
router.use('/trend', trend);
router.use('/report', report);
router.use('/control', control);
router.use('/cctv', control);

// router.use('/users', users);

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     const user = _.get(req, 'user', {});
//     next();
//   }),
// );

// /* GET users listing. */
// router.get('/', (req, res, next) => {
//   BU.CLI(process.env.DEV_PAGE);
//   if (_.isString(process.env.DEV_PAGE)) {
//     res.redirect(`/${process.env.DEV_PAGE}`);
//   } else {
//     res.redirect('/main');
//   }
// });

module.exports = router;
