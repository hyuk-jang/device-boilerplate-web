/* eslint-disable max-classes-per-file */
var _ = _;

/**
 * @interface
 * 명령 달성 목표가 생성될 때 마다 객체를 생성.
 * 데이터가 갱신될 때 마다 해당 달성 목표가 처리 되었는지 확인.
 */
class ThreImgComponent {
  /** 데이터 목표 기준치 범위  */
  static get goalDataRange() {
    return {
      /** 기준 값 초과 */
      UPPER: 'UPPER',
      /** 기준 값 동일 */
      EQUAL: 'EQUAL',
      /** 기준 값 이하  */
      LOWER: 'LOWER',
    };
  }

  get goalDR() {
    return {
      /** 기준 값 초과 */
      UPPER: 'UPPER',
      /** 기준 값 동일 */
      EQUAL: 'EQUAL',
      /** 기준 값 이하  */
      LOWER: 'LOWER',
    };
  }

  /**
   * notifyClear을 성공하였을 경우 알릴 Successor
   * @param {ThreImgComponent} thresholdCommand
   */
  setSuccessor() {}

  /** @param {ThreImgComponent} thresholdCommand */
  addThreImgGoal(thresholdCommand) {}

  /** @param {ThreImgComponent} thresholdCommand */
  removeThreImgGoal(thresholdCommand) {}

  /**
   * 임계치 저장소를 조회하고자 할 경우
   * @param {string} nodeId Node ID
   * @return {ThreImgComponent}
   */
  getThreImgGoal(nodeId) {}

  /**
   * 저장소에 연결된 임계치 목표 객체 목록 반환
   * @return {ThreImgComponent[]}
   */
  get threImgGoalList() {
    return [];
  }

  /**
   * 저장소에 연결된 임계치 목표 객체 Node ID 반환
   * @return {string} nodeId
   */
  get threImgGoalId() {
    return '';
  }

  /**
   * @return {boolean} 임계 명령 완료 여부
   */
  isThreImgClear() {}

  /**
   * 세부 목표를 완료했다고 알려 올 세부 객체
   * @param {ThreImgComponent} thresholdCommand
   * @return {ThreImgComponent}
   */
  handleThresholdClear(thresholdCommand) {}
}

/**
 * 명령 달성 목표가 생성될 때 마다 객체를 생성.
 * 임계치 관리 저장소. Storage > Goal 순으로 Tree 구조를 가짐
 * 데이터가 갱신될 때 마다 해당 달성 목표가 처리 되었는지 확인.
 * 달성 목표를 완료하였거나 Timer의 동작이 진행되면 Successor에게 전파
 */
class ThreImgGoal extends ThreImgComponent {
  /**
   *
   * @param {Map<string, mdNodeInfo>} mdNodeStorage
   * @param {csCmdGoalInfo} csCmdGoalInfo
   */
  constructor(mdNodeStorage, csCmdGoalInfo) {
    super();
    const {
      nodeId = '',
      goalValue,
      goalRange,
      groupId = '',
      isInclusionGoal = 0,
      isCompleteClear = false,
      expressInfo: { expression = '', nodeList = [] } = {},
    } = csCmdGoalInfo;

    this.mdNodeStorage = mdNodeStorage;
    // 임계치 모니터링 Node 객체 Id
    this.nodeId = nodeId;
    // 달성 목표 데이터
    this.goalValue = goalValue;
    // 달성 목표 범위(LOWER, EQUAL, UPPER)
    this.goalRange = goalRange;
    // 임계치를 확인하는 그룹
    this.groupId = groupId;
    // 달성 목표 데이터 포함 여부.
    this.isInclusionGoal = isInclusionGoal;
    // 이 달성 목표만 성공하면 모든 조건 클리어 여부
    this.isCompleteClear = isCompleteClear;

    // 동적 표현식 메소드 생성
    // eslint-disable-next-line no-new-func
    this.expressionFn = new Function(...nodeList, `return ${expression}`);

    /** @type {mdNodeInfo} */
    this.nodeInfo = nodeId.length ? mdNodeStorage.get(nodeId) : {};

    /** @type {mdNodeInfo[]} */
    this.nodeList = nodeList.length
      ? nodeList.map(expNodeId => mdNodeStorage.get(expNodeId))
      : [];
  }

  /**
   * @param {Map<string, mdNodeInfo>} mdNodeStorage
   * @param {csCmdGoalInfo} goalInfo 목표치 정보
   */
  static isReachGoal(mdNodeStorage, goalInfo) {
    // BU.log('@@', goalInfo);
    const {
      nodeId,
      goalValue,
      goalRange,
      isInclusionGoal = 0,
      expressInfo: { expression = '', nodeList = [] } = {},
    } = goalInfo;

    let goalData;
    // 표현식을 사용할경우 우선
    if (expression.length) {
      // eslint-disable-next-line no-new-func
      const expressionFn = new Function(...nodeList, `return ${expression}`);
      const expressionDataList = _.map(nodeList, expressionNodeId => {
        return mdNodeStorage.get(expressionNodeId).nodeData;
      });

      goalData = expressionFn(...expressionDataList);
    } else {
      goalData = mdNodeStorage.get(nodeId).nodeData;
    }

    let isReach = false;

    switch (goalRange) {
      case this.goalDR.EQUAL:
        isReach = goalData === goalValue;
        break;
      case this.goalDR.LOWER:
        isReach = isInclusionGoal ? goalData <= goalValue : goalData < goalValue;
        break;
      case this.goalDR.UPPER:
        isReach = isInclusionGoal ? goalData >= goalValue : goalData > goalValue;
        break;
      default:
        break;
    }

    return isReach;
  }

  /**
   * 저장소에 연결된 임계치 목표 객체 Node ID 반환
   * @return {string} nodeId
   */
  get threImgGoalId() {
    return this.nodeId;
  }

  // 달성 목표 성공 여부
  /**
   * @return {boolean} 목표 달성 시 ture, 실패 시 false
   */
  get isClear() {
    let isClear = false;

    // 표현식이 존재할 경우
    if (this.nodeList.length) {
      isClear = this.isReachExpression();
    } else {
      const { nodeData } = this.nodeInfo;
      if (_.isNumber(nodeData)) {
        isClear = this.isReachNumGoal(nodeData);
      } else if (_.isString(nodeData)) {
        isClear = this.isReachStrGoal(nodeData);
      } else if (nodeData === undefined) {
        isClear = this.goalDR.EQUAL === this.goalRange && this.goalValue === nodeData;
      }
    }

    return isClear;
  }

  /**
   * Goal을 성공하였을 경우 알릴 Successor
   * @param {ThreImgComponent} threImgStorage Threshold Command Storage
   */
  setSuccessor(threImgStorage) {
    this.threImgStorage = threImgStorage;
  }

  /**
   * @return {boolean} 임계 명령 완료 여부
   */
  isThreImgClear() {
    return this.threImgStorage.isThreImgClear();
  }

  /**
   * Critical Manager에서 업데이트된 Node 정보를 전달해옴.
   * 데이터가 달성 목표에 도달하였다면 Critical Stroage에 알림.
   * @param {mdNodeInfo} mdNodeInfo
   */
  notifyNodeData(mdNodeInfo) {
    return this.threImgStorage.handleThresholdClear(this);
  }

  /** 표현식으로 임계치를 체크할 경우 */
  isReachExpression() {
    const expressResult = this.expressionFn(..._.map(this.nodeList, 'nodeData'));
    return this.isReachNumGoal(expressResult);
  }

  /**
   * @param {number} deviceData number 형식 데이터
   */
  isReachNumGoal(deviceData) {
    let isClear = false;
    switch (this.goalRange) {
      case this.goalDR.EQUAL:
        isClear = deviceData === this.goalValue;
        break;
      case this.goalDR.LOWER:
        isClear = this.isInclusionGoal
          ? deviceData <= this.goalValue
          : deviceData < this.goalValue;
        break;
      case this.goalDR.UPPER:
        isClear = this.isInclusionGoal
          ? deviceData >= this.goalValue
          : deviceData > this.goalValue;
        break;
      default:
        break;
    }

    return isClear;
  }

  /**
   * @param {string} deviceData string 형식 데이터
   */
  isReachStrGoal(deviceData) {
    // 문자 데이터일 경우에는 달성 목표가 EQUAL이어야만 함. 문자 상하 비교 불가
    if (this.goalRange !== this.goalDR.EQUAL) return false;

    // 대소 문자의 차이가 있을 수 있으므로 소문자로 변환 후 비교
    return _.lowerCase(deviceData) === _.lowerCase(this.goalValue);
  }
}

/**
 * FIXME: limitTimeCalcUnit 의한 이미지 일정 시간 그리기 로직 적용 필요
 * 명령 달성 목표가 생성될 때 마다 객체를 생성.
 * 임계치 관리 저장소. Storage > Goal 순으로 Tree 구조를 가짐
 * 데이터가 갱신될 때 마다 해당 달성 목표가 처리 되었는지 확인.
 * 달성 목표를 완료하였거나 Timer의 동작이 진행되면 Successor에게 전파
 */
class ThreImgStorage extends ThreImgComponent {
  /**
   * @param {SVG.Marker} svgCanvas
   * @param {Map<string, mdNodeInfo>} mdNodeStorage
   * @param {mImgTriggerInfo} mImgTriggerInfo
   */
  constructor(svgCanvas, mdNodeStorage, mImgTriggerInfo) {
    super();
    this.svgCanvas = svgCanvas;
    // 노드 저장소
    this.mdNodeStorage = mdNodeStorage;

    // 이미지 트리거 정보
    this.mImgTriggerInfo = mImgTriggerInfo;

    this.triggerGoalInfo = mImgTriggerInfo.triggerGoalInfo;

    /** @type {ThreImgGoal[]} */
    this.threImgGoals = [];

    /** @type {ThreImgGoal[][]} */
    this.threImgGroupGoals = [];

    this.threImgLimitTimer;
    this.successor;

    this.limitTimeCalcUnit = 1000;

    this.triggerImgSvg;
  }

  drawTriggerImg() {
    const {
      filePath,
      position = [0, 0],
      size = [],
      opacity = 0.6,
    } = this.mImgTriggerInfo;

    // 그리기

    this.triggerImgSvg = this.svgCanvas
      .image(filePath)
      .opacity(opacity)
      .size(...size)
      .move(...position)
      .attr('display', 'none');
  }

  /**
   * 화면에 그림
   * @param {csCmdGoalContraintInfo} triggerGoalInfo
   */
  initThreImg(triggerGoalInfo = this.triggerGoalInfo) {
    this.drawTriggerImg();

    const { goalDataList = [], limitTimeSec } = triggerGoalInfo;

    // 임계치가 존재하지 않을 경우 임계 설정 하지 않음
    if (!_.isNumber(limitTimeSec) && goalDataList.length === 0) {
      return false;
    }

    // 설정 타이머가 존재한다면 제한 시간 타이머 동작
    if (_.isNumber(limitTimeSec)) {
      this.startLimiter(limitTimeSec);
    }

    // 세부 달성 목록 목표만큼 객체 생성 후 옵저버 등록
    goalDataList.forEach(goalInfo => {
      const { nodeId, expressInfo: { nodeList = [] } = {} } = goalInfo;
      const threImgGoal = new ThreImgGoal(this.mdNodeStorage, goalInfo);
      // 세부 달성 목표 추가
      this.addThreImgGoal(threImgGoal);
      // 저장소를 Successor로 등록
      threImgGoal.setSuccessor(this);
      // 노드 갱신 매니저에게 임계치 목표 객체를 옵저버로 등록
      if (nodeList.length) {
        nodeList.forEach(expressionNodeId => {
          this.mdNodeStorage.get(expressionNodeId).attach(threImgGoal);
        });
      } else {
        this.mdNodeStorage.get(nodeId).attach(threImgGoal);
      }
    });

    this.threImgGroupGoals = _.chain(this.threImgGoals)
      .groupBy('groupId')
      .values()
      .value();
  }

  /**
   * Threshold Command Storage에 걸려있는 임계치 타이머 삭제 및 Observer를 해제 후 삭제 처리
   */
  resetThreshold() {
    // 해당 임계치 없다면 false 반환
    this.threImgLimitTimer && clearTimeout(this.threImgLimitTimer);

    // Update Node 정보를 받는 옵저버 해제
    this.threImgGoalList.forEach(threImgGoal => {
      this.mdNodeStorage.get(threImgGoal.nodeId).dettach(threImgGoal);
    });
  }

  /**
   * notifyClear을 성공하였을 경우 알릴 Successor
   * @param {ThreImgComponent} cmdStorage Threshold Command Manager
   */
  setSuccessor(cmdStorage) {
    this.successor = cmdStorage;
  }

  /**
   * 제한 시간이 존재한다면 SetTimer 등록 및 세부 달성 목표 개체 정의
   * @param {number} limitTimeSec
   */
  startLimiter(limitTimeSec) {
    this.threImgLimitTimer = setTimeout(() => {
      // 제한 시간 초과로 달성 목표를 이루었다고 판단
      this.successor.handleThresholdClear();
    }, limitTimeSec * this.limitTimeCalcUnit);
  }

  /** @param {ThreImgGoal} threImgGoal */
  addThreImgGoal(threImgGoal) {
    // 이미 존재한다면 false 반환
    if (_.findIndex(this.threImgGoals, threImgGoal) !== -1) return false;
    // 삽입 후 true 반환
    return this.threImgGoals.push(threImgGoal) && true;
  }

  /** @param {ThreImgGoal} threImgGoal */
  removeThreImgGoal(threImgGoal) {
    // 해당 인자가 존재할 경우 삭제 후 true 반환
    if (_.findIndex(this.threImgGoals, threImgGoal) === -1) {
      _.pull(this.threImgGoals, threImgGoal);
      return true;
    }
    return false;
  }

  /**
   * 임계치 저장소를 조회하고자 할 경우
   * @param {string} nodeId Node ID
   * @return {ThreImgGoal}
   */
  getThreImgGoal(nodeId) {
    return _.find(this.threImgGoals, { nodeId });
  }

  /**
   * 저장소에 연결된 임계치 목표 객체 목록 반환
   * @return {ThreImgGoal[]}
   */
  get threImgGoalList() {
    return this.threImgGoals;
  }

  /**
   * @param {ThreImgGoal} threImgGoal
   * @return {boolean} 임계 명령 완료 여부
   */
  isThreImgClear() {
    return this.threImgGroupGoals.every(threImgGoals => {
      // 중요 달성 목표를 가진 개체가 존재하는지 체크
      const threClear = threImgGoals.find(threImgGoal => {
        return threImgGoal.isClear && threImgGoal.isCompleteClear;
      });

      // 중요 달성 목표를 달성 하였다면
      if (threClear) return true;

      // 아닐 경우 모든 달성 목표를 클리어해야 true
      return _.every(threImgGoals, 'isClear');
    });
  }

  /**
   * 세부 목표를 완료했다고 알려 올 세부 객체
   */
  handleThresholdClear() {
    // console.log('STORAGE ####### handleThresholdClear');

    // 모든 조건이 충족되었다면 Successor에게 임계치 명령 달성 처리 의뢰
    if (this.isThreImgClear()) {
      this.threImgLimitTimer && clearTimeout(this.threImgLimitTimer);

      this.triggerImgSvg.attr('display', 'block');
    } else {
      this.triggerImgSvg.attr('display', 'none');
    }
  }
}

/**
 * 명령 달성 목표가 생성될 때 마다 객체를 생성.
 * 데이터가 갱신될 때 마다 해당 달성 목표가 처리 되었는지 확인.
 */
class ThreImgManager extends ThreImgComponent {
  /**
   * @param {SVG.Marker} svgCanvas
   * @param {Map<string, mdNodeInfo>} mdNodeStorage
   * @param {mImgTriggerInfo[]} mImgTriggerList
   */
  constructor(svgCanvas, mdNodeStorage, mImgTriggerList) {
    super();

    // 저장소 목록 설정
    this.threImgStorageList = mImgTriggerList.map(
      imgTriggerInfo => new ThreImgStorage(svgCanvas, mdNodeStorage, imgTriggerInfo),
    );
  }

  /**
   * 트리거 이미지 SVG상에 그리기
   */
  initThreTriggerImg() {
    this.threImgStorageList.forEach(threImgStorage => {
      threImgStorage.initThreImg();
    });
  }

  /**
   * 임계치 완료됐다고 알려옴
   * @param {ThreImgComponent} threImgStorage
   * @return {ThreImgComponent}
   */
  handleThresholdClear() {
    this.threImgStorageList.forEach(threImgStorage => {
      threImgStorage.handleThresholdClear();
    });
  }
}

let threImgManager;

/**
 *
 * @param {SVG.Marker} svgCanvas
 * @param {mdNodeInfo[]} mdNodeStorage
 * @param {mImgTriggerInfo[]} mImgTriggerList
 */
function initTriggerImg(svgCanvas, mdNodeStorage, mImgTriggerList) {
  // Img Trigger 객체 생성 및 mdNodeStorage에 옵저버 등록
  threImgManager = new ThreImgManager(svgCanvas, mdNodeStorage, mImgTriggerList);
  threImgManager.initThreTriggerImg();
}
