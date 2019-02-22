const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const admin = require('./admin/users');
// const manager = require('./manager/users');
// const owner = require('./owner/users');
// const guest = require('./guest/users');
const users = require('./users');
const Ean = require('./Ean');

let selectedRouter;
switch (process.env.PJ_MAIN_ID) {
  case 'FP':
    selectedRouter = users;
    break;
  case 'Ean':
    selectedRouter = Ean;
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

  const excludePathList = ['/favicon'];

  const isExclue = _.some(excludePathList, excludePath => _.includes(req.path, excludePath));

  // BU.CLI(req.path);
  if (_.includes(req.path, '/app') || isExclue) {
    return next();
  }

  if (!req.user) {
    // BU.CLI('웹 자동 로그인');
    return res.redirect('/auth/login');
  }
  // }

  next();
});

router.get('/intersection', (req, res) => {
  const grade = _.get(req, 'user.grade');
  // BU.CLI(req.user);
  switch (grade) {
    // case 'admin':
    //   router.use('/admin', admin);
    //   res.redirect('/admin');
    //   break;
    default:
      router.use('/', selectedRouter);
      // _.isString(process.env.DEV_PAGE) && res.redirect(`/${process.env.DEV_PAGE}`);
      _.isString(process.env.DEV_PAGE)
        ? res.redirect(`/${process.env.DEV_PAGE}`)
        : res.redirect('/');
      break;
  }
});

module.exports = router;
