const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const report = require('./report');
const trend = require('./trend');

const webUtil = require('../../models/templates/web.util');
const commonUtil = require('../../models/templates/common.util');

const domMakerMaster = require('../../models/domMaker/masterDom');

// router.use((req, res, next) => {
//   next();
// });

const DEFAULT_SITE_ID = 'all';

// server middleware
router.get(
  [
    '/',
    '/:naviMenu',
    '/:naviMenu/:siteId',
    '/:naviMenu/:siteId/:subCategory',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId',
  ],
  asyncHandler(async (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    // 선택한 SiteId와 인버터 Id를 정의
    const { naviMenu = '', siteId = user.main_seq } = req.params;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    _.set(req, 'locals.viewPowerProfileRows', viewPowerProfileRows);

    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 사이트 목록 추가
    const loginAreaDom = domMakerMaster.makeTopHeader(user);
    _.set(req, 'locals.dom.loginAreaDom', loginAreaDom);

    // 네비게이션 목록 추가
    const naviList = [
      {
        href: 'main',
        name: '메인',
      },
      {
        href: 'trend',
        name: '트렌드',
      },
      {
        href: 'report',
        name: '보고서',
      },
    ];
    const naviListDom = domMakerMaster.makeNaviListDom(naviList, naviMenu, siteId);
    _.set(req, 'locals.dom.naviListDom', naviListDom);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(mainRow.weather_location_seq);

    const weathercastDom = domMakerMaster.makeWeathercastDom(currWeatherCastInfo);
    _.set(req, 'locals.dom.weathercastDom', weathercastDom);

    // BU.CLI(req.locals.siteId);
    next();
  }),
);

router.use('/', main);
router.use('/trend', trend);
router.use('/report', report);

module.exports = router;
