const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const request = require('request');

const router = express.Router();

const { BU } = require('base-util-jh');

const users = require('./users');
const upsas = require('./upsas');

const SITE_HEADER = 'app/';

let selectedRouter;
switch (process.env.PJ_MAIN_ID) {
  case 'FP':
    selectedRouter = users;
    break;
  case 'UPSAS':
    selectedRouter = upsas;
    break;
  default:
    selectedRouter = users;
    break;
}

// server middleware
router.use((req, res, next) => {
  // BU.CLI('Main Middile Ware', req.user);
  // if (process.env.DEV_AUTO_AUTH !== '1') {
  // if (global.app.get('auth')) {
  // BU.CLI('App Router', req.user);
  if (!req.user) {
    if (process.env.DEV_AUTO_AUTH === '1') {
      BU.CLI('App 자동 로그인 요청');
      return request.post(
        {
          url: `http://localhost:${process.env.PJ_HTTP_PORT}/${SITE_HEADER}auth/login`,
          headers: req.headers,
          form: {
            userid: process.env.DEV_USER_ID,
            password: process.env.DEV_USER_PW,
          },
        },
        (err, httpResponse, msg) => res.redirect('/app/intersection'),
        // (err, httpResponse, msg) => {
        //   router.use('/', users);
        // },
        // (err, httpResponse, msg) => res.redirect(`/${process.env.DEV_PAGE}`),
      );
    }
    return res.status(401).send('Session Expired');
  }
  next();
});

router.get('/intersection', (req, res) => {
  BU.CLI('/app/intersection');
  const userInfo = _.get(req, 'user');
  // BU.CLI(req.user);
  switch (userInfo.grade) {
    default:
      router.use('/', selectedRouter);

      // _.isString(process.env.DEV_PAGE)
      //   ? res.redirect(`/${process.env.DEV_PAGE}`)
      //   : res.redirect('/app');
      BU.CLI(userInfo);
      res.json(userInfo);
      break;
  }
});

router.get('/authFail', (req, res) => {
  return res.status(401).send('인증 오류');
});

module.exports = router;
