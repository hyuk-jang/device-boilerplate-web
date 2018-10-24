const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const users = require('./users');

const webUtil = require('../../models/templates/web.util');

router.use('/main', main);
router.use('/users', users);

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    const user = _.get(req, 'user', {});
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    _.set(req, 'locals.menuNum', 1);

    // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
    const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
    req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);

    // BU.CLI(req.locals);
    next();
  }),
);

// router.use((req, res, next) => {
//   BU.CLI('hi');
//   // res.send('respond with a resource');
//   next();
// });

/* GET users listing. */
router.get('/', (req, res, next) => {
  BU.CLI('hi', req.locals);
  // res.send('respond with a resource');
  res.redirect('/main');
});

module.exports = router;
