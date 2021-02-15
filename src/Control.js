const _ = require('lodash');

const { BU } = require('base-util-jh');

const ControlModel = require('../models/templates/ControlModel');

const AbstApiServer = require('./features/ApiCommunicator/AbstApiServer');
const AbstSocketIOManager = require('./features/SocketIOManager/AbstSocketIOManager');
const AbstRtspManager = require('./features/RtspManager/AbstRtspManager');
const AbstWeathercast = require('./features/Weathercast/AbstWeathercast');

const {
  di: {
    dcmWsModel: { wsNodePickKey, wsPlaceRelationPickKey },
  },
  dpc: { BaseModel },
} = require('./module');

// class Control extends EventEmitter {
class Control {
  constructor(config = {}) {
    const { dbInfo } = config;

    /** @type {dbInfo} */
    this.dbInfo = dbInfo;

    this.defaultConverter = BaseModel.defaultModule;

    /**
     * Main Storage List에서 각각의 거점 별 모든 정보를 가지고 있을 객체 정보 목록
     * @type {msInfo[]}
     */
    this.mainStorageList = [];

    /** @type {{mainSeq: number,map: mMapInfo}[] } */
    this.mapList = [];
  }

  bindingFeature() {
    this.weathercast = new AbstWeathercast();
    this.apiServer = new AbstApiServer(this);
    this.socketIoManager = new AbstSocketIOManager(this);
    this.rtspManager = new AbstRtspManager(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {}

  async init() {
    await this.setMainStorage();

    // routes에서 사용할 수 있도록 전역 변수로 선언
    global.mainControl = this;

    // this.setChildren();
  }

  /**
   * @param {number} mainSeq
   */
  getMap(mainSeq) {
    const foundIt = _.find(this.mapList, { mainSeq });
    if (foundIt === undefined) {
      return {};
    }
    return foundIt.map;
  }

  /**
   * @desc Step 1
   * Main Storage List를 초기화
   * @param {dbInfo=} dbInfo
   */
  async setMainStorage(dbInfo) {
    dbInfo = dbInfo || this.dbInfo;

    // BU.CLI(dbInfo)
    this.controlModel = new ControlModel(dbInfo);

    // DB에서 main 정보를 가져옴
    /** @type {MAIN[]} */
    let mainList = await this.controlModel.getTable('main', { is_deleted: 0 });

    /** @type {nodeInfo[]} */
    const nodeList = await this.controlModel.getTable('v_dv_node');

    // 장소 단위로 묶을 장소 목록을 가져옴
    /** @type {V_DV_PLACE_RELATION[]} */
    const placeRelationList = await this.controlModel.getTable('v_dv_place_relation');

    /** @type {DV_CONTROL_CMD_HISTORY[]} */
    const controlCmdHistoryRows = await this.controlModel.getCmdHistory({
      end_date: null,
    });

    mainList = _.sortBy(mainList, 'main_seq');
    // Main 정보 만큼 List 생성
    mainList.forEach(mainInfo => {
      const { main_seq: mainSeq, map } = mainInfo;

      /** @type {mDeviceMap} */
      const deviceMap = BU.IsJsonString(map) ? JSON.parse(map) : {};
      // Main Storage에서 필수 요소가 아니고 CLI를 많이 차지하기 때문에 map 이동
      if (!_.isEmpty(deviceMap)) {
        this.mapList.push({
          mainSeq,
          map: deviceMap,
        });

        delete mainInfo.map;
      }

      const where = {
        main_seq: mainSeq,
      };

      /** @type {V_DV_PLACE_RELATION[]} */
      const filteredPlaceRelList = _.filter(placeRelationList, where);

      /** @type {nodeInfo[]} */
      const filteredNodeList = [];

      filteredPlaceRelList.forEach(plaRelRow => {
        // 장소 시퀀스와 노드 시퀀스를 불러옴
        const { node_seq: nodeSeq, node_id: nodeId } = plaRelRow;

        // 노드 시퀀스를 가진 객체 검색
        const nodeInfo = _.find(nodeList, { node_seq: nodeSeq });

        // API Server로 데이터를 전송하는 Node만 필터링
        if (plaRelRow.is_submit_api === 1) {
          _.isUndefined(_.find(filteredNodeList, { node_id: nodeId })) &&
            filteredNodeList.push(nodeInfo);
        }

        return _.reduce(
          wsPlaceRelationPickKey.FOR_MAIN_STORAGE,
          (result, value, key) => {
            result[value] = _.get(nodeInfo, key, '');
            return result;
          },
          {},
        );

        // 장소 시퀀스를 가진 객체 검색
        // const placeInfo = _.find(placeList, { place_seq: placeSeq });
        // // 장소에 해당 노드가 있다면 자식으로 설정. nodeList 키가 없을 경우 생성
        // if (_.isObject(placeInfo) && _.isObject(nodeInfo)) {
        //   // 해당 svg 노드 목록 중에 id와 매칭되는 Node Id 객체가 존재할 경우 API Client 전송 flag 설정
        //   _.find(svgNodeList, { id: nodeId }) &&
        //     _.isUndefined(_.find(filteredNodeList, { node_id: nodeId })) &&
        //     filteredNodeList.push(nodeInfo);
        // }
      });

      /** @type {msInfo} */
      const mainStorageInfo = {
        msFieldInfo: mainInfo,
        msClient: null,
        msDataInfo: {
          modeInfo: {
            algorithmId: '',
            operationConfigList: [],
          },
          nodeList: filteredNodeList,
          placeRelList: filteredPlaceRelList,
          contractCmdList: _.filter(controlCmdHistoryRows, where),
          svgImgList: [],
          // controlEventHistoryRows: [],
          reqCmdList: [],
        },
        msUserList: [],
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  /**
   *
   * @param {nodeInfo[]} nodeList
   * @param {Object} pickInfo default: 브라우저를 위한 값
   */
  convertNodesToWsNodes(nodeList, pickInfo = wsNodePickKey.FOR_BROWSER) {
    return _.map(nodeList, nodeInfo =>
      _.reduce(
        pickInfo,
        (result, value, key) => {
          result[value] = _.get(nodeInfo, key, '');
          return result;
        },
        {},
      ),
    );
  }

  /**
   *
   * @param {Object} convertInfo
   * @param {V_DV_PLACE_RELATION[]} convertInfo.placeRelationRows
   * @param {Object} convertInfo.pickInfo default: 브라우저를 위한 값
   * @param {number=} convertInfo.isSubmitAPI 1일 경우  API Server 에서 사용되는 정보만 추출.
   */
  convertPlaRelsToWsPlaRels(convertInfo) {
    const {
      placeRelationRows,
      pickInfo = wsPlaceRelationPickKey.FOR_BROWSER,
      isSubmitAPI = 0,
    } = convertInfo;

    const placeRelRows =
      isSubmitAPI === 1
        ? _.filter(placeRelationRows, { is_submit_api: 1 })
        : placeRelationRows;

    return _.map(placeRelRows, nodeInfo =>
      _.reduce(
        pickInfo,
        (result, value, key) => {
          result[value] = _.get(nodeInfo, key, '');
          return result;
        },
        {},
      ),
    );
  }

  /**
   * Field Socket Client의 접속 변화가 생겼을 경우
   * @param {msInfo} msInfo
   */
  updateMsFieldClient(msInfo) {
    this.socketIoManager.submitApiClientIsConn(msInfo);
  }

  /**
   * TODO: 사용자의 요청 명령에 대한 결과 처리 필요 시 작성
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} fieldMessage field 에서 요청한 명령에 대한 응답
   */
  responseFieldMessage(msInfo, fieldMessage) {
    // BU.CLI('responseFieldMessage', fieldMessage);
  }

  /**
   * 제어 모드 업데이트
   * @param {msInfo} msInfo
   */
  updateOperationMode(msInfo) {
    this.socketIoManager.submitMode(msInfo);
  }

  /**
   * SocketServer로 수신받은 DataLogger Node 정보
   * @param {msInfo} msInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드. 차후에 속도에 문제가 된다면 갱신된 노드만 적용토록 해야함.
   */
  updateNodeList(msInfo, renewalList) {
    this.socketIoManager.submitNodeList(msInfo, renewalList);
  }

  /**
   * @desc SocketServer Observer Method Implement
   * SocketServer로 수신받은 DataLogger Order 정보
   * @param {msInfo} msInfo
   */
  updateContractCmdList(msInfo) {
    this.socketIoManager.submitCommandList(msInfo);
  }
}
module.exports = Control;
