const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');
const domMakerMain = require('../../models/domMaker/mainDom');

const defaultDom = require('../../models/domMaker/defaultDom');
const reportDom = require('../../models/domMaker/reportDom');

require('../../models/jsdoc/domGuide');

const accountGradeList = ['all', 'manager', 'owner', 'guest', 'awaiter'];
const accountGradeRange = ['manager', 'owner', 'guest', 'awaiter'];
const accountSecessionList = ['all', 'ok', 'no'];
const accountLockList = ['all', 'ok', 'no'];
const PAGE_LIST_COUNT = 10; // 한 페이지당 목록을 보여줄 수

router.get(['/', '/:siteId', '/:siteId/member'], (req, res, next) => {
  if (req.user.grade !== 'admin') {
    return res.send(DU.locationAlertGo('잘못된 접근입니다.', '/main'));
  }
  next();
});

router.get(
  ['/', '/:siteId', '/:siteId/member'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);
    commonUtil.applyHasNumbericReqToNumber(req);

    const {
      mainInfo: { siteId, mainWhere },
    } = req.locals;

    // req.query 값 비구조화 할당
    const {
      page = 1,
      accountGrade = 'all',
      accountSecession = 'all',
      accountLock = 'all',
    } = req.query;

    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    // BU.CLI(req.query);

    /** @type {MEMBER} */
    const memberWhere = {};

    // 회원 권한이 목록에 있을 경우
    if (_.includes(accountGradeList, accountGrade)) {
      switch (accountGrade) {
        case 'manager':
        case 'owner':
        case 'guest':
        case 'awaiter':
          _.assign(memberWhere, { grade: accountGrade });
          break;
        default:
          break;
      }
    }
    // 계정 삭제 여부
    if (_.includes(accountSecessionList, accountSecession)) {
      switch (accountSecession) {
        case 'ok':
          _.assign(memberWhere, { is_deleted: 1 });
          break;
        case 'no':
          _.assign(memberWhere, { is_deleted: 0 });
          break;
        default:
          break;
      }
    }
    // 계정 잠김 여부
    if (_.includes(accountLockList, accountLock)) {
      switch (accountLock) {
        case 'ok':
          _.assign(memberWhere, { is_account_lock: 1 });
          break;
        case 'no':
          _.assign(memberWhere, { is_account_lock: 0 });
          break;
        default:
          break;
      }
    }

    // BU.CLI(memberWhere);

    // 레포트 데이터로 환산
    const { reportRows, totalCount } = await adminModel.getMemberReport(
      {
        page,
        pageListCount: PAGE_LIST_COUNT,
      },
      memberWhere,
    );

    _.set(req, 'locals.reportRows', reportRows);

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/admin/${siteId}/member`,
      _.omit(req.query, 'page'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);
    // console.log(paginationInfo);

    res.render('./admin/memberList', req.locals);
  }),
);

// 회원 정보 표출
router.get(
  ['/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    const { memberIdx } = req.params;
    const { subCategory, subCategoryId } = req.locals.mainInfo;

    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    /** @type {V_MEMBER} */
    const memberRow = await adminModel.getTableRow('V_MEMBER', { member_seq: memberIdx });

    _.set(req, 'locals.user', req.user);
    _.set(req, 'locals.member', memberRow);
    _.set(req, 'locals.memberIdx', memberIdx);

    res.render('./admin/memberEdit', req.locals);
  }),
);

// FIXME: put Method로 변경 처리 필요
// UPDATE
router.post(
  ['/:siteId/member', '/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    const { siteId, memberIdx } = req.params;
    const {
      user_id,
      grade = 'awaiter',
      is_deleted = 0,
      is_account_lock = 0,
      password = '',
    } = req.body;

    const isValidMember = _.isNumber(memberIdx);
    const isValidGrade = _.includes(accountGradeRange, grade);
    const isValidDeleted = is_deleted === 0 || is_deleted === 1;
    const isValidLock = is_account_lock === 0 || is_account_lock === 1;

    // 데이터에 이상이 있을 경우 알려주고 종료
    if (!(isValidMember && isValidGrade && isValidDeleted && isValidLock)) {
      return res.send(DU.locationAlertBack('데이터에 이상이 있습니다.'));
    }

    /** @type {MEMBER} */
    const memberInfo = {
      grade,
      is_deleted,
      is_account_lock,
    };

    // 로그인한 사용자와 수정할려는 ID가 동일하고 비밀번호를 변경하고자 할 경우
    if (user_id === req.user.user_id && _.isString(password) && password.length) {
      // 비밀번호 정규식
      const pwReg = /^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,16}$/;
      // 비밀번호 유효성 체크
      if (!pwReg.test(password)) {
        return res.send(DU.locationAlertBack('데이터에 이상이 있습니다.'));
      }
      const salt = BU.genCryptoRandomByte(16);
      const hashPw = await EU.encryptPbkdf2(password, salt);

      if (hashPw instanceof Error) {
        throw new Error('Password hash failed.');
      }
      // 수정 비밀번호 입력
      memberInfo.pw_salt = salt;
      memberInfo.pw_hash = hashPw;
    }

    // 계정 잠금 해제 일 경우
    is_account_lock === 0 && Object.assign(memberInfo, { login_fail_count: 0 });

    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    await adminModel.updateTable('MEMBER', { member_seq: memberIdx }, memberInfo);

    return res.send(DU.locationAlertGo('정상적으로 갱신되었습니다.', `/admin/${siteId}/member`));
  }),
);

module.exports = router;
