const TRUE_DATA = '1';
const FALSE_DATA = '0';
const ERROR_DATA = '-1';

/**
 * 장치 상태에 따른 svg 장치색 변경
 * @param {string} nDefId
 * @param {number|string} data
 */
function changeNodeStatusColor(nDefId, data) {
  /** @type {mDeviceMap} */
  const realMap = map;
  let getNodeBgColor;

  realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
    const foundNodeDefInfo = _.find(svgNodeInfo.defList, { id: nDefId });
    if (_.isUndefined(foundNodeDefInfo)) return false;

    // 장소, 장비, 센서의 기본 색상을 찾기위한 그리기 정보 찾기
    const foundSvgModelResourceInfo = _.find(realMap.drawInfo.frame.svgModelResourceList, {
      id: foundNodeDefInfo.resourceId,
    });
    getNodeBgColor = foundSvgModelResourceInfo.elementDrawInfo.color;
  });

  // nDefId 가 장소, 장비, 센서 인지 구분하기 위한 노드 정보 찾기
  const foundNodeInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNo =>
    _.map(svgNo.defList, 'id').includes(nDefId),
  );
  if (_.isUndefined(foundNodeInfo)) return false;

  // 0: 장치, 1: 센서, -1: 미분류
  if (foundNodeInfo.is_sensor === 0) {
    const checkDataStatus = checkTrueFalseData(data); // 데이터의 상태
    const drawedSvgElement = $(`#${nDefId}`);

    // 데이터 상태에 따른 색상 변경
    if (checkDataStatus === FALSE_DATA) {
      drawedSvgElement.attr({ fill: getNodeBgColor[0] });
    } else if (checkDataStatus === TRUE_DATA) {
      drawedSvgElement.attr({ fill: getNodeBgColor[1] });
    } else {
      drawedSvgElement.attr({ fill: getNodeBgColor[2] });
    }
  }
}

/**
 * svg텍스트 그리기
 * @param {SVG} svgCanvas
 * @param {defInfo} defInfo 장치, 노드의  id, resourceId, point[] 정보
 * @param {mSvgModelResource} resourceInfo 장치, 노드의 resource id, type, elemetDrawInfo[width,height,radius,...] 정보
 */
function writeSvgText(svgCanvas, defInfo, resourceInfo, isKorText = true) {
  const { svgModelResourceList } = map.drawInfo.frame;
  const { width, height } = resourceInfo.elementDrawInfo; // 텍스트가 그려질 공간 크기 또는 투명도
  const [x, y] = defInfo.point; // 텍스트 위치
  let name; // defInfo.name: 한글, defInfo.id: 영문

  // 최초로 그릴 때 한/영문 이름 정의
  name = isKorText ? defInfo.name : defInfo.id;

  /** @type {mTextStyleInfo} */
  const { fontSize, color, transform } = _.find(svgModelResourceList, {
    id: defInfo.resourceId,
  }).textStyleInfo;

  // 제외 할 텍스트 찾기
  checkHidableText(defInfo.id) ? (name = '') : '';

  // 텍스트 그리기
  svgCanvas
    .text(text => {
      // 이름
      text
        .tspan(name)
        .attr({
          id: `${defInfo.id}_title`,
        })
        .font({ fill: color, size: fontSize });
      // 데이터 공간
      text
        .tspan(' ')
        .newLine()
        .font({ size: '0.5em', fill: '#7675ff' })
        .attr({
          id: `${defInfo.id}_data`,
        });
      // 단위 공간
      text
        .tspan('')
        .attr({
          id: `${defInfo.id}_unit`,
        })
        .font({ size: '0.5em' });
    })
    // 공통 옵션
    .leading(0.6)
    .move(x + width / 2, y + height / 2)
    .font({ anchor: 'middle', weight: 'bold', transform, 'pointer-events': 'none' })
    .dy(-8);
}

/**
 * 그려진 map에서 제외할  텍스트 찾기. 반환값이  true이면 제외
 * @param {string} defId
 */
function checkHidableText(defId) {
  /** @type {mDeviceMap} */
  const realMap = map;
  let isHidableText; //

  if (_.includes(realMap.relationInfo.hiddenTextSvgModelResourceIdList, 'all')) return true;

  // defId 값이 장소인지 노드인지 구분
  // 장소
  const foundPlaceInfo = _.find(realMap.drawInfo.positionInfo.svgPlaceList, svgPlaceInfo =>
    _.map(svgPlaceInfo.defList, 'id').includes(defId),
  );
  // 노드
  if (_.isUndefined(foundPlaceInfo)) {
    const foundNodeInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
      _.map(svgNodeInfo.defList, 'id').includes(defId),
    );
    isHidableText = _.includes(
      realMap.relationInfo.hiddenTextSvgModelResourceIdList,
      foundNodeInfo.nodeDefId,
    );
  } else {
    isHidableText = _.includes(
      realMap.relationInfo.hiddenTextSvgModelResourceIdList,
      foundPlaceInfo.placeId,
    );
  }

  return isHidableText;
}

/**
 * socket 명령 구조
 * @param {socket} socket
 * @param {string} controlType 0: 장치 (Close, Off), 1: 장치 (Open, On), 3: 장치 값 설정
 * @param {string} nodeId
 */
function executeCommand(socket, controlType, nodeId) {
  const reqCmdInfo = {
    cmdFormat: 'SINGLE',
    cmdType: 'CONTROL',
    nodeId,
    singleControlType: controlType,
    // cmdType: $(reqCmdBtn).data('cmd-type'),
    // cmdGoal: {
    //   goalDataList: [],
    // },
  };

  // const requestMsg = {
  //   commandId: 'SINGLE',
  //   contents: {
  //     wrapCmdType: 'CONTROL',
  //     nodeId,
  //     singleControlType: controlType,
  //     rank: 2,
  //   },
  // };
  // console.log(requestMsg);
  socket.emit('executeCommand', reqCmdInfo);
}

/**
 * svg.js 의 도형별 그리기 이벤트를 모음
 * @param {SVG} svgCanvas
 * @param {string} svgDrawType rect, polygon, circle, line ...
 * @param {Object} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} defId 그려지는 svg 도형에 주어줄 장소 또는 노드의 defInfo.id 값
 */
function drawSvgElement(svgCanvas, svgDrawType, point, elementDrawInfo, defId) {
  switch (svgDrawType.toString()) {
    case 'rect':
      drawSvgRect(svgCanvas, point, elementDrawInfo, defId);
      break;
    case 'image':
      drawSvgImage(svgCanvas, point, elementDrawInfo, defId);
      break;
    case 'line':
      drawSvgLine(svgCanvas, point, elementDrawInfo, defId);
      break;
    case 'circle':
      drawSvgCircle(svgCanvas, point, elementDrawInfo, defId);
      break;
    case 'polygon':
      drawSvgPolygon(svgCanvas, point, elementDrawInfo, defId);
      break;
    case 'pattern':
      drawSvgPattern(svgCanvas, point, elementDrawInfo, defId);
      break;
    default:
      break;
  }
}

/**
 * 사각형
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color, opactiy}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgRect(svgCanvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  const { width, height, radius = 1, opacity = 1 } = elementDrawInfo;
  let { color } = elementDrawInfo;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];
  const model = svgCanvas
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
 * 줄
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgLine(svgCanvas, point, elementDrawInfo, id) {
  const [x1, y1, x2, y2] = point;
  const { width, opacity = 1 } = elementDrawInfo;
  let { color } = elementDrawInfo;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  svgCanvas
    .line(x1, y1, x2, y2)
    .stroke({ color: color[0], width, opacity })
    .attr({
      id,
    });
}

/**
 * 원
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgCircle(svgCanvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  const { radius, opacity = 1 } = elementDrawInfo;
  let { color } = elementDrawInfo;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];
  const model = svgCanvas
    .circle(radius)
    .fill(color[0])
    .move(x, y)
    .stroke({ width: 0.5 })
    .attr({
      id,
      opacity,
    });
  drawSvgShadow(model, id);
}

/**
 * 다각형
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id 값
 */
function drawSvgPolygon(svgCanvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  const { width, height, opacity = 1 } = elementDrawInfo;
  let { color } = elementDrawInfo;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  const model = svgCanvas.polyline(
    `${width},${0} ${width * 2},${height} ${width},${height * 2} ${0},${height}`,
  );
  model
    .fill(color[0])
    .move(x, y)
    .stroke({ width: 0.5 })
    .attr({
      id,
      opacity,
    });
  drawSvgShadow(model, id);
}

/**
 * 패턴 방식 (바둑판 등)
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id값
 */
function drawSvgPattern(svgCanvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  const { width, height, radius = 1, opacity = 1 } = elementDrawInfo;
  let { color } = elementDrawInfo;

  // color가 배열이 아니면 배열로 변환
  color = Array.isArray(color) ? color : [color];

  // 그림자를 적용하기위해 pattern 뒤에 사각형 그리기.
  const model = svgCanvas.rect(width, height);
  model.move(x, y).stroke({ color: 'black' });

  drawSvgShadow(model, id);

  // pattern 안의 작은 사각형의 크기
  const patternSize = 21;
  const pattern = svgCanvas.pattern(patternSize, patternSize, add => {
    add.rect(patternSize, patternSize).fill('white');
    add
      .rect(patternSize, patternSize)
      .move(0.4, 0.4)
      .fill(color[0])
      .radius(radius)
      .attr({
        opacity,
      });
  });
  svgCanvas
    .rect(width, height)
    .move(x, y)
    .fill(pattern)
    .attr({
      id,
      opacity,
    });
}

/**
 * 이미지
 * @param {SVG} svgCanvas
 * @param {number[]} point point[]
 * @param {mElementDrawInfo} elementDrawInfo {width, height, radius, color}
 * @param {string} id 그려지는 svg 도형에 주어줄 id값
 */
function drawSvgImage(svgCanvas, point, elementDrawInfo, id) {
  const [x, y] = point;
  const { width, height, imgUrl, radius = 1, opacity = 1 } = elementDrawInfo;

  const model = svgCanvas
    .image(imgUrl)
    .move(x, y)
    .size(width, height)
    .attr({
      id,
      radius,
      opacity,
    });
  drawSvgShadow(model, id);
}

/**
 * 그림자
 * @param {SVG} model 그려질 장소.
 * @param {string} defId 장소와 노드를 구분하기 위한 장소 또는 노드의 defId 값
 */
function drawSvgShadow(model, defId) {
  if (isSensor(defId)) {
    model.attr({ name: 'sensor' });
    model.filter(add => {
      const blur = add
        .offset(0, 5)
        .in(add.sourceAlpha)
        .gaussianBlur(3);
      add.blend(add.source, blur);
    });
  } else {
    model.filter(add => {
      const blur = add
        .offset(7, 7)
        .in(add.sourceAlpha)
        .gaussianBlur(4);

      add.blend(add.source, blur);
    });
  }
}

/**
 * true: 센서, false: 장소
 * @param {string} nDefId
 */
function isSensor(nDefId) {
  /** @type {mDeviceMap} */
  const realMap = map;

  const foundNodeDefInfo = _.find(realMap.drawInfo.positionInfo.svgNodeList, svgNodeInfo =>
    _.map(svgNodeInfo.defList, 'id').includes(nDefId),
  );
  if (_.isUndefined(foundNodeDefInfo)) return false;

  return true;
}

/**
 * 데이터가 true값인지 false값인지 구분한다.
 * @param {string} data
 */
function checkTrueFalseData(data) {
  const falseValList = ['CLOSE', 'CLOSING', 'OFF', 0, '0'];
  const trueValList = ['OPEN', 'OPENING', 'ON', 1, '1'];
  const isFalseValue = _.includes(falseValList, data.toUpperCase());
  const isTrueValue = _.includes(trueValList, data.toUpperCase());
  let result;

  if (isTrueValue && isFalseValue === false) {
    result = TRUE_DATA;
  } else if (isTrueValue === false && isFalseValue) {
    result = FALSE_DATA;
  } else {
    result = ERROR_DATA;
  }
  return result;
}

/**
 * @param {string} documentId // 그려질 div의 id 값
 * @param {string=} isKorText // 장소, 장치, 센서 한글로 표현 유무
 */
function drawSvgBasePlace(documentId, isKorText = true) {
  try {
    /** @type {mDeviceMap} */
    const realMap = map;
    const textLang = isKorText ? 'ko' : 'en';
    const { width, height, backgroundInfo } = realMap.drawInfo.frame.mapInfo;
    const { backgroundData = '', backgroundPosition = [0, 0] } = backgroundInfo;
    const svgCanvas = SVG(documentId).size('100%', '100%');

    // canvas 정의
    svgCanvas.attr({
      id: 'svgCanvas',
      class: 'svg_map',
      preserveAspectRatio: 'xMidYMin meet',
      lang: textLang,
    });

    // 브라우저 크기에 반응하기 위한 뷰박스 세팅
    svgCanvas.viewbox(0, 0, width, height);

    // map에 배경의 데이터가 있을경우 배경 이미지 지정
    svgCanvas.image(backgroundData).move(backgroundPosition[0], backgroundPosition[1]);

    // map에 구성 된 place, node List를 순환하여 svg 그리기
    _.forIn(realMap.drawInfo.positionInfo, placeNodeList => {
      placeNodeList.forEach(placeNodeInfo => {
        placeNodeInfo.defList.forEach(defInfo => {
          /** @type {defInfo} */
          const { id, point, resourceId } = defInfo;
          const { type, elementDrawInfo } = _.find(realMap.drawInfo.frame.svgModelResourceList, {
            id: resourceId,
          });

          // 장소에 맞는 도형을 찾아 그린다.
          drawSvgElement(svgCanvas, type, point, elementDrawInfo, id);

          // 그려진 장소 위에 해당 장소의 이름 그리기
          writeSvgText(svgCanvas, defInfo, { type, elementDrawInfo }, isKorText);
        });
      });
    });
  } catch (error) {
    // console.log(error);
    return false;
  }
}

/**
 * FIXME: 다른 방식으로 데이터 표현 고려
 * 노드 또는 센서에 데이터 표시
 * @param {string} nodeDefId
 * @param {number|string} data 데이터 값
 */
function showNodeData(nodeDefId, data = '') {
  try {
    const nodePrefix = nodeDefId.substring(nodeDefId.length - 4, nodeDefId - 1);

    const dataUnit = _(map.setInfo.nodeStructureList)
      .filter({
        defList: [{ target_prefix: nodePrefix }],
      })
      .head().data_unit;

    // default Text가 숨겨진 상태이면 데이터 표시 생략
    if (checkHidableText(nodeDefId)) return false;

    SVG.get(`#${nodeDefId}_data`)
      .clear()
      .text(data);
    SVG.get(`#${nodeDefId}_unit`)
      .clear()
      .text(dataUnit);

    // 데이터 값에 따른 상태 색 변경
    changeNodeStatusColor(nodeDefId, data);
  } catch (error) {
    // console.log(`'${nodeDefId}' is not included in svgNodeList!`);
    return false;
  }
}

/**
 *  그려진 svg map 에서 장치,센서 클릭하여 제어할 수 있는 기능을 바인딩.
 * @param {socekt} socket
 */
function bindingClickNodeEvent(socket) {
  try {
    /** @type {mDeviceMap} */
    const realMap = map;

    // map에서 그려진 node 리스트를 순환
    realMap.drawInfo.positionInfo.svgNodeList.forEach(svgNodeInfo => {
      const deviceType = svgNodeInfo.is_sensor; // 장치 or 센서 구분 ( 1: 센서, 0: 장치, -1: 미분류 )

      svgNodeInfo.defList.forEach(nodeDefInfo => {
        // 그려진 SVG 노드 객체에 클릭 이벤트 바인딩
        SVG.get(`#${nodeDefInfo.id}`).click(() => {
          const nodeData = SVG.get(`#${nodeDefInfo.id}_data`)
            .text()
            .trim();

          //데이터 상태 체크
          const dataStatus = checkTrueFalseData(nodeData);

          if (_.isUndefined(nodeData)) return alert('장치 상태 미식별');

          if (deviceType === 0 && dataStatus === TRUE_DATA) {
            const confirmBool = confirm(`'${nodeDefInfo.name}' 을(를) 닫으시겠습니까?`);
            confirmBool ? executeCommand(socket, '0', nodeDefInfo.id) : null;
          } else if (deviceType === 0 && dataStatus === FALSE_DATA) {
            const confirmBool = confirm(`'${nodeDefInfo.name}' 을(를) 여시겠습니까?`);
            confirmBool ? executeCommand(socket, '1', nodeDefInfo.id) : null;
          } else if (deviceType === 0 && dataStatus === ERROR_DATA) {
            alert('장치 상태 이상');
          }
        });
      });
    });
  } catch (error) {
    // console.log(error);
    return false;
  }
}

/**
 * TODO: 그려진 요소 z-index를 재정렬한다.
 */
function realignZindex() {}

/**
 * TODO: 현재 SVG TEXT 한영 기능
 */
function changeLang() {
  //TODO: 현재 그려진 TEXT 상태 확인 (한글 or 영문)
  const currLang = SVG.get('svgCanvas').attr().lang;
}
