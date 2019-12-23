const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const { BU, DU } = require('base-util-jh');

const BiModule = require('../models/BiModule.js');
const webUtil = require('../models/web.util');

module.exports = app => {
  const initSetter = app.get('initSetter');
  const biModule = new BiModule(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }
      _.set(req, 'locals.menuNum', 2);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await biModule.getTable(
        'v_upsas_profile',
        { main_seq: user.main_seq },
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) =>
      // BU.CLI('structure', req.locals);

      res.render('./structure/diagram.html', req.locals),
    ),
  );

  router.use(
    asyncHandler(async (err, req, res) => {
      console.log('Err', err);
      res.status(500).send(err);
    }),
  );

  return router;
};
