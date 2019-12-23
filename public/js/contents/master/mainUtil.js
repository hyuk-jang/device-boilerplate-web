'use strict';

/**
 *
 * @param {HTMLElement} domElement
 */
function writeDateText(domElement) {
  var today = new Date();
  var week = ['일', '월', '화', '수', '목', '금', '토']; // const foundDom = document.querySelector(domElement);
  // console.log(foundDom);

  domElement.innerHTML = ''
    .concat(today.getFullYear(), '.')
    .concat(today.getMonth() + 1, '.')
    .concat(today.getDate(), '(')
    .concat(week[today.getDay()], ')'); // domElement.innerHTML = today.getFullYear() + "." + (today.getMonth() + 1) + "." + today.getDate() + "(" + week[today.getDay()] + ")";
  // $(`#${domId}`).html(
  //   `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}(${week[today.getDay()]})`,
  // );
}
/**
 * 네비게이션 메뉴 선택 활성화. 0~
 * @param {HTMLElement} parentDom
 * @param {number} selectedIndex
 * @param {string} className
 */

function matchingMenu(parentDom, selectedIndex, className) {
  selectedIndex = Number(selectedIndex); // console.log(selectedIndex);

  _.forEach(parentDom.children, function(child, index) {
    if (selectedIndex === index) {
      child.classList.add(className);
    } else {
      child.classList.remove(className);
    }
  });
}
/**
 * 날짜 이미지 세팅. 0~7 값
 * @param {HTMLElement} domElement
 * @param {*} value
 */

function setWeatherCastImg(domElement) {
  var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  domElement.setAttribute('src', 'image/weather/weather_'.concat(value, '.png'));
}
/**
 * 날짜 이미지 세팅. 0~7 값
 * @param {HTMLElement} domElement
 * @param {*} value
 */

function setWeatherCastTemp(domElement) {
  var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '-';
  domElement.innerHTML = value;
}
/**
 * Dom 객체 자식을 순회하면서 Json 조건에 맞는 데이터를 찾아 일치하는 값을 설정
 * @param {HTMLElement} parentDom
 * @param {*} jsonData
 * @param {string=} setAttrName 설정할 어트리뷰트 이름,  default: inner
 * @param {string=} getAttrName 찾을 어트리뷰트 이름,  default: id
 */

function setDomElementValueWithJson(parentDom, jsonData) {
  var setAttrName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'innerHTML';
  var getAttrName = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'id';

  _.forEach(parentDom.children, function(child) {
    var attibuteValue = child.getAttribute(getAttrName); // 해당 Attribute Value와 Json Key가 일치하다면

    if (_.has(jsonData, attibuteValue)) {
      var selectedValue = _.get(jsonData, attibuteValue, '');

      switch (setAttrName) {
        case 'innerHTML':
          child.innerHTML = selectedValue;
          break;

        default:
          child.setAttribute(setAttrName, selectedValue);
          break;
      }
    } // 해당 Element의 자식이 존재한다면 재귀

    if (child.childElementCount) {
      setDomElementValueWithJson(child, jsonData, setAttrName, getAttrName);
    }
  });
}
/**
 *
 * @param {HTMLElement} dom
 * @param {number} viewMode
 */

function makeDatePicker(dom, viewMode) {
  viewMode = $.isNumeric(viewMode) ? viewMode : 0;
  var dateFormat = '';

  switch (viewMode) {
    case 0:
      dateFormat = 'yyyy-mm-dd';
      break;

    case 1:
      dateFormat = 'yyyy-mm';
      break;

    case 2:
      dateFormat = 'yyyy';
      break;

    default:
      break;
  }

  $(dom).datepicker('remove');
  $(dom).datepicker({
    format: dateFormat,
    language: 'kr',
    autoclose: 1,
    todayHighlight: 1,
    clearBtn: 1,
    minViewMode: viewMode, // mode: 0-일,1-월,2-년
  });
}
