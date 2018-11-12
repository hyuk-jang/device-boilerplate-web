/** @type {{nodeId: string, nodeName: '', text: textElement}[]} */
const svgNodeTextList = [];

/**
 * @param {string} documentId
 * @param {string=} img
 */
function svgCanvas(documentId, image) {
  /** @type {mDeviceMap} */
  const realMap = map;

  // canvas 생성
  const { width: canvasWidth, height: canvasHeight } = realMap.drawInfo.frame.mapSize;
  const canvas = SVG(documentId).size(canvasWidth, canvasHeight);
  const img = canvas.image(image, canvasWidth, canvasHeight);
  img.move(0, 0);
  canvas.attr({ id: 'canvasId' });

  // Place 그리기
  realMap.drawInfo.positionInfo.svgPlaceList.forEach(svgPlaceInfo => {
    svgPlaceInfo.defList.forEach(defInfo => {
      /** @type {mSvgModelResource} */
      const resourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
        id: defInfo.resourceId,
      });
      if (_.isUndefined(resourceInfo)) return false;

      svgDrawing(
        canvas,
        resourceInfo.type,
        defInfo.point,
        resourceInfo.elementDrawInfo,
        defInfo.id,
      );
      writeText(canvas, defInfo, resourceInfo);
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

      svgDrawing(
        canvas,
        resourceInfo.type,
        defInfo.point,
        resourceInfo.elementDrawInfo,
        defInfo.id,
      );
      writeText(canvas, defInfo, resourceInfo);
    });
  });
}

/**
 * @param {string} nodeId
 * @param {*} svgValue
 */
function drawExistCanvasValue(nodeId, svgValue) {
  if (_.isUndefined(svgValue)) svgValue = 'no-data';
  /** @type {mDeviceMap} */
  const realMap = map;
  let foundColor;

  const foundCanvas = _.find(svgNodeTextList, { id: nodeId });
  if (_.isUndefined(foundCanvas)) return false;

  foundCanvas.text.node.innerHTML = `<tspan class="data" style="font-size: 20pt; stroke: #00c51a; stroke-width: 0.2" dx="1.1%" dy="0.5%">${svgValue}</tspan>`;
  // const getSvgElement = $(`#${nodeId}`);
  // const x1 = getSvgElement[0].x.animVal.value + getSvgElement[0].width.baseVal.value;
  // const textX1 = foundCanvas.textX + foundCanvas.text.node.textLength.baseVal.value;
  // let x;
  // if (textX1 > x1) {
  //   x = foundCanvas.text.node.attributes.x.value - (textX1 - x1);
  // } else {
  //   return false;
  // }
  // foundCanvas.text.node.innerHTML = `<tspan class="data" style="font-size: 20pt; stroke: #00c51a; stroke-width: 0.2" x="${x}" dx="1.1%" dy="0.9%">${svgValue}</tspan>`;

  // 받아온 id 값으로  color 값 찾기
  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    const founddefInfo = _.find(svgNodeInfo.defList, { id: nodeId });
    if (_.isUndefined(founddefInfo)) return false;

    const foundSvgModelResourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
      id: founddefInfo.resourceId,
    });
    foundColor = foundSvgModelResourceInfo.elementDrawInfo.color;
  });

  // 받아온 id 값이 sensor인지 체크  0: 장치, 1: 센서, -1: 미분류
  const foundSvgNodeInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(nodeId),
  );
  if (_.isUndefined(foundSvgNodeInfo)) return false;

  // 받아온 value 값을 체크
  if (foundSvgNodeInfo.is_sensor === 0) {
    const falseValueList = ['CLOSE', 'CLOSING', 'OFF', 0, '0'];
    const trueValueList = ['OPEN', 'OPENING', 'ON', 1, '1'];

    const falseValueCheck = _.includes(falseValueList, svgValue.toUpperCase());
    const trueValueCheck = _.includes(trueValueList, svgValue.toUpperCase());

    const getSvgElement = SVG.get(nodeId);
    if (falseValueCheck === true && trueValueCheck === false) {
      getSvgElement.attr({ fill: foundColor[0] });
    } else if (falseValueCheck === false && trueValueCheck === true) {
      getSvgElement.attr({ fill: foundColor[1] });
    } else {
      getSvgElement.attr({ fill: foundColor[2] });
    }
  }
}

/**
 * 텍스트 그리기
 * @param {*} canvas
 * @param {defInfo} defInfo 위치 정보 id, resourceId, point[]
 * @param {mSvgModelResource} resourceInfo 그려질 정보 id, type, elemetDrawInfo[width,height,radius,...]
 */
function writeText(canvas, defInfo, resourceInfo) {
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
  const writeTextBoolean = excludeText(defInfo.id);
  if (writeTextBoolean === true) {
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
        textSize = 17;
        leading = '0.8em';
      }
    } else if (resourceInfo.type === 'line') {
      if (x1 === x2) {
        textX = x1;
        textY = y1 - (y1 - y2) / 2;
      } else {
        textX = x1 + (x2 - x1) / 2;
        textY = y1;
      }
    } else if (resourceInfo.type === 'circle') {
      textX = x1 + radius / 2;
      textY = y1 + radius / 2;
    } else if (resourceInfo.type === 'polygon') {
      textX = x1 + width;
      textY = y1 + height;
    }

    // 한글 or 영문 선택
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
      // text 커서 무시
      .attr({
        'pointer-events': 'none',
      });

    // 그려진 node id, text 정보 수집
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
 * text를 제외할 요소 찾기 true: text표시 , false : text제외
 * @param {string} id
 */
function excludeText(id) {
  /** @type {mDeviceMap} */
  const realMap = map;

  let findExclusion;

  realMap.drawInfo.positionInfo.svgPlaceList.forEach(svgPlaceInfo => {
    /** @type {defInfo} */
    const foundIt = _.find(svgPlaceInfo.defList, { id });
    if (_.isObject(foundIt)) {
      findExclusion = _.indexOf(realMap.realtionInfo.nameExclusionList, svgPlaceInfo.placeId);
    }
  });
  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    /** @type {defInfo} */
    const foundIt = _.find(svgNodeInfo.defList, { id });
    if (_.isObject(foundIt)) {
      findExclusion = _.indexOf(realMap.realtionInfo.nameExclusionList, svgNodeInfo.nodeDefId);
    }
  });
  // -1 : 제외목록에서 찾았을 때, 없음을 나타낸다.
  if (findExclusion === -1) {
    return true;
  }
  return false;
}

/**
 * view에서 데이터를 입력하기위한 이벤트 함수
 */
function dataInstallEvent(socket) {
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
 * @param {*} canvas
 * @param {string} type rect, polygon, circle, line ...
 * @param {Object} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawing(canvas, type, point, elementDrawInfo, id) {
  switch (type.toString()) {
    case 'rect':
      svgDrawingRect(canvas, point, elementDrawInfo, id);
      break;
    case 'line':
      svgDrawingLine(canvas, point, elementDrawInfo, id);
      break;
    case 'circle':
      svgDrawingCircle(canvas, point, elementDrawInfo, id);
      break;
    case 'polygon':
      svgDrawingPolygon(canvas, point, elementDrawInfo, id);
      break;
    case 'pattern':
      svgDrawingPattern(canvas, point, elementDrawInfo, id);
      break;
    default:
      break;
  }
}

/**
 *
 * @param {*} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color, opactiy}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawingRect(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;

  let { width, height, color, opacity, radius } = elementDrawInfo;
  if (_.isUndefined(radius)) return 0;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];
  const model = canvas
    .rect(width, height)
    .fill(color[0])
    .move(x, y)
    .radius(radius)
    // .stroke({ width: 0.5 })
    .attr({
      id,
      opacity,
    });
  // svgDrawingShadow(model, id);
}

/**
 *
 * @param {*} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawingLine(canvas, point, elementDrawInfo, id) {
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
 * @param {*} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawingCircle(canvas, point, elementDrawInfo, id) {
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
      id,
    });
  svgDrawingShadow(model, id);
}

/**
 *
 * @param {*} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawingPolygon(canvas, point, elementDrawInfo, id) {
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
  svgDrawingShadow(model, id);
}

/**
 *
 * @param {*} canvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려진 obj의 이
 */
function svgDrawingPattern(canvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  let { width, height, color } = elementDrawInfo;
  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  // 그림자를 적용하기위한 가려진 사각형 그리기.
  const model = canvas.rect(width, height);
  model.move(x, y).stroke({ color: 'black' });
  svgDrawingShadow(model, id);

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
 *
 * @param {*} model 그려질 장소.
 */
function svgDrawingShadow(model, id) {
  const isSensor = foundIsSensor(id);
  if (_.isUndefined(isSensor)) {
    model.filter(add => {
      const blur = add
        .offset(4, 4)
        .in(add.sourceAlpha)
        .gaussianBlur(2.5);

      add.blend(add.source, blur);
    });
  } else {
    model.filter(add => {
      const blur = add
        .offset(0, 4)
        .in(add.sourceAlpha)
        .gaussianBlur(2);
      add.blend(add.source, blur);
    });
  }
}

/**
 *
 * @param {string} id
 */
function foundIsSensor(id) {
  /** @type {mDeviceMap} */
  const realMap = map;

  const foundIsSensor = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(id),
  );
  if (_.isUndefined(foundIsSensor)) return undefined;

  return foundIsSensor.is_sensor;
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
