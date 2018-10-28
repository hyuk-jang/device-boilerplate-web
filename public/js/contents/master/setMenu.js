/**
 *
 * @param {HTMLElement} domElement
 */
function writeDateText(domElement) {
  const today = new Date();
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  // const foundDom = document.querySelector(domElement);
  // console.log(foundDom);
  domElement.innerHTML = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}(${
    week[today.getDay()]
  }`;
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
  selectedIndex = Number(selectedIndex);
  // console.log(selectedIndex);
  _.forEach(parentDom.children, (child, index) => {
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
function setWeatherCastImg(domElement, value = 0) {
  domElement.setAttribute('src', `image/weather/weather_${value}.png`);
}

/**
 * 날짜 이미지 세팅. 0~7 값
 * @param {HTMLElement} domElement
 * @param {*} value
 */
function setWeatherCastTemp(domElement, value = '-') {
  domElement.innerHTML = value;
}

/**
 *
 * @param {HTMLElement} domElement
 * @param {{siteid: string, name: string}[]} siteList
 * @param {string} siteId
 */
function setSiteList(domElement, siteList, siteId) {
  const siteOptionTemplate = _.template(
    '<option <%= isSelected %> value="<%= siteid %>"><%= name %></option>',
  );
  const optionList = siteList.map(siteInfo => {
    const { siteid, name } = siteInfo;
    let isSelected = '';
    if (siteId.toString() === siteid) {
      isSelected = 'selected';
    }
    return siteOptionTemplate({ siteid, name, isSelected });
  });
  domElement.innerHTML = optionList;
}
