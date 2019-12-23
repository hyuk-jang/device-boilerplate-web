const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const passport = require('passport');
const request = require('request');
const { BU, DU, EU } = require('base-util-jh');

const BiAuth = require('../models/auth/BiAuth');

module.exports = app => {
  const initSetter = app.get('initSetter');
  const biAuth = new BiAuth(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (req.user) {
          return res.redirect('/main');
        }
      }

      next();
    }),
  );

  router.get('/login', (req, res) => {
    if (app.get('auth') === 'dev') {
      // app.set('auth', true);
      if (!req.user) {
        request.post(
          {
            url: `http://localhost:${process.env.WEB_UPSAS_PORT}/auth/login`,
            headers: req.headers,
            form: {
              userid: 'tester',
              password: 'smsoft',
            },
          },
          (err, httpResponse, msg) => res.redirect(`/${process.env.DEV_PAGE}`),
        );
      }
    } else {
      return res.render('./auth/login.html', { message: req.flash('error') });
    }
  });

  router.post(
    '/login',
    passport.authenticate('local', {
      successRedirect: '/main',
      failureRedirect: '/auth/login',
      failureFlash: true,
    }),
  );

  router.get('/logout', (req, res) => {
    req.logOut();

    req.session.save(err => {
      if (err) {
        console.log('logout error');
      }
      return res.redirect('/auth/login');
    });
  });

  router.post(
    '/temp-join',
    asyncHandler(async (req, res) => {
      const { main_seq, password, user_id } = _.pick(req.body, ['user_id', 'password', 'main_seq']);

      BU.CLI(user_id, password, main_seq);
      // 입력된 id와 pw 가 string이 아닐 경우
      if (_.isString(user_id) === false || _.isString(password) === false) {
        return res
          .status(500)
          .send(DU.locationAlertGo('입력한 정보를 확인해주세요.', '/auth/login'));
      }

      /** @type {MEMBER} */
      const whereInfo = {
        user_id,
        main_seq,
        is_deleted: 0,
      };

      // 동일한 회원이 존재하는지 체크
      const memberInfo = await biAuth.getTable('MEMBER', whereInfo);
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
      const newMemberInfo = {
        user_id,
        main_seq,
      };

      await biAuth.setMember(password, newMemberInfo);

      return res.redirect('/main');
    }),
  );

  router.use(
    asyncHandler(async (err, req, res) => {
      if (err instanceof Error) {
        console.trace(err);
        res.status(501).send(err);
      }
    }),
  );

  return router;
};
