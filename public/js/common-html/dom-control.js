function changeCheckAll(obj) {
  const checked = obj.checked;
  const arrCheck = $("input[name='check']");
  console.log(arrCheck);
  _.each(arrCheck, check => {
    check.checked = checked;
  });
}

function searchPress(event, pathName) {
  if (event.keyCode == 13) {
    search(pathName);
  }
}

// 서버 검색
function search(pathName) {
  const search = $('#search').val();

  location.href = `${pathName}?search=${encodeURIComponent(search)}`;
}

// 서버 삭제
function deleteResource(pathName) {
  const arrCheck = $("input[name='check']:checked");
  if (arrCheck.length == 0) {
    alert('삭제할 대상을 하나 이상 선택하세요.');
    return;
  }

  if (confirm('정말 삭제하시겠습니까?')) {
    const ids = _.pluck(arrCheck, 'value');

    $.ajax({
      type: 'DELETE',
      url: `${pathName}/${ids}`,
    })
      .done(res => {
        // Check for a successful (blank) response
        location.href = pathName;
      })
      .fail((req, sts, err) => {
        alert(err);
      });
  }
}

function createResource(pathName) {
  location.href = `${pathName}/new`;
}

function listResource(pathName) {
  location.href = pathName;
}
