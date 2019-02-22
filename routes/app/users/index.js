const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./appMain');
const trend = require('./appTrend');
const control = require('./control');

const webUtil = require('../../../models/templates/web.util');
const commonUtil = require('../../../models/templates/common.util');

const DEFAULT_SITE_ID = 'all';

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
    BU.CLI('App Main Router');
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    const { grade } = user;

    // 사용자가 Manager 등급이라면 기본 siteId를 all로 지정
    const userMainSeq = grade === 'manager' ? DEFAULT_SITE_ID : user.main_seq;

    // 선택한 SiteId와 메뉴 정의
    const { naviMenu = '', siteId = userMainSeq } = req.params;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    // BU.CLI(viewPowerProfileRows);

    _.set(req, 'locals.viewPowerProfileRows', viewPowerProfileRows);

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
        const siteName = `${totalAmount}kW급 테스트베드 (${siteMainName})`;
        return { siteid: strMainSeq.toString(), name: siteName, m_name: siteMainName };
      })
      .value();
    siteList.unshift({ siteid: DEFAULT_SITE_ID, name: `모두(${totalSiteAmount}kW급)` });

    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);
    _.set(req, 'locals.mainInfo.siteList', siteList);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);
    // BU.CLI('@@@', req.locals);
    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(mainRow.weather_location_seq);

    req.locals.headerInfo = {
      headerEnv: {
        currWeatherCastInfo: _.pick(currWeatherCastInfo, ['ws', 'wf', 'temp']),
      },
      headerMenu: req.locals.mainInfo,
    };

    // BU.CLI(req.locals.siteId);
    next();
  }),
);

// Router 추가
router.use('/', main);
router.use('/trend', trend);
// router.use('/', main);

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
