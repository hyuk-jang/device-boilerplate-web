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
