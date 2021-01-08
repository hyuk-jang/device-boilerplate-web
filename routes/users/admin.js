const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU, EU } = require('base-util-jh');

const commonUtil = require('../../models/templates/common.util');

const defaultDom = require('../../models/domMaker/defaultDom');

require('../../models/jsdoc/domGuide');

const accountGradeList = ['all', 'admin', 'manager', 'awaiter'];
const accountGradeRange = ['admin', 'manager', 'awaiter'];
const accountSecessionList = ['all', 'ok', 'no'];
const accountLockList = ['all', 'ok', 'no'];
const PAGE_LIST_COUNT = 10; // 한 페이지당 목록을 보여줄 수

const DEFAULT_CATEGORY = 'member';
/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'member',
    btnName: '회원관리',
  },
  {
    subCategory: 'history',
    btnName: '회원수정이력',
  },
];

/** Middleware */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory', '/:siteId/:subCategory/:subCategoryId'],
  (req, res, next) => {
    if (req.user.grade !== 'admin') {
      return res.send(DU.locationAlertGo('잘못된 접근입니다.', '/main'));
    }

    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    next();
  },
);

/** 회원 정보 목록 */
router.get(
  ['/', '/:siteId', '/:siteId/member'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
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

    /** @type {MEMBER} */
    const memberWhere = {};

    // 회원 권한이 목록에 있을 경우
    if (_.includes(accountGradeList, accountGrade)) {
      switch (accountGrade) {
        case 'admin':
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

    res.render('./admin/memberList', req.locals);
  }),
);

// 회원 정보 표출
router.get(
  ['/:siteId/member/:memberIdx'],
  asyncHandler(async (req, res) => {
    const { memberIdx } = req.params;

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
    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    const { siteId, memberIdx } = req.params;
    const {
      grade = 'awaiter',
      is_deleted: isDeleted = 0,
      is_account_lock: isAccountLock = 0,
      is_pw_renewal: isPwRenewal = 0,
    } = req.body;

    let { password = '' } = req.body;

    const isValidMember = _.isNumber(memberIdx);
    const isValidGrade = _.includes(accountGradeRange, grade);
    const isValidDeleted = isDeleted === 0 || isDeleted === 1;
    const isValidLock = isAccountLock === 0 || isAccountLock === 1;
    const isValidPwRenewal = isPwRenewal === 0 || isPwRenewal === 1;

    const isValid = _.every([
      isValidMember,
      isValidGrade,
      isValidDeleted,
      isValidLock,
      isValidPwRenewal,
    ]);

    // 데이터에 이상이 있을 경우 알려주고 종료
    if (isValid === false) {
      return res.send(DU.locationAlertBack('데이터에 이상이 있습니다.'));
    }

    /** @type {MEMBER} */
    const memberInfo = {
      grade,
      is_deleted: isDeleted,
      is_account_lock: isAccountLock,
    };

    // 정보를 수정할 회원 정보를 불러옴
    /** @type {MEMBER} */
    const memberRow = await adminModel.getTableRow('MEMBER', { member_seq: memberIdx });
    /** @type {MEMBER} */
    const adminRow = await adminModel.getTableRow('MEMBER', {
      user_id: req.user.user_id,
    });

    // 회원 정보 수정 이력 테이블 스키마
    const schemaRows = await adminModel.getTableSchema(process.env.PJ_DB_DB, 'MEMBER');

    // 수정할려고 하는 회원이 없을 경우
    if (memberRow === undefined || adminRow === undefined) {
      return res.send(DU.locationAlertBack('데이터에 이상이 있습니다.'));
    }

    /** @type {MEMBER_EDIT_HISTORY[]} */
    const memberEditHistorys = [];
    // 회원 정보 수정 이력 Insert를 위함
    _.forEach(memberInfo, (value, column) => {
      // 데이터가 일치할 경우 업데이트 절 없음
      const isSameState = _.isEqual(value, memberRow[column]);

      if (isSameState === false) {
        const schemaRow = _.find(schemaRows, { COLUMN_NAME: column });

        memberEditHistorys.push({
          member_seq: memberRow.member_seq,
          editor_seq: adminRow.member_seq,
          edit_column_id: column,
          edit_column_name: _.get(schemaRow, 'COLUMN_COMMENT', ''),
          prev_value: memberRow[column],
          curr_value: value,
        });
      }
    });

    // 비밀번호를 초기화할 경우 랜덤 생성
    password = isPwRenewal === 1 ? Math.random().toString(36).slice(2) : password; // "uk02kso845o"

    // 비밀번호 초기화 여부
    const isChangePw = _.isString(password) && password.length;
    if (isChangePw) {
      // 비밀번호 정규식
      const pwReg = /^(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9])(?=.*[0-9]).{8,16}$/;
      // 비밀번호 유효성 체크
      if (isPwRenewal === 0 && pwReg.test(password) === false) {
        return res.send(DU.locationAlertBack('데이터에 이상이 있습니다.'));
      }
      const salt = BU.genCryptoRandomByte(16);
      const hashPw = await EU.encryptPbkdf2(password, salt);

      if (hashPw instanceof Error) {
        throw new Error('Password hash failed.');
      }
      const schemaRow = _.find(schemaRows, { COLUMN_NAME: 'pw_hash' });

      // 회원 비밀번호가 변경되었다면 회원 정보 변경 이력에 추가
      memberEditHistorys.push({
        member_seq: memberRow.member_seq,
        editor_seq: adminRow.member_seq,
        edit_column_id: 'pw_hash',
        edit_column_name: _.get(schemaRow, 'COLUMN_COMMENT', ''),
        prev_value: null,
        curr_value: null,
      });
      // 수정 비밀번호 입력
      memberInfo.pw_salt = salt;
      memberInfo.pw_hash = hashPw;

      // 관리자가 비밀번호를 바꾼 것이라면
      if (memberRow.user_id === req.user.user_id) {
        _.set(memberInfo, 'is_pw_renewal', 0);
      } else if (isPwRenewal) {
        // 패스워드를 갱신하였을 경우에만
        _.set(memberInfo, 'is_pw_renewal', 1);
      }
    } else if (memberEditHistorys.length === 0) {
      // 비밀번호를 초기화하지 않고 변경사항이 존재하지 않는다면 변경사항이 없는 것
      return res.send(DU.locationAlertBack('변경사항이 존재하지 않습니다.'));
    }
    // 계정 잠금 해제 일 경우
    isAccountLock === 0 && Object.assign(memberInfo, { login_fail_count: 0 });

    // 회원 정보 수정
    await adminModel.updateTable('MEMBER', { member_seq: memberIdx }, memberInfo);

    // 회원 정보 변경 이력 입력
    await adminModel.setTables('MEMBER_EDIT_HISTORY', memberEditHistorys, false);
    // 패스워드가 랜덤으로 변경되었다면 사용자에게 알려줌
    if (isPwRenewal) {
      return res.send(
        DU.locationAlertGo(
          `정상적으로 갱신되었습니다. 변경 PW: ${password}`,
          `/admin/${siteId}/member`,
        ),
      );
    }

    return res.send(
      DU.locationAlertGo('정상적으로 갱신되었습니다.', `/admin/${siteId}/member`),
    );
  }),
);

/** 회원 이력 수정 목록 */
router.get(
  ['/:siteId/history', '/:siteId/history/:memberIdx'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId },
    } = req.locals;

    // req.query 값 비구조화 할당
    const { page = 1 } = req.query;

    /** @type {AdminModel} */
    const adminModel = global.app.get('adminModel');

    // 레포트 데이터로 환산
    const { reportRows, totalCount } = await adminModel.getMemberEditHistoryReport({
      page,
      pageListCount: PAGE_LIST_COUNT,
    });

    _.set(req, 'locals.reportRows', reportRows);

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/admin/${siteId}/history`,
      _.omit(req.query, 'page'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    res.render('./admin/memberHistory', req.locals);
  }),
);
module.exports = router;
