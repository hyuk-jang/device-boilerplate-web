function makeDatePicker(dom, viewMode) {
  viewMode = $.isNumeric(viewMode) ? viewMode : 0;

  let dateFormat = '';
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
    minViewMode: viewMode,
    // mode: 0-일,1-월,2-년
  });
}
