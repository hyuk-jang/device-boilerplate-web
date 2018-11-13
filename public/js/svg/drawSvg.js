/** @type {{nodeId: string, nodeName: '', text: textElement}[]} */
const svgNodeTextList = [];

/**
 * @param {string} documentId
 * @param {string=} bgImgUrl // 배경 이미지 url
 * @param {string=} title // 제목
 */
function drawSvgCanvas(documentId, bgImgUrl, title) {
  /** @type {mDeviceMap} */
  const realMap = map;

  // canvas 생성
  const { width: canvasWidth, height: canvasHeight } = realMap.drawInfo.frame.mapSize;
  const canvas = SVG(documentId).size(canvasWidth, canvasHeight);
  canvas.attr({ id: 'canvasId' });

  // 배경 이미지 지정
  const img = canvas.image(bgImgUrl, canvasWidth, canvasHeight);
  img.move(0, 0);

  // 제목 style 적용
  setTitle(canvas, title, [50, 450], '#ececec', 50);

  // Place 그리기
  realMap.drawInfo.positionInfo.svgPlaceList.forEach(svgPlaceInfo => {
    svgPlaceInfo.defList.forEach(defInfo => {
      /** @type {mSvgModelResource} */
      const resourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
        id: defInfo.resourceId,
      });
      if (_.isUndefined(resourceInfo)) return false;

      drawSvg(canvas, resourceInfo.type, defInfo.point, resourceInfo.elementDrawInfo, defInfo.id);
      writeSvgText(canvas, defInfo, resourceInfo);
    });
  });

  // node 그리기
  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    svgNodeInfo.defList.forEach(defInfo => {
      /** @type {mSvgModelResource} */
      const resourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
        id: defInfo.resourceId,
      });
      if (_.isUndefined(resourceInfo)) return false;

      drawSvg(canvas, resourceInfo.type, defInfo.point, resourceInfo.elementDrawInfo, defInfo.id);
      writeSvgText(canvas, defInfo, resourceInfo);
    });
  });
}

/**
 * @param {string} nDefId
 * @param {number|string} data 데이터 값
 * @param {string=} updateTime 갱신 시간
 * @param {string=} currentTime 현재시간
 */
function showDataValue(nDefId, data, currentTime, updateTime) {
  if (_.isUndefined(data)) data = 'no-data';
  /** @type {mDeviceMap} */
  const realMap = map;
  let nodeBgColor;

  // 현재시간, 갱신시간
  currentTime ? setTimeData('CT_001', updateTime) : '';
  updateTime ? setTimeData('UT_001', updateTime) : '';

  const foundCanvas = _.find(svgNodeTextList, { id: nDefId });
  if (_.isUndefined(foundCanvas)) return false;

  const dataUnit = getDataUnitByNdId(nDefId);
  foundCanvas.text.node.innerHTML = `<tspan class="data" style="font-size: 20pt;  stroke-width: 0.2" dx="1.1%" dy="0.9%">${data}</tspan><tspan style="font-size: 20pt; stroke-width: 0.2">${dataUnit}</tspan>`;

  // 받아온 id 값으로  color 값 찾기
  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    const founddefInfo = _.find(svgNodeInfo.defList, { id: nDefId });
    if (_.isUndefined(founddefInfo)) return false;

    const foundSvgModelResourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
      id: founddefInfo.resourceId,
    });
    nodeBgColor = foundSvgModelResourceInfo.elementDrawInfo.color;
  });

  // 받아온 id 값이 sensor인지 체크  0: 장치, 1: 센서, -1: 미분류
  const foundSvgNodeInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(nDefId),
  );
  if (_.isUndefined(foundSvgNodeInfo)) return false;

  // 받아온 value 값을 체크
  if (foundSvgNodeInfo.is_sensor === 0) {
    const falseValueList = ['CLOSE', 'CLOSING', 'OFF', 0, '0'];
    const trueValueList = ['OPEN', 'OPENING', 'ON', 1, '1'];

    const falseValueCheck = _.includes(falseValueList, data.toUpperCase());
    const trueValueCheck = _.includes(trueValueList, data.toUpperCase());

    const getSvgElement = SVG.get(nDefId);
    if (falseValueCheck === true && trueValueCheck === false) {
      getSvgElement.attr({ fill: nodeBgColor[0] });
    } else if (falseValueCheck === false && trueValueCheck === true) {
      getSvgElement.attr({ fill: nodeBgColor[1] });
    } else {
      getSvgElement.attr({ fill: nodeBgColor[2] });
    }
  }
}

/**
 * 텍스트 그리기
 * @param {SVG} canvas
 * @param {defInfo} defInfo 장치, 노드의  id, resourceId, point[] 정보
 * @param {mSvgModelResource} resourceInfo 장치, 노드의 resource id, type, elemetDrawInfo[width,height,radius,...] 정보
 */
function writeSvgText(canvas, defInfo, resourceInfo) {
  /** @type {mDeviceMap} */
  const realMap = map;

  let [textX, textY, textSize, textColor, leading] = [0, 0, 10, '#fdfe02', '1em'];
  const { width, height, radius } = resourceInfo.elementDrawInfo;
  const [x1, y1, x2, y2] = defInfo.point;
  let anchor = 'middle';

  // svgPositionList를 검색하여 장치인지 센서인지 정의
  let foundSvgInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(defInfo.id),
  );
  if (_.isUndefined(foundSvgInfo)) {
    foundSvgInfo = _.find(realMap.drawInfo.positionInfo.svgPlaceList, svgNodeInfo =>
      _.map(svgNodeInfo.defList, 'id').includes(defInfo.id),
    );
  }

  // 제외목록 서칭
  const IsCheckedExclusionText = checkIsExclusionText(defInfo.id);
  if (IsCheckedExclusionText === false) {
    // 사각형, 패턴 형식
    if (resourceInfo.type === 'rect' || resourceInfo.type === 'pattern') {
      textX = x1 + width / 2;
      textY = y1 + height / 2;
      // 노드중 sensor style 지정
      if (foundSvgInfo.is_sensor === 1) {
        textColor = 'black';
        anchor = 'end';
        textX = x1 + width - 25;
      }
      // 장소 text style 지정
      if (_.isString(foundSvgInfo.placeId)) {
        textSize = 25;
        leading = '0.7em';
        textX = x1 + 35;
        anchor = 'start';
        textColor = '#ececec';
      }
      // 줄 형식
    } else if (resourceInfo.type === 'line') {
      if (x1 === x2) {
        textX = x1;
        textY = y1 - (y1 - y2) / 2;
      } else {
        textX = x1 + (x2 - x1) / 2;
        textY = y1;
      }
      // 원
    } else if (resourceInfo.type === 'circle') {
      textX = x1 + radius / 2;
      textY = y1 + radius / 2;
      // 마름모
    } else if (resourceInfo.type === 'polygon') {
      textX = x1 + width;
      textY = y1 + height;
    }

    // defInfo.name: 한글, defInfo.id: 영문
    const text = canvas.text(defInfo.name);
    text
      .move(textX, textY)
      .font({
        fill: textColor,
        size: textSize,
        anchor,
        leading,
        weight: 'bold',
      })
      // text 커서 모양 설정
      .attr({
        'pointer-events': 'none',
      });

    // 그려진 node에 해당하는 id, text 정보 수집
    const svgId = defInfo.id;
    const svgNode = {
      id: svgId,
      name: defInfo.name,
      textX,
      textY,
      text,
    };
    svgNodeTextList.push(svgNode);
  } else {
    return false;
  }
}

/**
 * text를 제외할 요소 찾기. 반환값이  true: 제외
 * @param {string} defId
 */
function checkIsExclusionText(defId) {
  /** @type {mDeviceMap} */
  const realMap = map;

  let isChecked;

  realMap.drawInfo.positionInfo.svgPlaceList.forEach(svgPlaceInfo => {
    /** @type {defInfo} */
    const foundIt = _.find(svgPlaceInfo.defList, { id: defId });
    if (_.isObject(foundIt)) {
      isChecked = _.isMatch(realMap.realtionInfo.nameExclusionList, svgPlaceInfo.placeId);
    }
  });
  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    /** @type {defInfo} */
    const foundIt = _.find(svgNodeInfo.defList, { id: defId });
    if (_.isObject(foundIt)) {
      isChecked = _.isMatch(realMap.realtionInfo.nameExclusionList, svgNodeInfo.nodeDefId);
    }
  });

  return isChecked;
}

/**
 * view에서 데이터를 입력하기위한 이벤트 함수
 * @param {socekt} socket
 */
function InsertDialogValue(socket) {
  /** @type {mDeviceMap} */
  const realMap = map;

  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    svgNodeInfo.defList.forEach(defInfo => {
      const getSvgElement = $(`#${defInfo.id}`);
      getSvgElement.on('click touchstart', e => {
        let controlValue;

        // 장치 or 센서 구분  1: 센서, 0: 장치, -1: 미분류
        const foundSvgNodeInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, info =>
          _.map(info.defList, 'id').includes(defInfo.id),
        );
        if (_.isUndefined(foundSvgNodeInfo)) return false;

        // ' $.confirm ' : jquery dailog
        if (foundSvgNodeInfo.is_sensor === 1) {
          $.confirm({
            title: '',
            content:
              '' +
              '<form action="" class="formName">' +
              '<div class="form-group">' +
              `'${defInfo.name}' 의 값을 입력하세요.` +
              '<input type="text" placeholder="here" class="name form-control" required />' +
              '</div>' +
              '</form>',
            buttons: {
              formSubmit: {
                text: 'OK',
                btnClass: 'btn-blue',
                action() {
                  controlValue = this.$content.find('.name').val();
                  if (_.isUndefined(controlValue)) return false;
                },
              },
              cancel() {
                // close
              },
            },
          });
        } else {
          $.confirm({
            title: '',
            content: `'${defInfo.name}' 의 상태를 변경합니다.`,
            buttons: {
              confirm: {
                text: 'OPEN',
                action() {
                  controlValue = 'open';
                },
              },
              somethingElse: {
                text: 'CLOSE',
                action() {
                  controlValue = 'close';
                },
              },
              cancel: {
                text: 'CANCEL',
                btnClass: 'btn-blue',
              },
            },
          });
        }
        const falseValueList = ['CLOSE', 'CLOSING', 'OFF', 0, '0'];
        const trueValueList = ['OPEN', 'OPENING', 'ON', 1, '1'];

        if (controlValue != null) {
          const falseValueCheck = _.includes(falseValueList, controlValue.toUpperCase());
          const trueValueCheck = _.includes(trueValueList, controlValue.toUpperCase());

          if (falseValueCheck === true && trueValueCheck === false) {
            controlValue = 0;
          } else if (falseValueCheck === false && trueValueCheck === true) {
            controlValue = 1;
          } else {
            controlValue = 3;
          }

          const requestMsg = {
            commandId: 'SINGLE',
            contents: {
              requestCommandType: 'CONTROL',
              nodeId: defInfo.id,
              controlValue,
              rank: 2,
            },
          };
          console.log(requestMsg);
          socket.emit('executeCommand', requestMsg);
        }
      });
    });
  });
}

/**
 *
 * @param {SVG} canvas
 * @param {string} svgDrawType rect, polygon, circle, line ...
 * @param {Object} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} defId 그려지는 svg 도형에 주어줄 장소 또는 노드의 defInfo.id 값
 */
function drawSvg(canvas, svgDrawType, point, elementDrawInfo, defId) {
  switch (svgDrawType.toString()) {
    case 'rect':
      drawSvgRect(canvas, point, elementDrawInfo, defId);
      break;
    case 'line':
      drawSvgLine(canvas, point, elementDrawInfo, defId);
      break;
    case 'circle':
      drawSvgCircle(canvas, point, elementDrawInfo, defId);
      break;
    case 'polygon':
      drawingSvgPolygon(canvas, point, elementDrawInfo, defId);
      break;
    case 'pattern':
      drawSvgPattern(canvas, point, elementDrawInfo, defId);
      break;
    default:
      break;
  }
}

/**
 *
 * @param {SVG} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color, opactiy}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgRect(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;

  const { width, height, radius, opacity } = elementDrawInfo;
  let { color } = elementDrawInfo;

  if (_.isUndefined(radius)) return 1;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];
  const model = canvas
    .rect(width, height)
    .fill(color[0])
    .move(x, y)
    .radius(radius)
    .attr({
      id,
      radius,
      opacity,
    });
  drawSvgShadow(model, id);
}

/**
 *
 * @param {SVG} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgLine(canvas, point, elementDrawInfo, id) {
  const [x1, y1, x2, y2] = point;
  let { width, color } = elementDrawInfo;
  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  canvas
    .line(x1, y1, x2, y2)
    .stroke({ color: color[0], width })
    .attr({
      id,
    });
}

/**
 *
 * @param {SVG} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgCircle(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  let { radius, color } = elementDrawInfo;
  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  const model = canvas
    .circle(radius)
    .fill(color[0])
    .move(x, y)
    .stroke({ width: 0.5 })
    .attr({
      id: id,
    });
  drawSvgShadow(model, id);
}

/**
 *
 * @param {SVG} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawingSvgPolygon(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  let { width, height, color } = elementDrawInfo;
  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  const model = canvas.polyline(
    `${width},${0} ${width * 2},${height} ${width},${height * 2} ${0},${height}`,
  );
  model
    .fill(color[0])
    .move(x, y)
    .stroke({ width: 0.5 })
    .attr({
      id,
    });
  drawSvgShadow(model, id);
}

/**
 *
 * @param {SVG} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id값
 */
function drawSvgPattern(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  let { width, height, color } = elementDrawInfo;
  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  // 그림자를 적용하기위한 가려진 사각형 그리기.
  const model = canvas.rect(width, height);
  model.move(x, y).stroke({ color: 'black' });

  drawSvgShadow(model, id);

  // pattern 안의 작은 사각형의 크기
  const patternSize = 21;
  const pattern = canvas.pattern(patternSize, patternSize, add => {
    add.rect(patternSize, patternSize).fill('white');
    add
      .rect(patternSize, patternSize)
      .move(0.4, 0.4)
      .fill(color[0])
      .radius(3.5);
  });
  canvas
    .rect(width, height)
    .move(x, y)
    .fill(pattern)
    .attr({
      id,
    });
}

/**
 * 그림자
 * @param {SVG} model 그려질 장소.
 * @param {string} defId 장소와 노드를 구분하기 위한 장소 또는 노드의 defId 값
 */
function drawSvgShadow(model, defId) {
  const isSensor = getIsSensorByNdId(defId);
  if (_.isUndefined(isSensor)) {
    model.filter(add => {
      const blur = add
        .offset(7, 7)
        .in(add.sourceAlpha)
        .gaussianBlur(4);

      add.blend(add.source, blur);
    });
  } else {
    model.filter(add => {
      const blur = add
        .offset(0, 5)
        .in(add.sourceAlpha)
        .gaussianBlur(4);
      add.blend(add.source, blur);
    });
  }
}

/**
 * id에 대한 is_sensor 값을 찾아줌
 * @param {string} nDefId
 */
function getIsSensorByNdId(nDefId) {
  /** @type {mDeviceMap} */
  const realMap = map;

  const foundIsSensor = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(nDefId),
  );
  if (_.isUndefined(foundIsSensor)) return undefined;

  return foundIsSensor.is_sensor;
}

/**
 * 데이터 단위 찾기
 * @param {string} nDefId 단위를 가져올  nodeDefInfoId
 */
function getDataUnitByNdId(nDefId) {
  /** @type {mDeviceMap} */
  const realMap = map;

  const foundUnit = _.find(realMap.setInfo.nodeStructureList, nodeStructureInfo =>
    _.map(nodeStructureInfo.defList, 'target_prefix').includes(_.replace(nDefId, /[_\d]/g, '')),
  );

  return foundUnit.data_unit;
}

/**
 * view에 시간 표시
 * @param {string} nDefId 장소 id
 * @param {string} time 시간
 */
function setTimeData(nDefId, time) {
  const foundCanvas = _.find(svgNodeTextList, { id: nDefId });
  if (_.isUndefined(foundCanvas)) return false;

  foundCanvas.text.node.innerHTML = `<tspan class="data" style="fill: #dfdfdf;  font-size: 20pt;  stroke-width: 0.2" dx="1.1%" dy="0.9%">${time} </tspan>`;
}

/**
 * 제목 그리기
 * @param {*} canvas
 * @param {string} title
 * @param {number[]} point
 * @param {string=} fill
 * @param {number=} size
 */
function setTitle(canvas, title, point, fill, size) {
  const [x, y] = point;
  canvas
    .text(title)
    .move(x, y)
    .font({
      fill,
      size,
      weight: 'bold',
    });
}

/**
 * @typedef {Object} svgNodeStorageInfo
 * @property {string} id
 * @property {string} resourceId
 * @property {number[]} point
 * @property {number} data
 */

/**
 * @typedef {Object} detailNodeObjInfo
 * @property {string} id
 * @property {string} resourceId
 * @property {number[]} point
 * @property {number} data
 */
