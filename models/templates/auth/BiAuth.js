const _ = require('lodash');
// const mome = require('mometo');
const { BM } = require('base-model-jh');
const { BU, EU } = require('base-util-jh');

class BiAuth extends BM {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;
  }

  /**
   * 사용자 추가를 할 경우
   * @param {string} password 사용자의 진짜 PW
   * @param {MEMBER} memberInfo 저장할 Member
   */
  async setMember(password, memberInfo) {
    // 패스워드가 존재할 경우에만 암호화
    const salt = BU.genCryptoRandomByte(16);

    const hashPw = await EU.encryptPbkdf2(password, salt);

    if (hashPw instanceof Error) {
      throw new Error('Password hash failed.');
    }

    memberInfo.pw_salt = salt;
    memberInfo.pw_hash = hashPw;

    const resultQuery = await this.setTable('MEMBER', memberInfo);
    return resultQuery;
  }

  /**
   * 로그인 정보와 DB에 저장된 회원정보를 비교하여 pw를 검증
   * @param {{userId: string, password: string}} loginInfo
   */
  async isValidMember(loginInfo) {
    /** @type {MEMBER} */
    const whereInfo = {
      user_id: loginInfo.userId,
    };
    // ID와 삭제가 되지 않은 해당 ID를 찾음.
    /** @type {MEMBER} */
    const memberRow = await this.getTableRow('MEMBER', whereInfo);

    // 매칭되는 회원이 없다면
    if (_.isEmpty(memberRow)) {
      return false;
    }

    // Hash 비밀번호의 동일함을 체크
    const hashPw = await EU.encryptPbkdf2(loginInfo.password, memberRow.pw_salt);

    return _.isEqual(hashPw, memberRow.pw_hash);
  }

  /**
   * 로그인 정보와 DB에 저장된 회원정보를 비교하여 pw를 검증
   * @param {{userId: string, password: string}} loginInfo
   */
  async getAuthMember(loginInfo) {
    const LOGIN_FAIL_COUNT = 5;
    /** @type {MEMBER} */
    const whereInfo = {
      user_id: loginInfo.userId,
      // is_deleted: 0,
    };
    // ID와 삭제가 되지 않은 해당 ID를 찾음.
    /** @type {MEMBER} */
    const memberRow = await this.getTableRow('MEMBER', whereInfo);

    // 매칭되는 회원이 없다면
    if (_.isEmpty(memberRow)) {
      throw new Error(
        `We could not find a member that matches id: ${whereInfo.user_id}.`,
      );
    }

    // 삭제된 계정은 로그인 못함
    if (memberRow.is_deleted === 1) {
      throw new RangeError('해당 계정은 접근이 차단되었습니다. 관리자에게 문의하십시오.');
    }

    // 잠긴 계정은 로그인 못함
    if (memberRow.is_account_lock === 1) {
      throw new RangeError(
        '해당 계정은 로그인 시도 제한을 초과하였습니다. 관리자에게 문의하십시오.',
      );
    }

    // Hash 비밀번호의 동일함을 체크
    const hashPw = await EU.encryptPbkdf2(loginInfo.password, memberRow.pw_salt);
    // 로그인 성공
    if (_.isEqual(hashPw, memberRow.pw_hash)) {
      // 로그인 실패 횟수 초기화 및 계정 잠김 여부 초기화, 최근 로그인 날짜 업데이트
      await this.updateTable(
        'MEMBER',
        { member_seq: memberRow.member_seq },
        { login_fail_count: 0, is_account_lock: 0, lastest_login_date: new Date() },
      );
      // 승인 대기 시
      if (memberRow.grade === 'awaiter') {
        throw new RangeError('해당 계정은 관리자의 승인을 기다리고 있습니다.');
      }

      // 회원 정보 반환
      return memberRow;
    }
    // 회원 정보 Id는 동일하나 password가 다를 경우 로그인 시도 횟수 증가
    const loginFailCount = _.isNumber(memberRow.login_fail_count)
      ? memberRow.login_fail_count + 1
      : 1;

    // 로그인 재시도 횟수가 5회 이상일 경우 계정 잠김
    const isAccountLock = loginFailCount >= LOGIN_FAIL_COUNT ? 1 : 0;

    // 로그인 실패 횟수 반영
    await this.updateTable(
      'MEMBER',
      { member_seq: memberRow.member_seq },
      { login_fail_count: loginFailCount, is_account_lock: isAccountLock },
    );

    // 아직 계정이 잠긴 상태가 아닐 경우 남은 로그인 시도 횟수 출력 (그냥 재시도 횟수 출력 안함)
    // if (!isAccountLock) {
    //   throw new RangeError(`비밀번호 오류. 남은 재시도 횟수: ${LOGIN_FAIL_COUNT - loginFailCount}`);
    // }

    throw new Error('Please confirm your membership information..');
  }
}

module.exports = BiAuth;

if (require !== undefined && require.main === module) {
  console.log('main');
}
