const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');

const defaultDom = require('../../models/domMaker/defaultDom');

const DEFAULT_CATEGORY = 'member';
/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'member',
    btnName: '개인정보변경',
  },
];

/** Middleware */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory', '/:siteId/:subCategory/:subCategoryId'],
  (req, res, next) => {
    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    next();
  },
);

// 회원 정보 표출
router.get(
  ['/', '/:siteId', '/:siteId/member', '/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    /** @type {V_MEMBER} */
    const memberRow = await adminModel.getTableRow('V_MEMBER', {
      member_seq: req.user.member_seq,
    });

    _.set(req, 'locals.member', memberRow);

    res.render('./myPage/memberEdit', req.locals);
  }),
);

// FIXME: put Method로 변경 처리 필요
// UPDATE
router.post(
  ['/', '/:siteId/member', '/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const {
      password = '',
      currPassword = '',
      name = '',
      nick_name = '',
      tel = '',
    } = req.body;

    // ID, 비밀번호, 닉네임, 휴대폰 정규식
    const nameReg = /^[가-힣]{2,20}$/;
    const nickNameReg = /^[a-zA-Z가-힣0-9]{2,20}$/;
    const pwReg = /^(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])(?=.*[0-9]).{8,16}$/;
    const cellPhoneReg = /^(?:(010-?\d{4})|(01[1|6|7|8|9]-?\d{3,4}))-?\d{4}$/;

    // ID or PW 정규식에 어긋나거나 Place가 존재하지 않을 경우 전송 데이터 이상
    const nameFlag = nameReg.test(name);
    const nickNameFlag = nickNameReg.test(nick_name);
    const pwFlag = password.length === 0 || pwReg.test(password);
    const telFlag = cellPhoneReg.test(tel);

    const isPassFlag = nameFlag && nickNameFlag && pwFlag && telFlag;

    if (!isPassFlag) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다.'));
    }

    // 변경 비밀번호가 존재할 경우 기존 비밀번호 맞는지 확인
    if (password.length) {
      const isValidMember = await biAuth.isValidMember({
        userId: req.user.user_id,
        password:
          typeof currPassword === 'number' ? currPassword.toString() : currPassword,
      });

      if (isValidMember === false) {
        return res.send(DU.locationAlertBack('현재 비밀번호를 확인해주세요.'));
      }
      // 동일 비밀번호 변경 불가
      if (currPassword === password) {
        return res.send(
          DU.locationAlertBack('변경 비밀번호가 현재 비밀번호와 동일합니다.'),
        );
      }
    }

    const memberPickList = ['name', 'nick_name', 'tel'];
    // 반영할 멤버 정보
    const memberInfo = _.pick(req.body, memberPickList);

    // 모든 데이터가 입력이 되었는지 확인
    const isOk = _.every(memberInfo, value => _.isString(value) && value.length);
    // 이상이 있을 경우 Back
    if (!isOk) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다!'));
    }

    /** @type {MEMBER} */
    const newMemberInfo = {
      name,
      nick_name,
      tel,
    };

    // 패스워드를 갱신하였다면 갱신 요청 처리 flag 0 설정
    if (password.length) {
      const salt = BU.genCryptoRandomByte(16);
      const hashPw = await EU.encryptPbkdf2(password, salt);

      if (hashPw instanceof Error) {
        throw new Error('Password hash failed.');
      }

      newMemberInfo.is_pw_renewal = 0;
      // 수정 비밀번호 입력
      newMemberInfo.pw_salt = salt;
      newMemberInfo.pw_hash = hashPw;
    } else {
      const isNonUpdate = _.every(memberInfo, (value, key) =>
        _.isEqual(newMemberInfo[key], value),
      );

      if (isNonUpdate) {
        return res.send(DU.locationAlertBack('변경사항이 존재하지 않습니다.'));
      }
    }
    // 수정일 입력
    newMemberInfo.updatedate = new Date();

    // 회원 정보 수정
    await biAuth.updateTable(
      'MEMBER',
      { member_seq: req.user.member_seq },
      newMemberInfo,
    );

    return res.send(DU.locationAlertGo('정상적으로 갱신되었습니다.', '/'));
  }),
);

module.exports = router;
