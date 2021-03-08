const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../models/templates/common.util');

// const SITE_HEADER = '';
const SITE_HEADER = 'auth/';

router.get(
  [
    '/',
    '/:naviMenu',
    '/:naviMenu/:siteId',
    '/:naviMenu/:siteId/:subCategory',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    next();
  },
);

router.get('/', (req, res) => {
  res.send('default main');
});

router.get(
  '/join',
  asyncHandler(async (req, res) => {
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    /** @type {MAIN} */
    const whereInfo = {
      is_deleted: 0,
    };

    /** @type {MAIN} */
    const mainList = await biAuth.getTable('MAIN', whereInfo);
    const placeList = _.map(mainList, mainInfo => ({
      name: mainInfo.name,
      mainSeq: mainInfo.main_seq,
    }));
    // BU.CLI(placeList);

    _.set(req, 'locals.placeList', placeList);

    res.render(`./${SITE_HEADER}join.ejs`, req.locals);
  }),
);

router.get('/login', (req, res) => {
  /** @type {projectConfig} */
  const pConfig = global.projectConfig;

  const {
    viewInfo: { loginInfo },
  } = pConfig;

  if (process.env.IS_DEV_AUTO_AUTH === '1' && process.env.IS_USE_TLS === '0') {
    // BU.CLI('자동 로그인');
    // global.app.set('auth', true);
    if (!req.user) {
      // BU.CLI('poost!');
      const urlPort =
        process.env.IS_USE_PROXY === '1' ? '' : `:${process.env.PJ_HTTP_PORT}`;
      request.post(
        {
          url: `http://localhost${urlPort}/${SITE_HEADER}login`,
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
    // BU.CLI('DEV_AUTO_AUTH false', SITE_HEADER);
    return res.render(`./${SITE_HEADER}login.ejs`, {
      message: req.flash('error'),
      loginInfo,
    });
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

// TODO:
router.post(
  '/join',
  asyncHandler(async (req, res) => {
    // BU.CLIS('tempJoin', req.body, req.query, req.params);
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const {
      userid = '',
      password = '',
      name = '',
      nick_name = '',
      tel = '',
      place_seq = '',
    } = req.body;

    // ID, 비밀번호, 닉네임, 휴대폰 정규식
    const idReg = /^[a-z0-9]{4,12}$/;
    const nameReg = /^[가-힣]{2,20}$/;
    const nickNameReg = /^[a-zA-Z가-힣0-9]{2,20}$/;
    const pwReg = /^(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])(?=.*[0-9]).{8,16}$/;
    const cellPhoneReg = /^(?:(010-?\d{4})|(01[1|6|7|8|9]-?\d{3,4}))-?\d{4}$/;
    // 쓰이는 장소 목록
    const mainRows = await biAuth.getTable('MAIN');

    const mainSelList = _.map(mainRows, 'main_seq');

    // ID or PW 정규식에 어긋나거나 Place가 존재하지 않을 경우 전송 데이터 이상
    const idFlag = idReg.test(userid);
    const nameFlag = nameReg.test(name);
    const nickNameFlag = nickNameReg.test(nick_name);
    const pwFlag = pwReg.test(password);
    const telFlag = cellPhoneReg.test(tel);
    // BU.CLIS(idFlag, pwFlag, nickNameFlag, telFlag);
    const isPassFlag = idFlag && nameFlag && nickNameFlag && pwFlag && telFlag;
    // BU.CLIS(placeSelList, place_seq)
    if (!isPassFlag || !_.includes(mainSelList, place_seq)) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다.'));
    }

    const memberPickList = ['userid', 'password', 'name', 'nick_name', 'tel', 'place'];

    const memberInfo = _.pick(req.body, memberPickList);
    // 모든 데이터가 입력이 되었는지 확인
    const isOk = _.every(memberInfo, value => _.isString(value) && value.length);
    // 이상이 있을 경우 Back
    if (!isOk) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다!'));
    }

    /** @type {MEMBER} */
    const whereInfo = {
      user_id: userid,
      is_deleted: 0,
    };

    // 동일한 회원이 존재하는지 체크
    const memberRows = await biAuth.getTable('MEMBER', whereInfo);

    if (!_.isEmpty(memberRows)) {
      // return res.status(500).send(DU.locationAlertGo('다른 ID를 입력해주세요.', '/join'));
      return res.send(DU.locationAlertGo('이미 사용중인 아이디입니다..', '/auth/join'));
    }

    // FIXME: 갱신일은 둘다 현 시점으로 처리함. 회원가입 갱신 기능이 추가될 경우 수정 필요
    /** @type {MEMBER} */
    const newMemberInfo = {
      user_id: userid,
      name,
      nick_name,
      tel,
      main_seq: place_seq,
      is_deleted: 0,
      writedate: new Date(),
      updatedate: new Date(),
    };

    await biAuth.setMember(password, newMemberInfo);

    return res.send(DU.locationAlertGo('가입이 완료되었습니다.', '/login'));
  }),
);

router.post(
  '/temp-join',
  asyncHandler(async (req, res) => {
    // BU.CLIS('tempJoin', req.body, req.query, req.params);
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const { password = '', userid = '' } = _.pick(req.body, [
      'userid',
      'password',
      'nickname',
    ]);

    // 입력된 id와 pw 가 string이 아닐 경우
    if (userid.length === 0 || password.length === 0) {
      return res
        .status(500)
        .send(DU.locationAlertGo('입력한 정보를 확인해주세요.', '/login'));
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
      return res
        .status(500)
        .send(DU.locationAlertGo('다른 ID를 입력해주세요.', '/login'));
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
