$('#searchType').on('change', function() {
  applySearchType($(this).val());
});

// 생육 환경, 인버터 클릭 시 페이지 이동
$('#subCategoryDom')
  .children()
  .each((index, dom) => {
    $(dom).on('click', function() {
      location.href = `${window.location.origin}/${naviId}/${siteId}/${$(this).val()}`;
    });
  });

$('#downloadExcel').on('click', event => {
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

  if (!_.includes(['min', 'min10', 'hour'], searchInterval)) {
    return alert('엑셀 Download는 1분, 10분, 1시간 단위 생성만 지원합니다.');
  }

  const dataParam = {
    searchInterval,
    searchType,
    strStartDateInputValue,
    strEndDateInputValue,
  };

  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden');

  $.ajax({
    type: 'GET',
    url: `${window.location.origin}/${naviId}/${siteId}/${subCategory}/${subCategoryId}/` + 'excel',
    data: dataParam,
  })
    .done(excelData => {
      $('#loader').addClass('hidden');
      $('#loader-ground').addClass('hidden');
      // console.log(excelData);
      XLSX.writeFile(excelData.workBook, `${excelData.fileName}.xlsx`);
    })
    .fail((req, sts, err) => {
      alert(err);
    });
});

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
    makeDatePicker(endDateDom, 0);
    endDateDom.value = endDate.toISOString().substring(0, sliceEndIndex);
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
  location.href = `${
    window.location.origin
  }/${naviId}/${siteId}/${subCategory}/${subCategoryId}?${queryString}`;
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
  location.href = `${window.location.origin}/${naviId}/${siteId}?${queryString}`;
}
