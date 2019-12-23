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
   * @return {Promise.<MEMBER>} 회원정보가 정확하다면 반환. 아니라면 {} 반환
   */
  async getAuthMember(loginInfo) {
    /** @type {MEMBER} */
    const whereInfo = {
      user_id: loginInfo.userId,
      is_deleted: 0,
    };
    // ID와 삭제가 되지 않은 해당 ID를 찾음.
    const memberList = await this.getTable('MEMBER', whereInfo);
    // 매칭되는 회원이 없다면
    if (memberList.length === 0) {
      // return {};
      throw new Error(`We could not find a member that matches id: ${whereInfo.user_id}.`);
    }
    /** @type {MEMBER} */
    const memberInfo = _.head(memberList);

    // Hash 비밀번호의 동일함을 체크
    // const hashPw = await encryptPbkdf2(loginInfo.userId, memberInfo.pw_salt);
    const hashPw = await EU.encryptPbkdf2(loginInfo.password, memberInfo.pw_salt);
    if (_.isEqual(hashPw, memberInfo.pw_hash)) {
      return memberInfo;
    }
    // return {};
    throw new Error('Please confirm your membership information..');
  }
}

module.exports = BiAuth;

if (require !== undefined && require.main === module) {
  console.log('main');
}
