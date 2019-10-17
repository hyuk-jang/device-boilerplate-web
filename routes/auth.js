const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../models/templates/common.util');

// const SITE_HEADER = '';
const SITE_HEADER = 'auth/';

router.get('/', (req, res) => {
  res.send('default main');
});

router.get('/login', (req, res) => {
  const { projectName } = commonUtil.convertProjectSource(process.env.PJ_MAIN_ID);
  if (process.env.DEV_AUTO_AUTH === '1') {
    // BU.CLI('자동 로그인');
    // global.app.set('auth', true);
    if (!req.user) {
      // BU.CLI('poost!');
      request.post(
        {
          url: `http://localhost:${process.env.PJ_HTTP_PORT}/${SITE_HEADER}login`,
          headers: req.headers,
          form: {
            userid: process.env.DEV_USER_ID,
            password: process.env.DEV_USER_PW,
          },
        },
        (err, httpResponse, msg) => {
          res.redirect('/intersection');
        },
        // (err, httpResponse, msg) => res.redirect('/intersection'),
        // (err, httpResponse, msg) => res.redirect(`/${process.env.DEV_PAGE}`),
      );
    }
  } else {
    // BU.CLI('DEV_AUTO_AUTH false')
    return res.render(`./${SITE_HEADER}login.ejs`, { message: req.flash('error'), projectName });
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
    // BU.CLI(req.body);
    const { password = '', userid = '', name = '' } = _.pick(req.body, [
      'userid',
      'password',
      'name',
      'nickname',
    ]);

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
    // FIXME: main_seq 수정, grade 고정
    const newMemberInfo = { user_id: userid, name, main_seq: 1, grade: 'guest', is_deleted: 0 };

    await biAuth.setMember(password, newMemberInfo);

    return res.send(DU.locationAlertGo('가입이 완료되었습니다.', `/${SITE_HEADER}login`));
    // return res.redirect(`/${SITE_HEADER}login`);
  }),
);

// TODO: 아이디 체크
router.post(
  '/temp-join/id-check',
  asyncHandler(async (req, res) => {
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');
    const { userid } = req.body;

    /** @type {MEMBER} */
    const whereInfo = {
      user_id: userid,
      is_deleted: 0,
    };

    if (_.isEmpty(userid)) {
      return res.send('<p class="color_red">필수 정보입니다.</p>');
    }

    // 동일한 회원이 존재하는지 체크
    const memberInfo = await biAuth.getTable('MEMBER', whereInfo);
    if (!_.isEmpty(memberInfo))
      return res.send('<p class="color_red">이미 사용중인 아이디입니다.</p>');

    // id 정규식
    const idReg = /^[A-Za-z0-9]{4,12}$/;
    if (!idReg.test(userid))
      return res.send('<p class="color_red">4~12자의 영문, 숫자로만 사용 가능합니다.</p>');

    return res.send('<p class="color_green">사용 가능한 아이디 입니다.</p>');
  }),
);

module.exports = router;
