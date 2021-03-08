/** @type {mDeviceMap} */
const realMap = map || {};

const BASE = {
  TXT: {
    DATA_COLOR: '#0014ff',
    TITLE_COLOR: '#000',
    FONT_SIZE: 10,
    // middle
    ANCHOR: 'middle',
  },
};

/** 데이터 목표 기준치 범위  */
const goalDR = {
  /** 기준 값 초과 */
  UPPER: 'UPPER',
  /** 기준 값 동일 */
  EQUAL: 'EQUAL',
  /** 기준 값 이하  */
  LOWER: 'LOWER',
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
      mapInfo: { width: mapWidth, height: mapHeight, backgroundInfo = {} } = {},
      svgModelResourceList,
    } = {},
    positionInfo: { svgNodeList = [], svgPlaceList = [], svgCmdList = [] } = {},
  } = {},
  setInfo: { nodeStructureList } = {},
  relationInfo: {
    placeRelationList = [],
    convertRelationList = [],
    imgTriggerList = [],
  } = {},
  controlInfo: {
    singleCmdList = [],
    setCmdList = [],
    flowCmdList = [],
    scenarioCmdList = [],
  } = {},
} = realMap;

// svgModelResourceList 생성
/** @type {Map<string, mSvgModelResource>} key: svgModelResourceId */
const mdMapStorage = new Map();

/** @type {Map<string, mdPlaceInfo>} (key: pId) */
const mdPlaceStorage = new Map();

/** @type {Map<string, mdPlaceRelHeadInfo>} (key: pcId), Map Place Relation Class 관계 */
const mdPlaceRelationStorage = new Map();

/** @type {Map<string, string[]>} (key: ncId를) 기준으로 속해있는 nodeIds  */
const mdNodeClassStorage = new Map();

/** @type {Map<string, mdNodeInfo>} (key: nId) 기준으로 nodeInfo 정보를 저장할 Map */
const mdNodeStorage = new Map();

/** @type {Map<string, mSingleMiddleCmdInfo>} (key: ncId) 기준으로 명령 정보를 저장할 Map */
const mdDeviceScenaioStorage = new Map();

/** @type {Map<string, dControlValueStorage>} (key: nId) 단일 제어 Select 영역 구성 필요 정보 */
const mdControlIdenStorage = new Map();

/** @type {Map<string, mdCmdInfo>} (key: cmdId) */
const mdCmdStorage = new Map();

/** @type {Map<string, mConvertRelationInfo>} (key: ndId) */
const mdConvertStorage = new Map();

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
 * (index.html에서 호출)  Map 초기화 진행
 * Map<placeId, mdPlaceInfo>, Map<nodeId, mdNodeInfo> 생성
 * @param {boolean} isProd Map Relation 이 맞지 않더라도 진행할지 여부. (Map Position을 잡기 위해서 필요함)
 */
function initDrawSvg(isProd = true) {
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
          target_name: pName = '',
          nodeList = [],
          svgPositionInfo: { point, resourceId } = {},
        } = pInfo;

        // svgPositionInfo 정보가 없다면 추가하지 않음
        if (isProd && resourceId === undefined) {
          return mdPlaceRelationStorage.has(pcId) && mdPlaceRelationStorage.delete(pcId);
        }

        const placeId = `${pdPrefix}${pCode ? `_${pCode}` : ''}`;
        // 사용자 지정 이름이 있을 경우 사용
        const placeName =
          pName.length > 0 ? pName : `${pdName}${pCode ? ` ${pCode}` : ''}`;

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
      defList: nodeDefList = [],
      is_sensor: isSensor = 1,
      target_id: ncId,
      target_name: ncName,
      data_unit: dataUnit,
      svgViewInfo: ncSvgViewInfo,
      operationStatusList = [],
    } = nClassInfo;

    mdNodeClassStorage.set(ncId, []);

    nodeDefList.forEach(nDefInfo => {
      const {
        nodeList = [],
        target_id: ndId,
        target_prefix: ndPrefix,
        target_name: ndName = ncName,
        svgViewInfo: ndSvgViewInfo = ncSvgViewInfo,
      } = nDefInfo;

      nodeList.forEach(nodeInfo => {
        const {
          target_code: nCode,
          target_name: nName,
          modbusInfo,
          svgNodePosOpt = {},
          svgNodePosOpt: { resourceId, axisScale, moveScale } = {},
          svgViewInfo: nSvgViewInfo = ndSvgViewInfo,
        } = nodeInfo;

        let { svgNodePosOpt: { placeId } = {} } = nodeInfo;

        // SVG Node의 위치 설정 정보가 없을 경우 추가하지 않음
        if (isProd && _.isEmpty(svgNodePosOpt)) {
          return;
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

        const observerList = [];
        mdNodeStorage.set(nodeId, {
          ncId,
          ndId,
          ncName,
          ndName,
          nodeId,
          nodeName,
          nodeData: undefined,
          modbusInfo,
          isSensor,
          dataUnit,
          axisScale,
          moveScale,
          point: [],
          placeIdList,
          svgViewInfo: nSvgViewInfo,
          operationStatusList,
          placeNameList: placeIdList.map(pId => mdPlaceStorage.get(pId).placeName),
          svgModelResource: mdMapStorage.get(resourceId),
          observerList,
          attach: observer => {
            observerList.push(observer);
          },
          dettach: observer => {
            const obIndex = observerList.findIndex(ob => ob === observer);

            obIndex !== -1 && observerList.splice(obIndex, 1);
          },
        });
      });
    });
  });

  // 변환 정보 설정
  convertRelationList.forEach(cRelInfo => {
    const { nDefId = [] } = cRelInfo;

    if (typeof nDefId === 'string') {
      mdConvertStorage.set(nDefId, cRelInfo);
    } else {
      nDefId.forEach(ndId => mdConvertStorage.set(ndId, cRelInfo));
    }
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
function drawInsideElement(svgDrawInfo, drawType) {
  const {
    svgCanvas,
    svgPositionInfo: {
      id: positionId,
      name: positionName,
      point: [x1, y1],
    },
    ownerInfo,
    ownerInfo: {
      isSensor,
      svgModelResource: {
        elementDrawInfo,
        elementDrawInfo: {
          errColor = 'red',
          width,
          height,
          opacity = 1,
          svgClass: [defaultSvgClass] = [],
          insideInfo: {
            headerInfo: {
              shareRate = 0,
              bgColor: headerBgColor,
              svgClass: headerDefaultSvgClass = defaultSvgClass,
              fontColor: headerFontColor = '#fff',
              fontSize: headerFontSize = 10,
            } = {},
            bodyInfo: {
              fontColor: [bodyFontColor = '#fff'],
              fontSize: bodyFontSize = 10,
              unitColor = '#fff',
              tblInfo: {
                rowsCount = 1,
                strokeColor: tblStrokeColor,
                strokeWidth: tblStrokeWidth,
                vStrokeScale,
                titleInfo = {},
                dataInfo = {},
              } = {},
            },
          },
        },
      },
    },
  } = svgDrawInfo;

  let {
    color: [defaultColor],
  } = elementDrawInfo;

  const fontOption = {
    'dominant-baseline': 'middle',
    'pointer-events': 'none',
  };

  // Header.shareRate 에 따라 분할
  const headerHeight = _.round(height * shareRate, 2);
  const headerOption = {
    opacity,
    'pointer-events': 'none',
  };
  // Header 영역을 할당하였을 경우에만 처리
  if (shareRate > 0) {
    // Header 정보에 따라 Draw Rect
    const headerCanvasElement = svgCanvas.rect(width, headerHeight);
    // Header에는 Cursor 이벤트를 해제함

    // 클래스를 지정한다면 Attr 추가
    if (headerDefaultSvgClass) {
      headerOption.class = headerDefaultSvgClass;
    }
    // BG 컬러가 존재할 경우 설정
    headerBgColor && headerCanvasElement.fill(headerBgColor);
    // Header Rect 이동 및 Attr 설정
    headerCanvasElement.move(x1, y1).attr(headerOption);

    // Hedder 영역에 Draw Text
    svgCanvas
      .text(text => {
        // mdNodeInfo|mdPlaceInfo 에 SVG Title 정의
        ownerInfo.svgEleName = text
          .tspan('')
          .font({ fill: headerFontColor, size: headerFontSize });
      })
      .move(_.round(x1 + width * 0.5, 2), _.round(y1 + headerHeight * 0.5, 2))
      // 중앙에서 시작
      .font({ ...fontOption, anchor: 'middle' })
      .dy(_.round(headerFontSize * 0.1, 2));

    // Hedder 영역에 Draw Text
    ownerInfo.svgEleName.text(positionName);
  }

  const bodyStartY = _.round(y1 + headerHeight, 2);
  // Body 정보에 따라 Draw Rect
  const bodyHeight = _.round(height - headerHeight, 2);

  const bodyCanvasElement = svgCanvas.rect(width, bodyHeight);

  const bodyOption = {
    opacity,
    id: positionId,
  };

  // 클래스를 지정한다면 Attr 추가
  if (defaultSvgClass) {
    bodyOption.class = errColor;
    bodyCanvasElement.attr('class', errColor);
  }
  // 노드일 경우
  if (drawType === DRAW_TYPE.NODE) {
    defaultColor = errColor;
    defaultColor && bodyCanvasElement.fill(defaultColor);
    isSensor === SENSOR_TYPE.DEVICE && _.set(bodyOption, 'cursor', 'pointer');
  }

  // Body 영역에 Draw Text
  svgCanvas
    .text(text => {
      // mdNodeInfo|mdPlaceInfo 에 SVG Title 정의
      ownerInfo.svgEleData = text
        .tspan('')
        .font({ fill: bodyFontColor, size: bodyFontSize });

      // 데이터 단위 추가
      ownerInfo.svgEleDataUnit = text
        .tspan('')
        .font({ fill: unitColor, size: bodyFontSize * 0.9 });
    })
    .move(_.round(x1 + width * 0.5, 2), _.round(y1 + headerHeight + bodyHeight * 0.5, 2))
    // 가운데에서 시작
    .font({ ...fontOption, anchor: 'middle' })
    .dy(_.round(bodyFontSize * 0.1, 2));

  // Tbl 정보가 있다면 Draw Stroke
  const strokeInfo = {
    color: tblStrokeColor,
    width: tblStrokeWidth,
  };
  // Table Rows 수가 1개 이상일 경우에만 라인을 긋든 텍스트 배치를 함
  if (rowsCount > 0) {
    // 그어야할 Line 높이 추출
    const lineHeight = _.round(bodyHeight / rowsCount, 2);

    const {
      anchor: tblTitleAnchor = 'middle',
      xAxisScale: tblTitleScale = 0,
      fontColor: tblTitleFontColor = bodyFontColor,
    } = titleInfo;

    const { anchor: tblDataAnchor = 'middle', xAxisScale: tblDataScale = 0 } = dataInfo;

    // Rows 만큼 Text 객체를 생성하여 ownerInfo 에 할당
    ownerInfo.svgEleTbls = Array(rowsCount)
      .fill(bodyStartY)
      .map((v, idx) => {
        const yPoint = _.round(bodyStartY + lineHeight * idx, 2);
        const yFontPoint = _.round(yPoint + lineHeight * 0.5, 2);

        // Text 객체 생성
        const rowSvgInfo = {};

        // tblTitleScale이 0 이상일 경우에만 Title 사용
        if (tblTitleScale > 0) {
          // Title
          svgCanvas
            .text(text => {
              rowSvgInfo.svgEleName = text
                .tspan('')
                .font({ fill: tblTitleFontColor, size: bodyFontSize });
            })
            .move(_.round(x1 + width * tblTitleScale, 2), yFontPoint)
            .font({ ...fontOption, anchor: tblTitleAnchor })
            .dy(_.round(bodyFontSize * 0.1, 2));
        }
        // Data & Data Unit
        svgCanvas
          .text(text => {
            rowSvgInfo.svgEleData = text
              .tspan('')
              .font({ fill: bodyFontColor, size: bodyFontSize })
              .dy(_.round(bodyFontSize * 0.1, 2));

            // 데이터 단위 추가
            rowSvgInfo.svgEleDataUnit = text
              .tspan('')
              .font({ fill: unitColor, size: _.round(bodyFontSize * 0.8, 2) })
              .dy(_.round(bodyFontSize * 0.05, 2))
              .dx(_.round(bodyFontSize * 0.4, 2));
          })
          .move(_.round(x1 + width * tblDataScale, 2), yFontPoint)
          .font({ ...fontOption, anchor: tblDataAnchor });

        // Draw Horizontal Line (여기서 TH 라인까지 다 그어버림. 수정시 idx 1부터 처리)
        svgCanvas
          .line(x1, yPoint, _.round(x1 + width), yPoint)
          .stroke(strokeInfo)
          .attr(headerOption);

        return rowSvgInfo;
      });
    // 수직 선
    if (vStrokeScale > 0) {
      const xPoint = _.round(x1 + width * vStrokeScale, 2);
      svgCanvas
        .line(xPoint, bodyStartY, xPoint, _.round(bodyStartY + bodyHeight, 2))
        .stroke(strokeInfo)
        .attr(headerOption);
    }
    // 행 간격 설정
    bodyOption.lineHeight = lineHeight;
  }

  // Rect Element에 Attr 정의
  bodyCanvasElement.move(x1, bodyStartY).attr(bodyOption);
  // 소유권자에게 할당
  ownerInfo.svgEleBg = bodyCanvasElement;

  return bodyCanvasElement;
}

/**
 *
 * @param {mdNodeInfo} mdNodeInfo
 * @param {mSvgPositionInfo} svgPositionInfo
 */
function setTableIndex(mdNodeInfo, svgPositionInfo) {
  const { nodeId } = mdNodeInfo;
  // console.log(mdNodeInfo, svgPositionInfo);
  const { name, placeId, tblIndex } = svgPositionInfo;

  const mdPlaceTblInfo = mdPlaceStorage.get(placeId).svgEleTbls[tblIndex];

  mdPlaceTblInfo.nodeId = nodeId;

  const { svgEleName, svgEleData, svgEleDataUnit } = mdPlaceTblInfo;

  // FIXME: 데이터에 임시로 지정함
  svgEleData.attr({ id: mdNodeInfo.nodeId });

  svgEleName && svgEleName.text(name);

  mdNodeInfo.svgEleData = svgEleData;
  mdNodeInfo.svgEleDataUnit = svgEleDataUnit;
}

/**
 * svg.js 의 도형별 그리기 이벤트를 모음
 * @param {svgDrawInfo} svgDrawInfo
 * @param {string} drawType DRAW_TYPE(Place, Node, Cmd)
 */
function drawSvgElement(svgDrawInfo, drawType) {
  // console.log(svgDrawInfo);

  const {
    svgCanvas,
    svgPositionInfo: {
      id: positionId,
      name: positionName,
      cursor = '',
      point: [x1, y1, x2, y2],
      tblIndex,
    },
    ownerInfo,
    ownerInfo: {
      isSensor,
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
          insideInfo,
        },
        textStyleInfo = {},
      },
    },
    isShow = true,
  } = svgDrawInfo;

  // 테이블 인덱스에 들어갈 경우
  if (typeof tblIndex === 'number') {
    // console.log(svgDrawInfo);
    return setTableIndex(ownerInfo, svgDrawInfo.svgPositionInfo);
  }

  let {
    color: [defaultColor],
    width: svgModelWidth,
    height: svgModelHeight,
  } = elementDrawInfo;

  const bgOption = {
    opacity: isShow ? opacity : 0,
    cursor,
  };

  // 내부 Draw 정보가 없을 경우
  if (insideInfo === undefined) {
    bgOption.id = positionId;

    // 클래스를 지정한다면 Attr 추가
    if (defaultSvgClass) {
      bgOption.class = drawType === DRAW_TYPE.NODE ? errColor : defaultSvgClass;
    }

    isSensor === SENSOR_TYPE.DEVICE && _.set(bgOption, 'cursor', 'pointer');
    defaultColor = drawType === DRAW_TYPE.NODE ? errColor : defaultColor;
  }

  // 필터 정보가 있다면 Attr 추가 정의
  _.forEach(filterInfo, (attrValue, attrKey) => {
    bgOption[attrKey] = attrValue;
  });

  let svgCanvasBgElement;
  // 기본 색상 재정의

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

  // insideInfo 정보가 있을 경우 Draw
  if (insideInfo !== undefined) {
    const bodyCanvasElement = drawInsideElement(svgDrawInfo, drawType);
    return bodyCanvasElement;
  }

  // mdNodeInfo|mdPlaceInfo 에 SVG BG 정의
  ownerInfo.svgEleBg = svgCanvasBgElement;

  // tSpan을 그리기 위한 SVG 생성 정보
  const {
    isHiddenTitle = false,
    isTitleWrap = false,
    leading = 1,
    color = BASE.TXT.TITLE_COLOR,
    dataColor: [TXT_DATA_COLOR] = [BASE.TXT.DATA_COLOR],
    fontSize = BASE.TXT.FONT_SIZE,
    transform,
    axisScale: [tAxisScaleX, tAxisScaleY] = [0.5, 0.5],
    moveScale: [tMoveScaleX, tMoveScaleY] = [0, 0],
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

  const movePointX = fontSize * tMoveScaleX;
  const movePointY = fontSize * tMoveScaleY;
  // 데이터를 [좌: 타이틀, 우: 데이터] 로 배치할 경우 배경 데이터 공간을 기준으로 text 각각 생성
  if ((isTitleWrap || isHiddenTitle) && drawType !== DRAW_TYPE.PLACE) {
    const yAxisPoint = y1 + svgModelHeight * tAxisScaleY + movePointY;
    // Title 생성
    if (!isHiddenTitle) {
      svgCanvas
        .text(text => {
          // mdNodeInfo|mdPlaceInfo 에 SVG Title 정의
          ownerInfo.svgEleName = text.tspan('').font({ fill: color, size: fontSize });
        })
        // 배경의 좌측 10% 공간에서 시작
        .move(x1 + svgModelWidth * 0.1, yAxisPoint)
        // 시작점에서 우측으로 써나감
        .font({ ...fontOption, anchor: 'start' });
    }

    svgCanvas
      .text(text => {
        ownerInfo.svgEleData = text
          .tspan('')
          .font({ size: fontSize, fill: TXT_DATA_COLOR });
        // mdNodeInfo|mdPlaceInfo 에 SVG Data Unit 정의
        ownerInfo.svgEleDataUnit = text
          .tspan('')
          .font({ fill: color, size: fontSize * 0.9 });
      })
      // 배경의 좌측 90% 공간에서 시작
      .move(x1 + svgModelWidth * tAxisScaleX, yAxisPoint)
      // 시작점에서 좌측으로 써나감
      .font({ ...fontOption, anchor });
  } else {
    let yAxisPoint = y1 + svgModelHeight * tAxisScaleY + movePointY;
    svgCanvas
      .text(text => {
        // 타이틀을 숨길 경우
        if (isHiddenTitle) {
          // 단독으로 데이터를 표현할 경우
          if (drawType === DRAW_TYPE.NODE) {
            // console.log(positionId, tAxisScaleY);
            ownerInfo.svgEleData = text
              .tspan('')
              .font({ size: fontSize, fill: TXT_DATA_COLOR });
          }
        } else {
          ownerInfo.svgEleName = text.tspan('').font({ fill: color, size: fontSize });

          if (drawType === DRAW_TYPE.NODE) {
            // 글자 크기만큼 yAxis 좌표 위치를 위로 올림
            yAxisPoint -= fontSize * leading * 0.5;

            ownerInfo.svgEleData = text
              .tspan('')
              .newLine()
              .font({ size: fontSize, fill: TXT_DATA_COLOR });
          }
        }
        // 데이터 단위 추가
        ownerInfo.svgEleDataUnit = text
          .tspan('')
          .font({ fill: color, size: fontSize * 0.9 });
      })
      // 공통 옵션
      .move(x1 + svgModelWidth * tAxisScaleX + movePointX, yAxisPoint)
      .font({ ...fontOption, anchor });

    // 글자 크기에 비례하여 개행 간격 처리
    ownerInfo.svgEleData && ownerInfo.svgEleData.dy(fontSize * leading * 1.33);
  }
  // tspan에 text를 집어넣을 경우 hidden, visible에 따라 위치 버그 발생때문에 아래로 배치
  ownerInfo.svgEleName && ownerInfo.svgEleName.text(positionName);

  return svgCanvasBgElement;
}

/**
 * 데이터 변환
 * @param {mdNodeInfo} mdNodeInfo
 * @param {number|string} data 데이터 값
 */
function refineNodeData(mdNodeInfo, data) {
  const { ndId, nodeName } = mdNodeInfo;

  const convertStorage = mdConvertStorage.get(ndId);
  // 변환 정보가 없을 경우 원본 반환
  if (convertStorage === undefined) {
    return data;
  }
  const { convertInfo, isNodeNameUse = false } = convertStorage;

  const convertData = convertInfo[data];

  // 노드 이름 사용 flag가 참일 경우 변환 정보에 따라 반환
  if (isNodeNameUse) {
    return convertData ? nodeName : '';
  }
  return convertData;
}

/**
 * showNodeData()에서 데이터 변경이 이루어지고 SVG View 옵션이 Number 일 경우 SVG 변경 유효성 검토
 * @param {number} data number 형식 데이터
 * @param {mSvgNumTreholdInfo[]} tresholdList 숫자 값 변화에 따른 SVG 표현
 */
function isReachNumGoal(data, tresholdList = []) {
  // console.log('isReachNumGoal');
  const nData = Number(data);
  const svgIdx = _.findIndex(tresholdList, threInfo => {
    const { goalValue, goalRange, isInclusionGoal = 0 } = threInfo;

    switch (goalRange) {
      case goalDR.EQUAL:
        return nData === goalValue;
      case goalDR.LOWER:
        return isInclusionGoal ? nData <= goalValue : nData < goalValue;
      case goalDR.UPPER:
        return isInclusionGoal ? nData >= goalValue : nData > goalValue;
      default:
        break;
    }
  });

  return {
    // 데이터 유효성이 검증되지 않더라도 유효한 데이터로 처리
    isValid: 1,
    svgIndex: svgIdx,
  };
}

/**
 * showNodeData()에서 데이터 변경이 이루어지고 SVG View 옵션이 String 일 경우 SVG 변경 유효성 검토
 * @param {string} data string 형식 데이터
 * @param {string[][]} tresholdList string 형식 데이터
 */
function isReachStrGoal(data, tresholdList) {
  data = typeof data === 'string' ? data : data.toString();
  const svgIdx = _.findIndex(tresholdList, strThreList => strThreList.includes(data));

  return {
    // 데이터 유효성이 검증되지 않더라도 유효한 데이터로 처리
    isValid: 1,
    svgIndex: svgIdx,
  };
}

/**
 * 기본 형태의 데이터 변화가 생길 경우
 * @param {mdNodeInfo} mdNodeInfo
 * @param {boolean} isValidError
 */
function changeSvgViewNormal(mdNodeInfo, isValidError) {
  const {
    nodeData,
    svgViewInfo,
    svgModelResource: {
      elementDrawInfo: {
        color: bgColor,
        color: [baseColor],
        errColor = 'red',
        svgClass = [],
        svgClass: [baseClass] = [],
      },
      textStyleInfo: { dataColor = [], dataColor: [baseTxtColor] = [] } = {},
    },
  } = mdNodeInfo;

  let selBgClass = '';
  let selBgColor = '';
  let selDataColor = '';

  // 데이터 임계치에 따른 SVG 변화 옵션이 없을 경우 (기본)
  if (_.isEmpty(svgViewInfo)) {
    selBgClass = isValidError && svgClass[0] ? 'red' : '';
    selBgColor = isValidError ? errColor : baseColor;
  } else {
    const { isStrType = 1, thresholdList } = svgViewInfo;

    // SVG 임계 옵션 flag에 따라 검토. 값의 유효성과 표현해야 할 SVG Index 추출
    const { isValid, svgIndex } =
      isStrType === 1
        ? isReachStrGoal(nodeData, thresholdList)
        : isReachNumGoal(nodeData, thresholdList);

    isValidError = !isValid;

    // 값이 유효할 경우에만 정의
    if (isValid) {
      selBgClass = svgClass[svgIndex] ?? baseClass;
      selBgColor = bgColor[svgIndex] ?? baseColor;
      selDataColor = dataColor[svgIndex] ?? baseTxtColor;
    }
  }

  return {
    isValidError,
    selBgClass,
    selBgColor,
    selDataColor,
  };
}

/**
 * 테이블 형태의 데이터 변화가 생길 경우
 * @param {mdNodeInfo} mdNodeInfo
 * @param {boolean} isValidError
 */
function changeSvgViewInsideTbl(mdNodeInfo, isValidError) {
  const {
    nodeData,
    svgViewInfo,
    svgModelResource: {
      elementDrawInfo: {
        color: bgColor,
        color: [baseColor],
        errColor = 'red',
        svgClass = [],
        svgClass: [baseClass] = [],
        insideInfo: {
          bodyInfo: {
            fontColor,
            fontColor: [baseTxtColor],
          },
        },
      },
    },
  } = mdNodeInfo;

  let selBgClass = '';
  let selBgColor = '';
  let selDataColor = '';

  // 데이터 임계치에 따른 SVG 변화 옵션이 없을 경우 (기본)
  if (_.isEmpty(svgViewInfo)) {
    selBgClass = isValidError && svgClass[0] ? 'red' : undefined;
    selBgColor = isValidError ? errColor : baseColor;
  } else {
    const { isStrType = 1, thresholdList } = svgViewInfo;

    // SVG 임계 옵션 flag에 따라 검토. 값의 유효성과 표현해야 할 SVG Index 추출
    const { isValid, svgIndex } =
      isStrType === 1
        ? isReachStrGoal(nodeData, thresholdList)
        : isReachNumGoal(nodeData, thresholdList);

    isValidError = !isValid;

    // 값이 유효할 경우에만 정의
    if (isValid) {
      selBgClass = svgClass[svgIndex] ?? baseClass;
      selBgColor = bgColor[svgIndex] ?? baseColor;
      selDataColor = fontColor[svgIndex] ?? baseTxtColor;
    }
  }

  return {
    isValidError,
    selBgClass,
    selBgColor,
    selDataColor,
  };
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
      dataUnit = '',
      svgModelResource: {
        elementDrawInfo: { insideInfo },
      },
      svgEleBg,
      svgEleData,
      svgEleDataUnit,
    } = mdNodeInfo;

    // data update
    mdNodeInfo.nodeData = data;

    // 변환 정보가 존재할 경우 data 값 치환
    const cData = refineNodeData(mdNodeInfo, data);

    // 옵저버에게 전파
    mdNodeInfo.observerList.forEach(ob => {
      _.get(ob, 'notifyNodeData') && ob.notifyNodeData(mdNodeInfo);
    });

    // 현재 데이터와 수신 받은 데이터가 같다면 종료
    if (nodeData === cData) return false;

    // if (nodeId === 'ST_006') {
    //   console.log('showNodeData', nodeId, data, cData, insideInfo);
    // }

    const errDataList = ['', null, undefined];

    // 기본적인 데이터 검증 => Error 범위에 들어 올 경우
    // const isValidError = errDataList.includes(data);

    const { isValidError, selBgClass, selBgColor, selDataColor } =
      insideInfo === undefined
        ? changeSvgViewNormal(mdNodeInfo, errDataList.includes(data))
        : changeSvgViewInsideTbl(mdNodeInfo, errDataList.includes(data));

    // if (nodeId === 'ST_006') {
    //   console.log(isValidError, selBgClass, selBgColor, selDataColor);
    // }

    // 변경하고자 하는 값이 유효하고 SVG Element가 존재할 경우에 적용
    selBgClass && svgEleBg && svgEleBg.attr('class', selBgClass);
    selBgColor && svgEleBg && svgEleBg.fill(selBgColor);
    selDataColor && svgEleData && svgEleData.font({ fill: selDataColor });

    // data가 유효범위가 아닐 경우
    if (isValidError) {
      svgEleData.clear();
      svgEleDataUnit.clear();
    } else {
      svgEleData.text(cData);
      svgEleDataUnit.text(` ${dataUnit}`);
    }

    return false;
  } catch (e) {
    console.error(nodeId, e.message);
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

        // console.log('Execute', deviceSetValue, controlValue);
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
    backgroundData = '#3C4854',
    coverData = '',
    backgroundPosition: [bgPosX, bgPosY] = [0, 0],
  } = backgroundInfo;

  // 브라우저 크기에 반응하기 위한 뷰박스 세팅
  svgCanvas.viewbox(0, 0, mapWidth, mapHeight);
  // console.log(typeof backgroundData, backgroundData);

  // 백그라운드 정보가 있을 경우
  if (backgroundData.includes('map')) {
    // map에 배경의 데이터가 있을경우 배경 이미지 지정
    svgCanvas.image(backgroundData).move(bgPosX, bgPosY);
  } else {
    // 일반 색상으로 표현하고자 할 경우
    const bgColor = backgroundData.length === 0 ? '#3C4854' : backgroundData;

    svgCanvas.rect(mapWidth, mapHeight).fill(bgColor).stroke({
      width: 1,
      color: '#ccc',
    });
    // .opacity(0.1);
  }

  // 트리거 이미지 생성 불러옴
  initTriggerImg(svgCanvas, mdNodeStorage, imgTriggerList);

  // 이미지 커버가 존재할 경우
  if (coverData.length) {
    svgCanvas.image(coverData).move(bgPosX, bgPosY);
  }
  // Place 그리기
  svgPlaceList.forEach(svgPositionInfo => {
    const { id: placeId } = svgPositionInfo;

    const resourceOpacity = _.get(
      mdPlaceStorage.get(placeId),
      'svgModelResource.elementDrawInfo.opacity',
      0,
    );

    drawSvgElement(
      {
        svgCanvas,
        svgPositionInfo,
        isShow: resourceOpacity,
        ownerInfo: mdPlaceStorage.get(placeId),
      },
      DRAW_TYPE.PLACE,
    );
  });

  // Node 그리기
  svgNodeList.forEach(svgNodeInfo => {
    const { id: nodeId } = svgNodeInfo;
    const mdNodeInfo = mdNodeStorage.get(nodeId);
    // console.log(svgNodeInfo);

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
  const DATA_RANGE = {
    TRUE: ['OPEN', 'OPENING', 'ON', '1', 'FOLD', 'AUTO', 'A'],
    FALSE: ['CLOSE', 'CLOSING', 'OFF', '0', 'UNFOLD', 'MANUAL', 'M'],
  };
  // SVG('#IVT_PW_G_KW_1_title').clear().text('TEST');

  mdNodeStorage.forEach(mdNodeInfo => {
    const { nodeId, isSensor, modbusInfo, ncId, svgViewInfo } = mdNodeInfo;

    let nodeData;
    // 모드버스가 아닐 경우
    if (modbusInfo === undefined) {
      if (svgViewInfo) {
        const { isStrType = 1, thresholdList: tresholdList = [] } = svgViewInfo;
        if (isStrType === 1) {
          const strThreList = tresholdList[_.random(0, tresholdList.length - 1)];

          nodeData = strThreList[_.random(strThreList[(0, strThreList.length - 1)])];
        } else {
          nodeData = _.round(_.random(-1000, 1000, true), 2);
        }
      } else if (isSensor === 1) {
        nodeData = _.round(_.random(0, 1000, true), 2);
      } else {
        const isDataType = _.random(0, 2);

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
      }
    } else {
      // 모드버스 일 경우
      const { fnCode, dataLength = 1 } = modbusInfo;

      switch (fnCode) {
        case 1:
          nodeData = _.sample([0, 1]);
          break;
        case 3:
        case 4:
          nodeData = _.random(0, 1000, true);
          nodeData = dataLength > 1 ? _.round(nodeData, 2) : _.round(nodeData);
          break;
        default:
          nodeData = _.random(0, 1000, true);
          break;
      }
    }
    showNodeData(nodeId, nodeData);
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
