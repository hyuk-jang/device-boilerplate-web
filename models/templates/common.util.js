const _ = require('lodash');
const moment = require('moment');
const BU = require('base-util-jh').baseUtil;

/**
 *
 * @param {Requst} req
 */
function applyHasNumbericReqToNumber(req) {
  // req.params 데이터 중 숫자형으로 변환될 수 있는 데이터는 숫자형으로 삽입
  _.forEach(req.params, (v, k) => {
    BU.isNumberic(v) && _.set(req.params, k, Number(v));
  });

  // req.query 데이터 중 숫자형으로 변환될 수 있는 데이터는 숫자형으로 삽입
  _.forEach(req.query, (v, k) => {
    BU.isNumberic(v) && _.set(req.query, k, Number(v));
  });
}
exports.applyHasNumbericReqToNumber = applyHasNumbericReqToNumber;
