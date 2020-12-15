const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');

const defaultDom = require('../../models/domMaker/defaultDom');

require('../../models/jsdoc/domGuide');

const accountGradeRange = ['admin', 'manager', 'awaiter'];
const PAGE_LIST_COUNT = 10; // 한 페이지당 목록을 보여줄 수

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

    // _.set(req, 'locals.user', req.user);
    _.set(req, 'locals.member', memberRow);
    // _.set(req, 'locals.memberIdx', memberIdx);

    res.render('./myPage/memberEdit', req.locals);
  }),
);

// FIXME: put Method로 변경 처리 필요
// UPDATE
router.post(
  ['/', '/:siteId/member', '/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    console.log('@@@@@@@');
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiAuth} */
    const biAuth = global.app.get('biAuth');

    const { memberIdx = req.user.member_seq } = req.params;

    const { password = '', name = '', nick_name = '', tel = '' } = req.body;

    // ID, 비밀번호, 닉네임, 휴대폰 정규식
    const nameReg = /^[가-힣]{2,20}$/;
    const nickNameReg = /^[a-zA-Z가-힣0-9]{2,20}$/;
    const pwReg = /^(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])(?=.*[0-9]).{8,16}$/;
    const cellPhoneReg = /^(?:(010-?\d{4})|(01[1|6|7|8|9]-?\d{3,4}))-?\d{4}$/;

    // ID or PW 정규식에 어긋나거나 Place가 존재하지 않을 경우 전송 데이터 이상
    const nameFlag = nameReg.test(name);
    const nickNameFlag = nickNameReg.test(nick_name);
    const pwFlag = password.length || pwReg.test(password);
    const telFlag = cellPhoneReg.test(tel);
    // BU.CLIS(idFlag, pwFlag, nickNameFlag, telFlag);
    const isPassFlag = nameFlag && nickNameFlag && pwFlag && telFlag;
    // BU.CLIS(placeSelList, place_seq)
    if (!isPassFlag) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다.'));
    }

    const memberPickList = ['name', 'nick_name', 'tel'];

    const memberInfo = _.pick(req.body, memberPickList);
    // 모든 데이터가 입력이 되었는지 확인
    const isOk = _.every(memberInfo, value => _.isString(value) && value.length);
    // 이상이 있을 경우 Back
    if (!isOk) {
      return res.send(DU.locationAlertBack('전송 데이터에 이상이 있습니다!'));
    }

    // FIXME: 갱신일은 둘다 현 시점으로 처리함. 회원가입 갱신 기능이 추가될 경우 수정 필요
    /** @type {MEMBER} */
    const newMemberInfo = {
      name,
      nick_name,
      tel,
      updatedate: new Date(),
    };

    // 패스워드를 갱신하였다면 갱신 요청 처리 flag 0 설정
    if (password.length) {
      newMemberInfo.is_pw_renewal = 0;
    }

    await biAuth.setMember(password, newMemberInfo);

    return res.send(DU.locationAlertGo('정상적으로 갱신되었습니다.', '/'));
  }),
);

module.exports = router;
