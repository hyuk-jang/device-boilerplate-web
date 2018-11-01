const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const inverter = require('./inverter');
const sensor = require('./sensor');
const trend = require('./trend');
const report = require('./report');
// const users = require('./users');

const webUtil = require('../../models/templates/web.util');

// router.use((req, res, next) => {
//   next();
// });

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

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
    siteList.unshift({ siteid: 'all', name: `모두(${totalSiteAmount}kW급)` });

    // 사이트 목록 추가
    _.set(req, 'locals.siteList', siteList);

    const user = _.get(req, 'user', {});

    // 지점 Id를 불러옴
    const { siteid = user.main_seq } = req.query;
    // 현재 선택한 사이트 Id 지정
    _.set(req, 'locals.siteId', _.eq(siteid, 'all') ? 'all' : siteid);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteid, 'all') ? user.main_seq : siteid;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(mainRow.weather_location_seq);
    _.set(req, 'locals.currWeatherCastInfo', currWeatherCastInfo);
    // BU.CLI(currWeatherCastInfo);

    // BU.CLI(req.locals);
    next();
  }),
);

router.use('/', main);
router.use('/inverter', inverter);
router.use('/sensor', sensor);
router.use('/trend', trend);
router.use('/report', report);

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
