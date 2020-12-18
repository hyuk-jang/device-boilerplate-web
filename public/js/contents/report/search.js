$('#searchType').on('change', function () {
  applySearchType($(this).val());
});

const subCategoryElement = document.querySelector('#subCategoryDom');

if (subCategoryElement !== null) {
  const subCategoryDomLength = subCategoryElement.children.length;

  $('#subCategoryDom')
    .children()
    .each((index, dom) => {
      if (subCategoryDomLength > 1) {
        $(dom).on('click', function (e) {
          location.href = `${window.location.origin}/${naviId}/${siteId}/${$(
            this,
          ).val()}`;
        });
      } else {
        dom.setAttribute('style', 'pointer-events:none;');
      }
    });
}

function checkSelectBoxOption(selectBoxId, selectValue) {
  const $selectBoxOptions = $(`#${selectBoxId}`).children();
  $selectBoxOptions.each((index, dom) => {
    // dom.getAttribute('value')
    if (dom.getAttribute('value') === selectValue) {
      dom.selected = true;
    } else {
      dom.selected = false;
    }
  });
}

/**
 * 검색 기간 Radio 클릭 시 날짜 영역 설정
 * @param {Dom} input[name='searchType']
 * @return {void}
 */
function applySearchType(value) {
  const checkedSearchType = value;
  const startDateDom = document.querySelector('#strStartDateInputValue');
  const endDateDom = document.querySelector('#strEndDateInputValue');

  const startDate = new Date(searchRange.strStartDateInputValue);
  const endDate =
    searchRange.strEndDateInputValue === '' ||
    new Date(searchRange.strEndDateInputValue) === 'Invalid Date'
      ? startDate
      : new Date(searchRange.strEndDateInputValue);

  let viewMode = 0;
  let sliceEndIndex = 10;

  if (checkedSearchType === 'range') {
    $('#strEndDateInputValue').show();
    $('#between-start-end').show();
  } else {
    $('#strEndDateInputValue').hide();
    $('#between-start-end').hide();
  }

  if (checkedSearchType === 'years') {
    viewMode = 2;
    sliceEndIndex = 4;
  } else if (checkedSearchType === 'months') {
    viewMode = 1;
    sliceEndIndex = 7;
  } else if (checkedSearchType === 'days') {
    viewMode = 0;
    sliceEndIndex = 10;
  } else if (checkedSearchType === 'range') {
    endDateDom.value = endDate.toISOString().substring(0, sliceEndIndex);
    makeDatePicker(endDateDom, 0);
  } else {
    viewMode = 0;
    sliceEndIndex = 10;
  }
  startDateDom.value = startDate.toISOString().substring(0, sliceEndIndex);
  makeDatePicker(startDateDom, viewMode);
}

// 검색 클릭 시
function searchReport() {
  let subCategoryId = document.querySelector('#subSelectBoxDom option:checked').value;
  subCategoryId = subCategoryId.trim();
  const searchInterval = document.querySelector('#searchInterval option:checked').value;
  const searchType = document.querySelector('#searchType option:checked').value;
  const strStartDateInputValue = document.getElementById('strStartDateInputValue').value;
  let strEndDateInputValue = '';

  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;
    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }
  }

  const queryString = `searchType=${searchType}&searchInterval=${searchInterval}&strStartDateInputValue=${strStartDateInputValue}&strEndDateInputValue=${strEndDateInputValue}`;

  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden');

  // 사이트 변경 시
  location.href = `${window.location.origin}/${naviId}/${siteId}/${subCategory}/${subCategoryId}?${queryString}`;
}

// 검색 클릭 시
function searchTrend() {
  const searchInterval = document.querySelector('#searchInterval option:checked').value;
  const searchType = document.querySelector('#searchType option:checked').value;
  const strStartDateInputValue = document.getElementById('strStartDateInputValue').value;
  let strEndDateInputValue = '';

  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;
    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }
  }

  const queryString = `searchType=${searchType}&searchInterval=${searchInterval}&strStartDateInputValue=${strStartDateInputValue}&strEndDateInputValue=${strEndDateInputValue}`;

  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden');

  // 사이트 변경 시
  location.href = `${window.location.origin}/${naviId}/${siteId}/${subCategory}?${queryString}`;
}

// 검색 클릭 시 (공용)
function getSearchValue() {
  const searchInterval = document.querySelector('#searchInterval option:checked').value;
  const searchType = document.querySelector('#searchType option:checked').value;
  const strStartDateInputValue = document.getElementById('strStartDateInputValue').value;

  // 시작 시간이 공백일 경우
  if (!strStartDateInputValue.length) {
    return alert('시작 시간을 선택하세요.');
  }

  // 내일 일자 추출
  const tomorrowDay = moment().add(1, 'day').format('YYYY-MM-DD');

  // 시작 시간이 오늘을 넘어갔을 경우 검색 불가
  if (strStartDateInputValue >= tomorrowDay) {
    return alert('시작 시간을 확인해주세요.');
  }

  // 조회기간이 일일이지만 조회간격을 1달이라고 할 경우 오류
  if (searchType === 'days' && searchInterval === 'month') {
    return alert('조회기간이 "일일"이고 조회간격이 "1달"일 경우 검색할 수 없습니다.');
  }

  // 조회기간이 년간이고 조회간격을 1분이라고 할 경우 오류
  if (
    searchType === 'years' &&
    (searchInterval === 'min' || searchInterval === 'min10')
  ) {
    return alert(
      '조회기간이 "년간"일 경우 조회간격은 최소 "1시간" 이상으로 검색할 수 있습니다.',
    );
  }

  let strEndDateInputValue = '';
  // 조회기간이 기간 검색일 경우
  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;
    if (searchInterval === 'month') {
      return alert('기간선택에서는 조회간격을 1달로 설정할 수 없습니다.');
    }

    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }

    // 날짜 형식 Format 지정
    const mStartDate = moment(strStartDateInputValue, 'YYYY-MM-DD');
    const mEndDate = moment(strEndDateInputValue, 'YYYY-MM-DD');

    const rangeDiffDay = mEndDate.diff(mStartDate, 'days');

    // 기간 검색이 100일을 초과할 경우 1분단위로 검색할 수 없음
    if (rangeDiffDay > 100 && searchInterval === 'min') {
      return alert(
        '기간검색이 100일을 초과할 경우 조회간격을 "1분"으로 검색할 수 없습니다.',
      );
    }

    // 기간 검색이 300일을 초과할 경우 10분단위로 검색할 수 없음
    if (rangeDiffDay > 300 && (searchInterval === 'min' || searchInterval === 'min10')) {
      return alert(
        '기간검색이 300일을 초과할 경우 조회간격은 최소 "1시간" 이상으로 검색할 수 있습니다.',
      );
    }
  }

  return {
    searchInterval,
    searchType,
    strStartDateInputValue,
    strEndDateInputValue,
  };
}

function makeSearchQueryString(searchValue) {
  // 검색 객체가 없다면 빈 문자열 반환
  if (_.isEmpty(searchValue)) return '';

  const {
    searchType,
    searchInterval,
    strStartDateInputValue,
    strEndDateInputValue,
  } = searchValue;
  return `searchType=${searchType}&searchInterval=${searchInterval}&strStartDateInputValue=${strStartDateInputValue}&strEndDateInputValue=${strEndDateInputValue}`;
}
