const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

// const SITE_HEADER = '';
const SITE_HEADER = 'auth/';

router.get('/', (req, res) => {
  res.send('default main');
});

router.get('/login', (req, res) => {
  // BU.CLI('자동 로그인');
  // global.app.set('auth', true);
  if (!req.user) {
    request.post(
      {
        url: `http://localhost:${process.env.PJ_HTTP_PORT || 7500}/${SITE_HEADER}login`,
        headers: req.headers,
        form: {
          userid: process.env.DEV_USER_ID || 'admin',
          password: process.env.DEV_USER_PW || 'smsoftware',
        },
      },
      (err, httpResponse, msg) => {
        res.redirect('/intersection');
      },
      // (err, httpResponse, msg) => res.redirect('/intersection'),
      // (err, httpResponse, msg) => res.redirect(`/${process.env.DEV_PAGE}`),
    );
  }
});

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/intersection',
    failureRedirect: `./${SITE_HEADER}`,
    failureFlash: true,
  }),
);

router.get('/logout', (req, res) => {
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
    // BU.CLIS('tempJoin', req.body, req.query, req.params);
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const { password = '', userid = '' } = _.pick(req.body, ['userid', 'password', 'nickname']);

    // 입력된 id와 pw 가 string이 아닐 경우
    if (userid.length === 0 || password.length === 0) {
      return res.status(500).send(DU.locationAlertGo('입력한 정보를 확인해주세요.', '/login'));
    }

    /** @type {MEMBER} */
    const whereInfo = {
      user_id: userid,
      is_deleted: 0,
    };

    // 동일한 회원이 존재하는지 체크
    const memberInfo = await biAuth.getTable('MEMBER', whereInfo);
    // BU.CLI(memberInfo);
    if (!_.isEmpty(memberInfo)) {
      return res.status(500).send(DU.locationAlertGo('다른 ID를 입력해주세요.', '/login'));
    }

    const salt = BU.genCryptoRandomByte(16);

    // const encryptPbkdf2 = Promise.promisify(BU.encryptPbkdf2);
    const hashPw = await EU.encryptPbkdf2(password, salt);

    if (hashPw instanceof Error) {
      throw new Error('Password hash failed.');
    }

    /** @type {MEMBER} */
    const newMemberInfo = { user_id: userid };

    await biAuth.setMember(password, newMemberInfo);

    return res.redirect(`/${SITE_HEADER}login`);
  }),
);

module.exports = router;
