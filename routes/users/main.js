const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     BU.CLI('main Middle ware');
//     _.set(req, 'locals.menuNum', 1);

//     // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
//     next();
//   }),
// );

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    const user = _.get(req, 'user', {});
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    _.set(req, 'locals.menuNum', 1);

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable(
      'v_pw_profile',
      user.main_seq && { main_seq: user.main_seq },
      false,
    );
    req.locals.viewPowerProfileRows = viewPowerProfileRows;

    // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
    req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);

    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    BU.CLI(req.user);

    const user = _.get(req, 'user', {});

    // 지점 Id를 불러옴
    let { selectSiteId = req.user.main_seq } = req.query;
    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    selectSiteId = _.eq(selectSiteId, 'all') && null;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile', selectSiteId, false);

    BU.CLI(viewPowerProfileRows);

    // BU.CLI(global.app.get('dbInfo'));
    res.render('./main/index', { title: 'Express' });
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
