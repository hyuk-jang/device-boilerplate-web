const TRUE_DATA = '1';
const FALSE_DATA = '0';
const ERROR_DATA = '-1';

var _ = _;
var $ = $;
var SVG = SVG;
/** @type {mDeviceMap} */
const realMap = map;

const BASE = {
  TXT: {
    DATA_COLOR: '#0014ff',
    TITLE_COLOR: '#000',
    FONT_SIZE: 10,
    // middle
    ANCHOR: 'middle',
  },
};

const DATA_RANGE = {
  TRUE: ['OPEN', 'OPENING', 'ON', '1', 'FOLD', 'AUTO', 'A'],
  FALSE: ['CLOSE', 'CLOSING', 'OFF', '0', 'UNFOLD', 'MANUAL', 'M'],
};

const SENSOR_TYPE = {
  DEVICE: 0,
  SENSOR: 1,
  NONE: -1,
};

const DRAW_TYPE = {
  PLACE: 0,
  NODE: 1,
  CMD: 2,
};

const {
  drawInfo: {
    frame: {
      mapInfo: { width: mapWidth, height: mapHeight, backgroundInfo = {} },
      svgModelResourceList,
    },
    positionInfo: { svgNodeList = [], svgPlaceList = [], svgCmdList = [] },
  },
  setInfo: { nodeStructureList },
  relationInfo: { placeRelationList },
  controlInfo: {
    singleCmdList = [],
    setCmdList = [],
    flowCmdList = [],
    scenarioCmdList = [],
  } = {},
} = realMap;

// svgModelResourceList 생성
/** @type {Map<string, mSvgModelResource>} */
const mdMapStorage = new Map();

/** @type {Map<string, mdPlaceInfo>} */
const mdPlaceStorage = new Map();

/** @type {Map<string, mdPlaceRelHeadInfo>} key pcId, Map Place Relation Class 관계 */
const mdPlaceRelationStorage = new Map();

/** @type {Map<string, string[]>} ncId를 기준으로 속해있는 nodeIds  */
const mdNodeClassStorage = new Map();

/** @type {Map<string, mdNodeInfo>} nodeId를 기준으로 nodeInfo 정보를 저장할 Map */
const mdNodeStorage = new Map();

/** @type {Map<string, mSingleMiddleCmdInfo>} node Class Id를 기준으로 명령 정보를 저장할 Map */
const mdDeviceScenaioStorage = new Map();

/** @type {Map<string, dControlValueStorage>} key:nodeId 단일 제어 Select 영역 구성 필요 정보 */
const mdControlIdenStorage = new Map();

/** @type {Map<string, mdCmdInfo>} key: cmdId */
const mdCmdStorage = new Map();

/**
 * 장치 제어 식별 Map 생성
 * @param {mSingleMiddleCmdInfo} dCmdScenarioInfo
 * @param {dControlValueStorage=} dControlValueStorage
 */
function initDeviceControlIdentify(dCmdScenarioInfo, dControlValueStorage = new Map()) {
  const {
    subCmdList: confirmList,
    scenarioMsg,
    isSetValue,
    setValueInfo,
  } = dCmdScenarioInfo;

  confirmList.forEach(confirmInfo => {
    const { enName, krName, controlValue, nextStepInfo } = confirmInfo;

    // 다음 동작이 존재한다면 재귀
    if (nextStepInfo) {
      return initDeviceControlIdentify(nextStepInfo, dControlValueStorage);
    }

    /** @type {dControlIdenInfo} */
    const dControlIdenInfo = {
      enName,
      krName,
      scenarioMsg,
      controlValue,
      isSetValue,
      setValueInfo,
    };

    dControlValueStorage.set(controlValue, dControlIdenInfo);
  });

  return dControlValueStorage;
}

/**
 * mCmdStorage에 Map 요소를 추가하기 위한 메소드
 * @param {string} cmdFormat
 * @param {string} cmdId
 * @param {string} cmdName
 * @param {svgNodePosOpt} svgNodePosOpt
 */
function setCmdStorage(cmdFormat, cmdId, cmdName, svgNodePosOpt) {
  if (_.isEmpty(svgNodePosOpt)) {
    return false;
  }
  const { placeId, resourceId, axisScale, moveScale } = svgNodePosOpt;

  mdCmdStorage.set(cmdId, {
    cmdFormat,
    cmdId,
    cmdName,
    axisScale,
    moveScale,
    mdPlaceInfo: mdPlaceStorage.get(placeId),
    svgModelResource: mdMapStorage.get(resourceId),
  });
}

/**
 * Map 초기화 진행
 * Map<placeId, mdPlaceInfo>, Map<nodeId, mdNodeInfo> 생성
 */
function initDrawSvg() {
  // svgModelResourceList 생성
  svgModelResourceList.forEach(modelInfo => {
    const { id } = modelInfo;
    mdMapStorage.set(id, modelInfo);
  });

  // PlaceRelationList을 순회하면서 Map<placeId, mSvgStorageInfo> 세팅
  placeRelationList.forEach(pClassInfo => {
    const { target_id: pcId, target_name: pcName, defList } = pClassInfo;

    mdPlaceRelationStorage.set(pcId, {
      pcId,
      pcName,
      mdPlaceRelTailStorage: new Map(),
    });

    defList.forEach(pDefInfo => {
      const {
        target_prefix: pdPrefix,
        target_name: pdName = pcName,
        placeList = [],
      } = pDefInfo;
      // 장소 목록 순회
      placeList.forEach(pInfo => {
        const {
          target_code: pCode = null,
          target_name: pName = pdName,
          nodeList = [],
          svgPositionInfo: { point, resourceId } = {},
        } = pInfo;
        // Place ID 정의

        // svgPositionInfo 정보가 없다면 추가하지 않음
        if (resourceId === undefined) {
          return mdPlaceRelationStorage.has(pcId) && mdPlaceRelationStorage.delete(pcId);
        }

        const placeId = `${pdPrefix}${pCode ? `_${pCode}` : ''}`;
        const placeName = `${pName}${pCode ? `_${pCode}` : ''}`;

        mdPlaceRelationStorage.get(pcId).mdPlaceRelTailStorage.set(placeId, {
          pcId,
          pId: placeId,
          pName: placeName,
          getNodeList: () => {
            return nodeList.reduce((mdNodeList, nId) => {
              const mdNodeInfo = mdNodeStorage.get(nId);
              mdNodeInfo.isSensor === 1 && mdNodeList.push(mdNodeInfo);

              return mdNodeList;
            }, []);
          },
        });

        mdPlaceStorage.set(placeId, {
          placeId,
          placeName,
          nodeList,
          point,
          svgModelResource: mdMapStorage.get(resourceId),
        });
      });
    });
  });

  nodeStructureList.forEach(nClassInfo => {
    const {
      defList,
      is_sensor: isSensor = 1,
      target_id: ncId,
      target_name: ncName,
      data_unit: dataUnit,
      operationStatusList = [],
    } = nClassInfo;

    mdNodeClassStorage.set(ncId, []);

    defList.forEach(nDefInfo => {
      const {
        nodeList = [],
        target_prefix: ndPrefix,
        target_name: ndName = ncName,
      } = nDefInfo;

      nodeList.forEach(nodeInfo => {
        const {
          target_code: nCode,
          target_name: nName,
          svgNodePosOpt = {},
          svgNodePosOpt: { resourceId, axisScale, moveScale } = {},
        } = nodeInfo;

        let { svgNodePosOpt: { placeId } = {} } = nodeInfo;

        // SVG Node의 위치 설정 정보가 없을 경우 추가하지 않음
        if (_.isEmpty(svgNodePosOpt)) {
          return false;
        }

        const nodeId = `${ndPrefix}${nCode ? `_${nCode}` : ''}`;
        let nodeName;
        if (typeof nName === 'string' && nName.length) {
          nodeName = nName;
        } else {
          nodeName = `${ndName}${nCode ? `_${nCode}` : ''}`;
        }

        mdNodeClassStorage.get(ncId).push(nodeId);

        // 노드를 포함하는 Place Id 목록
        const placeIdList = [];

        mdPlaceStorage.forEach(mdPlaceInfo => {
          const { nodeList: mdPlaceNodeList, placeId: mdPlaceId } = mdPlaceInfo;
          if (mdPlaceNodeList.includes(nodeId)) {
            placeIdList.push(mdPlaceId);

            // placeId의 정보가 없다면 placeRelation에 있는지 찾아서 정의
            if (placeId === '' || placeId === undefined) {
              placeId = mdPlaceId;
            }
          }
        });

        mdNodeStorage.set(nodeId, {
          ncId,
          ncName,
          ndName,
          nodeId,
          nodeName,
          nodeData: undefined,
          isSensor,
          dataUnit,
          axisScale,
          moveScale,
          point: [],
          placeIdList,
          operationStatusList,
          placeNameList: placeIdList.map(pId => mdPlaceStorage.get(pId).placeName),
          svgModelResource: mdMapStorage.get(resourceId),
        });
      });
    });
  });

  // Place Class Storage 수정 (Node 상태에 따라)
  mdPlaceRelationStorage.forEach(mdPlaceRelHeadInfo => {
    const { pcId, mdPlaceRelTailStorage } = mdPlaceRelHeadInfo;

    // 장소에 조건을 충족하는 노드가 없을 경우 Map에서 해당 요소 삭제
    mdPlaceRelTailStorage.forEach((mdPlaceRelTailInfo, pId) => {
      mdPlaceRelTailInfo.getNodeList().length === 0 && mdPlaceRelTailStorage.delete(pId);
    });
    mdPlaceRelTailStorage.size === 0 && mdPlaceRelationStorage.delete(pcId);
  });

  // 장치 제어 목록 설정
  singleCmdList.forEach(deviceCmdInfo => {
    const { applyDeviceList = [], singleMidCateCmdInfo } = deviceCmdInfo;

    const dControlValueStorage = initDeviceControlIdentify(singleMidCateCmdInfo);

    applyDeviceList.forEach(ncId => {
      // 장치 제어 식별 Map 생성
      mdDeviceScenaioStorage.set(ncId, singleMidCateCmdInfo);
      // Node Class Id 기준으로 해당 식별 Map을 붙여줌
      mdControlIdenStorage.set(ncId, dControlValueStorage);
    });
  });

  // 설정 명령
  setCmdList.forEach(setCmdInfo => {
    const { cmdId, cmdName, svgNodePosOpt } = setCmdInfo;

    setCmdStorage('SET', cmdId, cmdName, svgNodePosOpt);
  });

  // 흐름 명령
  flowCmdList.forEach(flowCmdInfo => {
    const { destList = [], srcPlaceId } = flowCmdInfo;
    let { srcPlaceName } = flowCmdInfo;

    // srcName이 사용자가 지정하지 않았을 경우 Place 저장소에서 이름 추출
    if (srcPlaceName === undefined) {
      srcPlaceName = mdPlaceStorage.get(srcPlaceId).placeName;
      flowCmdInfo.srcPlaceName = srcPlaceName;
    }
    // 목적지 순회
    destList.forEach(destInfo => {
      const { destPlaceId, svgNodePosOpt } = destInfo;
      let { destPlaceName } = destInfo;
      // 도착지 이름이 지정되지 않았을 경우 place 저장소에서 이름 추출하여 정의
      if (destPlaceName === undefined) {
        destPlaceName = mdPlaceStorage.get(destPlaceId).placeName;
        destInfo.destPlaceName = destPlaceName;
      }

      const cmdId = `${srcPlaceId}_TO_${destPlaceId}`;
      const cmdName = `${srcPlaceName}_TO_${destPlaceName}`;

      setCmdStorage('FLOW', cmdId, cmdName, svgNodePosOpt);
    });
  });

  // 시나리오 명령
  scenarioCmdList.forEach(scenarioCmdInfo => {
    const { cmdId, cmdName, svgNodePosOpt } = scenarioCmdInfo;

    setCmdStorage('SCENARIO', cmdId, cmdName, svgNodePosOpt);
  });
}

/**
 *
 * @param {SVG} svgCanvas
 * @param {mPatternInfo} patternInfo
 */
function drawSvgPattern(svgCanvas, patternInfo) {
  const {
    patternSize: [pW, pH],
    patternList,
  } = patternInfo;

  return svgCanvas.pattern(pW, pH, add => {
    patternList.forEach(elePatternInfo => {
      const {
        patternType,
        fill,
        move: [mX, mY] = [],
        radius,
        size: [width, height],
        opacity = 1,
      } = elePatternInfo;

      switch (patternType) {
        case 'rect':
          add.rect(width, height).opacity(opacity);
          break;
        case 'circle':
          add.circle(radius).opacity(opacity);
          break;
        case 'image':
          add.image(fill).size(width, height).opacity(opacity);
          break;
        default:
          break;
      }

      mX && mY && add.move(mX, mY);
    });
  });
}

/**
 * svg.js 의 도형별 그리기 이벤트를 모음
 * @param {svgDrawInfo} svgDrawInfo
 * @param {string} drawType DRAW_TYPE(Place, Node, Cmd)
 */
function drawSvgElement(svgDrawInfo, drawType) {
  const {
    svgCanvas,
    svgPositionInfo: {
      id: positionId,
      name: positionName,
      cursor = '',
      point: [x1, y1, x2, y2],
    },
    ownerInfo,
    ownerInfo: {
      svgModelResource: {
        type: elementType,
        elementDrawInfo,
        elementDrawInfo: {
          errColor = 'red',
          radius = 1,
          opacity = 1,
          strokeInfo,
          patternInfo,
          svgClass: [defaultSvgClass] = [],
          filterInfo = {},
        },
        textStyleInfo = {},
      },
    },
    isShow = true,
  } = svgDrawInfo;

  let {
    color: [defaultColor],
    width: svgModelWidth,
    height: svgModelHeight,
  } = elementDrawInfo;

  const bgOption = {
    id: positionId,
    opacity: isShow ? opacity : 0,
    cursor,
  };

  // 클래스를 지정한다면 Attr 추가
  if (defaultSvgClass) {
    bgOption.class = errColor;
  }
  // 필터 정보가 있다면 Attr 추가 정의
  _.forEach(filterInfo, (attrValue, attrKey) => {
    bgOption[attrKey] = attrValue;
  });

  // console.log(bgOption);

  let svgCanvasBgElement;
  // 기본 색상 재정의
  defaultColor = drawType === DRAW_TYPE.NODE ? errColor : defaultColor;

  // SVG 생성
  switch (elementType) {
    case 'rect':
    case 'diamond':
      svgCanvasBgElement = svgCanvas.rect(svgModelWidth, svgModelHeight);
      // 노드 일 경우에는 초기값 Error, 그밖에는 기본 색상
      break;
    case 'circle':
      svgModelWidth = radius * 2;
      svgModelHeight = svgModelWidth;
      svgCanvasBgElement = svgCanvas.circle(radius * 2);
      // 노드 일 경우에는 초기값 Error, 그밖에는 기본 색상
      break;
    case 'rhombus':
      svgModelWidth = radius * 2;
      svgModelHeight = svgModelWidth;

      svgCanvasBgElement = svgCanvas.polygon(
        `${radius}, 0 ${svgModelWidth}, ${radius} ${radius}, ${svgModelHeight} 0, ${radius} `,
      );
      // 노드 일 경우에는 초기값 Error, 그밖에는 기본 색상
      break;
    case 'image':
      svgCanvasBgElement = svgCanvas
        .image(defaultColor)
        .size(svgModelWidth, svgModelHeight);
      break;
    case 'line':
      svgCanvasBgElement = svgCanvas.line(x1, y1, x2, y2);
      break;
    case 'pattern':
      svgCanvasBgElement = svgCanvas.rect(svgModelWidth, svgModelHeight);
      // Pattern 가져옴
      defaultColor = drawSvgPattern(svgCanvas, patternInfo);
      break;
    default:
      break;
  }

  // SVG Element 가 생성되었을 경우 속성 정의 및 이동
  if (svgCanvasBgElement !== undefined) {
    svgCanvasBgElement.move(x1, y1).attr(bgOption);

    defaultColor && svgCanvasBgElement.fill(defaultColor);
    // 외곽 선 정보가 존재한다면 그림
    strokeInfo && svgCanvasBgElement.stroke(strokeInfo);
  }

  // mdNodeInfo|mdPlaceInfo 에 SVG BG 정의
  ownerInfo.svgEleBg = svgCanvasBgElement;

  // tSpan을 그리기 위한 SVG 생성 정보
  const {
    isHiddenTitle = false,
    isTitleWrap = true,
    leading = 1,
    color = BASE.TXT.TITLE_COLOR,
    dataColor: [TXT_DATA_COLOR] = [BASE.TXT.DATA_COLOR],
    fontSize = BASE.TXT.FONT_SIZE,
    transform,
    axisScale: [tAxisScaleX, tAxisScaleY] = [0.5, 0.5],
    anchor = BASE.TXT.ANCHOR,
  } = textStyleInfo;

  // tspan 옵션
  const fontOption = {
    leading,
    anchor: 'middle',
    weight: 'bold',
    transform,
    'dominant-baseline': 'middle',
    'pointer-events': 'none',
  };

  // 데이터를 [좌: 타이틀, 우: 데이터] 로 배치할 경우 배경 데이터 공간을 기준으로 text 각각 생성
  if (!(isTitleWrap || isHiddenTitle) && drawType !== DRAW_TYPE.PLACE) {
    const yAxisPoint = y1 + svgModelHeight * tAxisScaleY + fontSize * 0.1;
    // Title 생성
    svgCanvas
      .text(text => {
        // mdNodeInfo|mdPlaceInfo 에 SVG Title 정의
        ownerInfo.svgEleName = text.tspan('').font({ fill: color, size: fontSize });
      })
      // 배경의 좌측 10% 공간에서 시작
      .move(x1 + svgModelWidth * 0.1, yAxisPoint)
      // 시작점에서 우측으로 써나감
      .font({ ...fontOption, anchor: 'start' });

    svgCanvas
      .text(text => {
        ownerInfo.svgEleData = text
          .tspan('')
          .font({ size: fontSize, fill: TXT_DATA_COLOR });
        // mdNodeInfo|mdPlaceInfo 에 SVG Data Unit 정의
        ownerInfo.svgEleDataUnit = text.tspan('').font({ size: fontSize * 0.9 });
      })
      // 배경의 좌측 90% 공간에서 시작
      .move(x1 + svgModelWidth * 0.9, yAxisPoint)
      // 시작점에서 좌측으로 써나감
      .font({ ...fontOption, anchor: 'end' });
  } else {
    let yAxisPoint = y1 + svgModelHeight * tAxisScaleY;

    svgCanvas
      .text(text => {
        // 타이틀을 숨길 경우
        if (isHiddenTitle) {
          // 단독으로 데이터를 표현할 경우
          if (drawType === DRAW_TYPE.NODE) {
            ownerInfo.svgEleData = text
              .tspan(' ')
              .font({ size: fontSize, fill: TXT_DATA_COLOR });
          }
        } else {
          ownerInfo.svgEleName = text.tspan('').font({ fill: color, size: fontSize });

          if (drawType === DRAW_TYPE.NODE) {
            // 글자 크기만큼 yAxis 좌표 위치를 위로 올림
            yAxisPoint -= fontSize * leading * 0.5;

            ownerInfo.svgEleData = text
              .tspan(' ')
              .newLine()
              .font({ size: fontSize, fill: TXT_DATA_COLOR });
          }
        }
        // 데이터 단위 추가
        ownerInfo.svgEleDataUnit = text.tspan('').font({ size: fontSize * 0.9 });
      })
      // 공통 옵션
      .move(x1 + svgModelWidth * tAxisScaleX, yAxisPoint)
      .font({ ...fontOption, anchor });

    // 글자 크기에 비례하여 개행 간격 처리
    ownerInfo.svgEleData && ownerInfo.svgEleData.dy(fontSize * leading * 1.33);
  }
  // tspan에 text를 집어넣을 경우 hidden, visible에 따라 위치 버그 발생때문에 아래로 배치
  ownerInfo.svgEleName && ownerInfo.svgEleName.text(positionName);

  return svgCanvasBgElement;
}

/**
 * 노드 또는 센서에 데이터 표시
 * @param {string} nodeId
 * @param {number|string} data 데이터 값
 */
function showNodeData(nodeId, data = '') {
  try {
    const mdNodeInfo = mdNodeStorage.get(nodeId);
    // 해당 노드가 존재하지 않는다면 처리 X
    if (mdNodeInfo === undefined) return false;

    const {
      nodeData,
      isSensor,
      dataUnit = '',
      svgModelResource: {
        elementDrawInfo: {
          color: [baseColor, actionColor],
          errColor = 'red',
          svgClass = [],
        },
        textStyleInfo: { dataColor: [txtBaseColor, txtActionColor] = [], fontSize } = {},
      },
      svgEleBg,
      svgEleData,
      svgEleDataUnit,
    } = mdNodeInfo;

    // console.dir(mdNodeInfo);

    // 현재 데이터와 수신 받은 데이터가 같다면 종료
    if (nodeData === data) return false;

    // data update
    mdNodeInfo.nodeData = data;

    // data의 상태에 따라 tspan(data, dataUnit) 색상 및 Visible 변경
    let isValidData = 0;
    let selectedColor = baseColor;
    let selectedIndex = 0;
    let selectedTxtColor = txtBaseColor;

    // node 타입이 Sensor 일 경우에는 Number 형식이 와야함. 아닐 경우 에러
    if (isSensor) {
      if (data === '' || data === undefined) {
        selectedColor = errColor;
      } else {
        isValidData = 1;

        // string 형식일 경우에는 dataRange 체크
        if (typeof data === 'string' && DATA_RANGE.TRUE.includes(data.toUpperCase())) {
          selectedTxtColor = txtActionColor;
        }
      }
    } else {
      // node 타입이 Device 일 경우에는 DATA_RANGE 범위 측정. 아닐 경우 에러
      const strData = _.toString(data);
      const strUpperData = strData.toUpperCase();

      // 데이터가 들어오면 유효한 데이터
      if (strData.length) {
        isValidData = 1;
        selectedIndex = 1;
        selectedColor = actionColor;
        // False 영역일 경우
        if (DATA_RANGE.FALSE.includes(strUpperData)) {
          selectedColor = baseColor;
          selectedIndex = 0;
        }
      } else {
        selectedColor = errColor;
        selectedIndex = -1;
      }
    }

    // 배경 색상 변경
    selectedColor && svgEleBg.fill(selectedColor);
    // 데이터가 용이하고 class 가 존재할 경우 대체
    if (svgClass.length) {
      isValidData
        ? svgEleBg.attr('class', svgClass[selectedIndex])
        : svgEleBg.attr('class', errColor);
    }
    // 데이터 색상 변경
    svgEleData.font({ fill: selectedTxtColor });
    if (isValidData) {
      svgEleData.text(data);
      svgEleDataUnit.text(dataUnit).dx(fontSize * 0.5);
    } else {
      // data가 유효범위가 아닐 경우
      svgEleData.clear();
      svgEleDataUnit.clear();
    }

    return false;
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param {contractCmdInfo[]} commandList
 */
function updateCommand(commandList) {
  // console.log(commandList);
  mdCmdStorage.forEach(mdCmdInfo => {
    const {
      cmdId,
      cmdStep,
      svgModelResource: {
        elementDrawInfo: {
          color: [baseColor, actionColor],
          svgClass = [],
        },
      },
      svgEleBg,
    } = mdCmdInfo;

    // 현재 진행 중인 명령이 존재하는지 확인
    const currCmdInfo = commandList.find(cmdInfo => cmdInfo.wrapCmdId === cmdId);

    // data의 상태에 따라 tspan(data, dataUnit) 색상 및 Visible 변경
    let selectedColor = baseColor;
    let selectedIndex = 0;

    // 수행중인 명령이 존재할 경우
    if (currCmdInfo) {
      const { wrapCmdStep } = currCmdInfo;
      mdCmdInfo.cmdStep = wrapCmdStep;
      selectedIndex = 1;
      selectedColor = actionColor;
    } else if (typeof cmdStep === 'string' && cmdStep.length) {
      // 수행 중인 명령이 삭제되었을 경우
      mdCmdInfo.cmdStep = '';
    }

    // console.log('selectedIndex', svgClass[selectedIndex]);

    // 배경 색상 변경
    selectedColor && svgEleBg.fill(selectedColor);
    svgEleBg.attr('class', svgClass[selectedIndex]);
  });
}

/**
 * Svg Node Device 객체를 선택하여 제어를 하고자 할 경우
 * @param {mdNodeInfo} mdNodeInfo Device Node Id
 * @param {mSingleMiddleCmdInfo=} dCmdScenarioInfo 현재 수행 중인 장치 제어 단계
 */
function confirmDeviceControl(mdNodeInfo, dCmdScenarioInfo = {}) {
  const { ncId, ndName = '', nodeId, nodeName, nodeData } = mdNodeInfo;

  const deviceName = `${ndName}(${nodeName})`;

  // 노드 장치 제어 정보가 없을 경우
  if (_.isEmpty(dCmdScenarioInfo)) {
    const deviceScenarioInfo = mdDeviceScenaioStorage.get(ncId);
    // map에 해당 장치 노드 조작 정보가 있다면 입력
    deviceScenarioInfo !== undefined && (dCmdScenarioInfo = deviceScenarioInfo);
  }
  // 노드 장치 제어 정보
  const {
    scenarioMsg = '제어 동작을 선택하세요.',
    isSetValue = false,
    setValueInfo: { msg = '', min = 0, max = 100 } = {},
    subCmdList: confirmList = [
      {
        enName: 'On/Open',
        krName: '동작',
        controlValue: 1,
      },
      {
        enName: 'Off/Close',
        krName: '정지',
        controlValue: 0,
      },
    ],
  } = dCmdScenarioInfo;

  // Node의 현 상태가 Error 일 경우 제어 불가
  if (nodeData === undefined || nodeData === '') {
    return alert(`${deviceName}의 상태를 점검해주세요.`);
  }

  // 동적 다이어로그 구성
  const btnFn = confirmList.reduce((btnFnInfo, dConfirmInfo) => {
    const { krName, controlValue, nextStepInfo } = dConfirmInfo;

    let deviceSetValue = '';
    if (nextStepInfo === undefined) {
      // 다음 스텝이 없으면 즉시 실행
      // eslint-disable-next-line func-names
      btnFnInfo[krName] = function () {
        const $deviceSetValue = $('#dialog-dynamic-input');
        // 값 입력이 활성화 되어 있으나 사용자의 값 입력에 문제가 있을 경우
        if (isSetValue) {
          deviceSetValue = $deviceSetValue.val();
          if (deviceSetValue.length === 0) {
            // 값 존재 필요
            return $deviceSetValue.addClass('ui-state-error');
          }

          const inputMin = Number($deviceSetValue.attr('min'));
          const inputMax = Number($deviceSetValue.attr('max'));
          // 데이터의 유효 범위 충족 여부
          const isGoodScope = deviceSetValue >= inputMin && deviceSetValue <= inputMax;
          // 스코프 범위를 벗어날 경우 오류
          if (!isGoodScope) {
            // 데이터 범위 오류
            return $deviceSetValue.addClass('ui-state-error');
          }
        }

        $(this).dialog('close');

        // TODO: Execute 전송
        console.log('Execute', deviceSetValue, controlValue);
        typeof reqSingleControl === 'function' &&
          reqSingleControl(nodeId, controlValue, deviceSetValue);
      };
    } else {
      // eslint-disable-next-line func-names
      btnFnInfo[krName] = function () {
        $(this).dialog('close');
        confirmDeviceControl(mdNodeInfo, nextStepInfo);
      };
    }
    return btnFnInfo;
  }, {});

  // 동적 다이어로그 박스 생성
  const dynamicDialogDom = $('#dialog-dynamic-template').html();
  const dynamicDialogTemplate = Handlebars.compile(dynamicDialogDom);
  const resultTempalte = dynamicDialogTemplate({
    confirmMsg: scenarioMsg,
    isSetValue,
    setMsg: msg,
    min,
    max,
  });

  const $dynamicDialog = $('#dialog-dynamic');

  $dynamicDialog.empty();
  $dynamicDialog.append(resultTempalte);

  // Dialog 메시지를 생성하여 dialog title, 버튼 정보 전송
  showDynamicDialog(`${deviceName} 제어`, btnFn);
}

/**
 * mdCmdStorage에서 Single Command 를 제외한 명령 수행
 * @param {mdCmdInfo} mdCmdInfo
 */
function confirmCommand(mdCmdInfo) {
  const CF_FLOW = 'FLOW';

  const { cmdFormat, cmdId, cmdStep = '', cmdName } = mdCmdInfo;

  /** @type {wsGenerateControlCmdAPI} */
  const wsGenerateControlCmdAPI = {
    cmdFormat,
    cmdId,
    // 진행중인 단계가 존재한다면 취소, 아니라면 요청
    cmdType: cmdStep.length ? 'CANCEL' : 'CONTROL',
  };

  // 흐름 명령일 경우
  if (cmdFormat === CF_FLOW) {
    const [SPI, DPI] = cmdId.split('_TO_');
    wsGenerateControlCmdAPI.SPI = SPI;
    wsGenerateControlCmdAPI.DPI = DPI;
  }

  const reqMsg = cmdStep.length ? '취소' : '요청';
  const confirmMsg = `명령('${cmdName}')을 ${reqMsg}하시겠습니까?`;
  // 명령을 수행할 경우
  if (confirm(confirmMsg)) {
    console.log(wsGenerateControlCmdAPI);
    typeof reqCommandControl === 'function' && reqCommandControl(wsGenerateControlCmdAPI);
  }
}

/**
 * SVG Map 세팅
 * @param {SVG} SVG Canvas
 */
function drawSvgBasePlace(svgCanvas) {
  const {
    backgroundData = '',
    backgroundPosition: [bgPosX, bgPosY] = [0, 0],
  } = backgroundInfo;

  // 브라우저 크기에 반응하기 위한 뷰박스 세팅
  svgCanvas.viewbox(0, 0, mapWidth, mapHeight);

  // 일반 색상으로 표현하고자 할 경우
  if (backgroundData.length < 8) {
    const bgColor = backgroundData.length === 0 ? '#fff3bf' : backgroundData;

    svgCanvas
      .rect(mapWidth, mapHeight)
      .fill(bgColor)
      .stroke({
        width: 1,
        color: '#ccc',
      })
      .opacity(0.1);
  } else {
    // map에 배경의 데이터가 있을경우 배경 이미지 지정
    svgCanvas.image(backgroundData).move(bgPosX, bgPosY);
  }

  // Place 그리기
  svgPlaceList.forEach(svgPositionInfo => {
    const { id: placeId } = svgPositionInfo;

    drawSvgElement(
      {
        svgCanvas,
        svgPositionInfo,
        isShow: backgroundData.length === 0,
        ownerInfo: mdPlaceStorage.get(placeId),
      },
      DRAW_TYPE.PLACE,
    );
  });

  // Node 그리기
  svgNodeList.forEach(svgNodeInfo => {
    const { id: nodeId } = svgNodeInfo;
    const mdNodeInfo = mdNodeStorage.get(nodeId);

    const svgCanvasBgElement = drawSvgElement(
      {
        svgCanvas,
        svgPositionInfo: svgNodeInfo,
        ownerInfo: mdNodeInfo,
      },
      DRAW_TYPE.NODE,
    );

    // 노드 타입이 장치라면 클릭 이벤트 바인딩
    if (mdNodeInfo.isSensor === SENSOR_TYPE.DEVICE) {
      svgCanvasBgElement.click(() => {
        confirmDeviceControl(mdNodeInfo);
      });
    }
  });

  // 명령 그리기
  svgCmdList.forEach(svgCmdInfo => {
    const { id: cmdId } = svgCmdInfo;

    const mdCmdInfo = mdCmdStorage.get(cmdId);

    const svgCanvasBgElement = drawSvgElement(
      {
        svgCanvas,
        svgPositionInfo: svgCmdInfo,
        ownerInfo: mdCmdInfo,
      },
      DRAW_TYPE.CMD,
    );

    // 명령 클릭 이벤트 바인딩
    svgCanvasBgElement.click(() => {
      confirmCommand(mdCmdInfo);
    });
  });
}

/**
 * Simulator 데이터 입력
 */
function runSimulator() {
  // FIXME: TEST
  // SVG('#IVT_PW_G_KW_1_title').clear().text('TEST');

  mdNodeStorage.forEach(mdNodeInfo => {
    const { nodeId, isSensor } = mdNodeInfo;
    if (isSensor) {
      showNodeData(nodeId, _.round(_.random(0, 1000, true), 2));
    } else {
      const isDataType = _.random(0, 2);

      let nodeData;

      switch (isDataType) {
        case 0:
          nodeData = DATA_RANGE.FALSE[_.random(0, DATA_RANGE.FALSE.length - 1)];
          break;
        case 1:
          nodeData = DATA_RANGE.TRUE[_.random(0, DATA_RANGE.TRUE.length - 1)];
          break;
        default:
          nodeData = _.round(_.random(0, 1000, true), 2);
          break;
      }
      showNodeData(nodeId, nodeData);
    }
  });
}

/**
 *
 * @typedef {Object} svgDrawInfo
 * @property {SVG} svgCanvas
 * @property {mSvgPositionInfo} svgPositionInfo
 * @property {boolean} isShow default: true,  true: 화면 표시 (기본값), false: 숨김
 * @property {mSvgModelResource} svgModelResource {width, height, radius, color}
 * @property {mdNodeInfo|mdPlaceInfo|mdPlaceInfo} ownerInfo mdNodeInfo or mdPlaceInfo
 */
