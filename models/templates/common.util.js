const _ = require('lodash');
const BU = require('base-util-jh').baseUtil;

/**
 *
 * @param {string} projectMainId
 */
function convertProjectSource(projectMainId) {
  let projectName = '';
  let projectImg = '';

  switch (projectMainId) {
    case 'FP':
      projectImg = 'fp_logo.png';
      projectName = '농업병행 태양광발전 모니터링';
      break;
    case 'S2W':
      projectImg = 's2w_logo.png';
      projectName = '태양광 이모작 모니터링';
      break;
    default:
      break;
  }

  return { projectName, projectImg };
}
exports.convertProjectSource = convertProjectSource;

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
