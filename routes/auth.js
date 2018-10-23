const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

const BiAuth = require('../models/auth/BiAuth');

// const SITE_HEADER = '';
const SITE_HEADER = 'auth/';

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     BU.CLIN(req.user);
//     if (global.app.get('auth')) {
//       if (req.user) {
//         return res.redirect('/main');
//       }
//     }

//     next();
//   }),
// );

router.get('/auth', (req, res) => {
  console.dir(req.user);
  res.send(req.user);
});

router.get('/auth/login', (req, res) => {
  if (global.app.get('auth') === 'dev') {
    global.app.set('auth', true);
    if (!req.user) {
      request.post(
        {
          url: `http://localhost:${process.env.WEB_HTTP_PORT}/${SITE_HEADER}login`,
          headers: req.headers,
          form: {
            userid: 'tester',
            password: 'smsoftware',
          },
        },
        (err, httpResponse, msg) => res.redirect(`/${process.env.DEV_PAGE}`),
      );
    }
  } else {
    BU.CLI('???');
    BU.CLIN(req.user);
    return res.render(`./${SITE_HEADER}login.ejs`, { message: req.flash('error') });
  }
});

router.post(
  '/auth/login',
  passport.authenticate('local', {
    successRedirect: '/auth',
    failureRedirect: '/auth/login',
    failureFlash: true,
  }),
);

router.get('logout', (req, res) => {
  req.logOut();

  req.session.save(err => {
    if (err) {
      console.log('logout error');
    }
    return res.redirect(`/${SITE_HEADER}login`);
  });
});

router.post(
  '/temp-join',
  asyncHandler(async (req, res) => {
    BU.CLIS('tempJoin', req.body, req.query, req.params);
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const { password = '', user_id = '' } = _.pick(req.body, ['user_id', 'password', 'nickname']);

    // 입력된 id와 pw 가 string이 아닐 경우
    if (user_id.length === 0 || password.length === 0) {
      return res.status(500).send(DU.locationAlertGo('입력한 정보를 확인해주세요.', '/auth/login'));
    }

    /** @type {MEMBER} */
    const whereInfo = {
      user_id,
      is_deleted: 0,
    };

    // 동일한 회원이 존재하는지 체크
    const memberInfo = await biAuth.getTable('MEMBER', whereInfo);
    // BU.CLI(memberInfo);
    if (!_.isEmpty(memberInfo)) {
      return res.status(500).send(DU.locationAlertGo('다른 ID를 입력해주세요.', '/auth/login'));
    }

    const salt = BU.genCryptoRandomByte(16);

    // const encryptPbkdf2 = Promise.promisify(BU.encryptPbkdf2);
    const hashPw = await EU.encryptPbkdf2(password, salt);

    if (hashPw instanceof Error) {
      throw new Error('Password hash failed.');
    }

    /** @type {MEMBER} */
    const newMemberInfo = { user_id };

    await biAuth.setMember(password, newMemberInfo);

    return res.redirect(`/${SITE_HEADER}login`);
  }),
);

module.exports = router;
