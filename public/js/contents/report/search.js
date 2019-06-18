"use strict";

$('#searchType').on('change', function () {
  applySearchType($(this).val());
}); // 생육 환경, 인버터 클릭 시 페이지 이동

$('#subCategoryDom').children().each(function (index, dom) {
  $(dom).on('click', function () {
    location.href = "".concat(window.location.origin, "/").concat(naviId, "/").concat(siteId, "/").concat($(this).val());
  });
});
$('#downloadExcel').on('click', function (event) {
  var subCategoryId = document.querySelector('#subSelectBoxDom option:checked').value;
  subCategoryId = subCategoryId.trim();
  var searchInterval = document.querySelector('#searchInterval option:checked').value;
  var searchType = document.querySelector('#searchType option:checked').value;
  var strStartDateInputValue = document.getElementById('strStartDateInputValue').value;
  var strEndDateInputValue = '';

  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;

    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }
  }

  if (!_.includes(['min', 'min10', 'hour'], searchInterval)) {
    return alert('엑셀 Download는 1분, 10분, 1시간 단위 생성만 지원합니다.');
  }

  var dataParam = {
    searchInterval: searchInterval,
    searchType: searchType,
    strStartDateInputValue: strStartDateInputValue,
    strEndDateInputValue: strEndDateInputValue
  };
  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden');
  $.ajax({
    type: 'GET',
    url: "".concat(window.location.origin, "/").concat(naviId, "/").concat(siteId, "/").concat(subCategory, "/").concat(subCategoryId, "/") + 'excel',
    data: dataParam
  }).done(function (excelData) {
    $('#loader').addClass('hidden');
    $('#loader-ground').addClass('hidden'); // console.log(excelData);

    XLSX.writeFile(excelData.workBook, "".concat(excelData.fileName, ".xlsx"));
  }).fail(function (req, sts, err) {
    alert(err);
  });
});

function checkSelectBoxOption(selectBoxId, selectValue) {
  var $selectBoxOptions = $("#".concat(selectBoxId)).children();
  $selectBoxOptions.each(function (index, dom) {
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
  var checkedSearchType = value;
  var startDateDom = document.querySelector('#strStartDateInputValue');
  var endDateDom = document.querySelector('#strEndDateInputValue');
  var startDate = new Date(searchRange.strStartDateInputValue);
  var endDate = searchRange.strEndDateInputValue === '' || new Date(searchRange.strEndDateInputValue) === 'Invalid Date' ? startDate : new Date(searchRange.strEndDateInputValue);
  var viewMode = 0;
  var sliceEndIndex = 10;

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
} // 검색 클릭 시


function searchReport() {
  var subCategoryId = document.querySelector('#subSelectBoxDom option:checked').value;
  subCategoryId = subCategoryId.trim();
  var searchInterval = document.querySelector('#searchInterval option:checked').value;
  var searchType = document.querySelector('#searchType option:checked').value;
  var strStartDateInputValue = document.getElementById('strStartDateInputValue').value;
  var strEndDateInputValue = '';

  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;

    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }
  }

  var queryString = "searchType=".concat(searchType, "&searchInterval=").concat(searchInterval, "&strStartDateInputValue=").concat(strStartDateInputValue, "&strEndDateInputValue=").concat(strEndDateInputValue);
  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden'); // 사이트 변경 시

  location.href = "".concat(window.location.origin, "/").concat(naviId, "/").concat(siteId, "/").concat(subCategory, "/").concat(subCategoryId, "?").concat(queryString);
} // 검색 클릭 시


function searchTrend() {
  var searchInterval = document.querySelector('#searchInterval option:checked').value;
  var searchType = document.querySelector('#searchType option:checked').value;
  var strStartDateInputValue = document.getElementById('strStartDateInputValue').value;
  var strEndDateInputValue = '';

  if (searchType === 'range') {
    strEndDateInputValue = document.getElementById('strEndDateInputValue').value;

    if (strStartDateInputValue > strEndDateInputValue) {
      return alert('종료일이 시작일보다 빠를 수 없습니다.');
    }
  }

  var queryString = "searchType=".concat(searchType, "&searchInterval=").concat(searchInterval, "&strStartDateInputValue=").concat(strStartDateInputValue, "&strEndDateInputValue=").concat(strEndDateInputValue);
  $('#loader').removeClass('hidden');
  $('#loader-ground').removeClass('hidden'); // 사이트 변경 시

  location.href = "".concat(window.location.origin, "/").concat(naviId, "/").concat(siteId, "/").concat(subCategory, "?").concat(queryString);
}
