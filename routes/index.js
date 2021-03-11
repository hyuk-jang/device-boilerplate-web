const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const admin = require('./admin/users');
// const manager = require('./manager/users');
// const owner = require('./owner/users');
// const guest = require('./guest/users');
const users = require('./users');
const upsas = require('./upsas');

const accountGradeList = ['admin', 'manager', 'awaiter'];
const AWAITER = 'awaiter';
// const accountGradeRange = ['manager', 'owner', 'guest', 'awaiter'];

let selectedRouter;
switch (process.env.PJ_MAIN_ID) {
  case 'UPSAS':
    switch (process.env.PJ_SUB_ID) {
      case 'smRooftop':
        selectedRouter = users;
        break;
      default:
        selectedRouter = upsas;
        break;
    }
    break;
  case 'FP':
    selectedRouter = users;
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

  const isExclude = _.some(excludePathList, excludePath =>
    _.includes(req.path, excludePath),
  );

  // BU.CLI(req.path);
  if (_.includes(req.path, '/app')) {
    return next();
  }

  if (isExclude) {
    return false;
  }

  if (!req.user) {
    // BU.CLI('웹 자동 로그인');
    return res.redirect('/auth/login');
  }
  // }

  next();
});

router.get('/intersection', (req, res) => {
  const { grade, is_pw_renewal: isPwRenewal = 0 } = req.user;

  if (isPwRenewal === 1) {
    req.flash('modalMsg', '패스워드를 변경해주세요.');
  }

  // const grade = _.get(req, 'user.grade');

  // 사용자 권한 체크
  if (process.env.IS_CHECK_USER_GRADE !== '0') {
    // 설정 외 권한 발생 시
    if (!_.includes(accountGradeList, grade)) {
      return res.send(
        DU.locationAlertBack(
          '사용자 권한에 문제가 발생하였습니다. 관리자에게 연락하시기 바랍니다.',
          '/login',
        ),
      );
    }
  }

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
