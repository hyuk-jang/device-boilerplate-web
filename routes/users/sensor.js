const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    const user = _.get(req, 'user', {});
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    _.set(req, 'locals.menuNum', 1);
    _.set(req, 'locals.siteId', user.main_seq);
    // BU.CLI(user.main_seq);
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
    req.locals.currWeatherCastInfo = currWeatherCastInfo;

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    const siteList = _(viewPowerProfileRows)
      .groupBy('main_seq')
      .map((profileRows, strMainSeq) => {
        // BU.CLI(profileRows);
        const totalAmount = _.round(
          _(profileRows)
            .map('ivt_amount')
            .sum(),
        );
        const siteMainName = _.get(_.head(profileRows), 'm_name', '');
        const siteName = `${totalAmount}kW급 테스트배드 (${siteMainName})`;
        return { siteid: strMainSeq, name: siteName };
      });

    _.set(req, 'locals.siteList', siteList);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    // BU.CLI(req.user);

    const user = _.get(req, 'user', {});

    // 지점 Id를 불러옴

    // BU.CLIN(req.locals);
    res.render('./inverter/inverter', req.locals);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/ess',
  asyncHandler(async (req, res) => {
    console.log(global.app.get('dbInfo'));
    return res.render('./templates/ESS/index.ejs', req.locals);
  }),
);

module.exports = router;

// router.get('/intersection', (req, res) => {
//   const grade = _.get(req, 'user.grade');
//   switch (grade) {
//     case 'admin':
//       router.use('/admin', admin);
//       res.redirect('/admin');
//       break;
//     case 'manager':
//       router.use('/manager', manager);
//       res.redirect('/manager');
//       break;
//     default:
//       break;
//   }
// });
