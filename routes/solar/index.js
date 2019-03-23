const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
// const inverter = require('./inverter');
// const sensor = require('./sensor');
const trend = require('./trend');
// const report = require('./report');
// const control = require('./control');

const webUtil = require('../../models/templates/web.util');
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

    const { naviMenu = 'main', siteId = user.main_seq } = req.params;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    const siteList = await biModule.getTable('main');
    // BU.CLI(siteList);

    // _.set(req, 'locals.siteList', siteList);
    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);

    // BU.CLI(req.locals.mainInfo);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 프로젝트 홈
    const projectSource = commonUtil.convertProjectSource('SOLAR');
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
      // {
      //   href: 'sensor',
      //   name: '생육환경',
      // },
      {
        href: 'trend',
        name: '트렌드',
      },
      // {
      //   href: 'report',
      //   name: '보고서',
      // },
    ];

    const naviListDom = domMakerMaster.makeNaviListDom(naviList, naviMenu, siteId);
    _.set(req, 'locals.dom.naviListDom', naviListDom);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);
    // BU.CLI(mainRow)

    _.set(req, 'locals.mainInfo.uuid', mainRow.uuid);

    // 프로젝트 홈
    _.set(req, 'locals.dom.projectHome', domMakerMaster.makeProjectTitle(projectSource));

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(mainRow.weather_location_seq);

    const weathercastDom = domMakerMaster.makeWeathercastDom(currWeatherCastInfo);
    _.set(req, 'locals.mainInfo.projectMainId', projectSource.projectName);
    _.set(req, 'locals.dom.weathercastDom', weathercastDom);

    // BU.CLI(req.locals.siteId);
    next();
  }),
);

// Router 추가
router.use('/', main);
// router.use('/inverter', inverter);
// router.use('/sensor', sensor);
router.use('/trend', trend);
// router.use('/report', report);
// router.use('/control', control);

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
