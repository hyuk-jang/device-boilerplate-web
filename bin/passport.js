const _ = require('lodash');
const expressApp = require('express')();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { BU } = require('base-util-jh');

const PassportOneSession = require('./PassportOneSession');
const BiAuth = require('../models/templates/auth/BiAuth');
/**
 *
 * @param {expressApp} app
 * @param {dbInfo} dbInfo
 */
module.exports = (app, dbInfo) => {
  // BU.CLI(dbInfo);
  // var FacebookStrategy = require("passport-facebook").Strategy;
  const biAuth = new BiAuth(dbInfo);
  // passport 설정
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new PassportOneSession());
  app.use(passport.authenticate('passport-one-session-per-user'));

  const localStrategyInfo = {
    usernameField: 'userid',
    passwordField: 'password',
    session: true,
    passReqToCallback: false,
  };

  passport.use(
    new LocalStrategy(localStrategyInfo, (userId, password, done) => {
      // BU.CLIS(userId, password);
      const memberInfo = {
        userId,
        password,
      };

      biAuth
        .getAuthMember(memberInfo)
        .then(memberRow => done(null, memberRow))
        .catch(err => {
          // BU.CLI(err);
          const message =
            err instanceof RangeError ? err.message : '아이디와 비밀번호를 확인해주세요.';
          // 로그인 시도에 관한 오류일 경우
          done(null, false, { message });
        });
    }),
  );

  // Strategy 성공 시 호출됨
  passport.serializeUser((memberInfo, done) => {
    // BU.CLI('serializeUser', memberInfo);
    done(null, memberInfo.user_id); // 여기의 user가 deserializeUser의 첫 번째 매개변수로 이동
  });

  // 매개변수 user는 serializeUser의 done의 인자 user를 받은 것

  /**
   * 실제 서버로 들어오는 요청마다 세션 정보(serializeUser에서 저장됨)를 실제 DB의 데이터와 비교.
   * 해당하는 유저 정보가 있으면 done의 두 번째 인자를 req.user에 저장하고, 요청을 처리할 때 유저의 정보를 req.user를 통해서 넘겨줍니다
   */
  passport.deserializeUser(async (userId, done) => {
    // BU.CLI('deserializeUser', userId);
    try {
      /** @type {V_MEMBER} */
      const result = await biAuth.getTable('V_MEMBER', { user_id: userId });

      if (_.isEmpty(result)) {
        return done(null, false, { message: '아이디와 비밀번호를 확인해주세요.' });
      }

      const pickedUserInfo = _.pick(_.head(result), [
        'main_seq',
        'member_seq',
        'weather_location_seq',
        'user_id',
        'name',
        'map',
        'nick_name',
        'grade',
        'address',
        'tel',
        'main_uuid',
        'is_pw_renewal',
      ]);

      // BU.CLI('complete deserializeUser', pickedUserInfo);
      return done(null, pickedUserInfo); // 여기의 user가 req.user가 됨
    } catch (error) {
      done(error, false, { message: '아이디와 비밀번호를 확인해주세요.' });
    }
  });

  return passport;
};
