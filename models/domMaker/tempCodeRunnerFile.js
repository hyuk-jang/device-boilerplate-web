const _ = require('lodash');
const { BU } = require('base-util-jh');

function toLocaleString(target, fixed) {
  if (_.isArray(target)) {
    return target.forEach(ele => toLocaleString(ele));
  }
  _.forEach(target, (value, key) => {
    // 만약 숫자라면
    console.log(value);
    if ((value !== 0 && _.isNumber(value)) || (BU.isNumberic(value) && !_.isEmpty(value))) {
      console.log('@@@', value);
      // 쉼표 기호 삽입
      let localeString = value.toLocaleString();
      // 소수점 이하가 존재하지 않는다면 소수점 삽입

      // 소수점 이하를 강제할 경우
      if (_.isNumber(fixed)) {
        const localeStringArr = localeString.split('.');
        // 1개라면 소수점 이하가 없는 것으로 판단
        if (localeStringArr.length === 1) {
          localeString = _.padEnd(localeString.concat('.'), localeString.length + 1 + fixed, '0');
        } else {
          localeString = `${_.head(localeStringArr)}.${_.padEnd(
            _.last(localeStringArr),
            fixed,
            '0',
          )}`;
        }
      }

      _.set(target, key, localeString);
    }
  });
}

const value = {
  xx: '',
  x: 0,
  y: 12345687,
  z: 123154.1,
  a: '1111',
  b: '11111.5',
  c: '11111.55555',
};

toLocaleString(value, 2);

console.log(value);
