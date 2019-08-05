const _ = require('lodash');

const { BU } = require('base-util-jh');

const { BM } = require('base-model-jh');

const AbstApiServer = require('./features/ApiCommunicator/AbstApiServer');
const AbstSocketIOManager = require('./features/SocketIOManager/AbstSocketIOManager');
const AbstRtspManager = require('./features/RtspManager/AbstRtspManager');
const AbstWeathercast = require('./features/Weathercast/AbstWeathercast');

const { BaseModel } = require('../../../module/device-protocol-converter-jh');

// class Control extends EventEmitter {
class Control {
  constructor(config = {}) {
    // super();

    const { dbInfo } = config;

    // BU.CLI(dbInfo);

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
   * @param {Object} featureConfig
   * @param {Object} featureConfig.ioConfig SocketIOManager 설정
   * @param {httpServer} featureConfig.ioConfig.httpServer http 객체
   * @param {Object} featureConfig.apiConfig API Communicator 설정
   * @param {number} featureConfig.apiConfig.apiPort API Communicator 설정
   * @param {Object} featureConfig.rtspConfig rtspConfig 설정
   * @param {string} featureConfig.rtspConfig.rtspUrl RTSP URL
   * @param {number} featureConfig.rtspConfig.streamWebPort RTSP 데이터를 변환처리 할 Sub Express Web Server Port
   */
  runFeature(featureConfig) {}

  async init() {
    await this.setMainStorage();
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
    this.biModule = new BM(dbInfo);

    // DB에서 main 정보를 가져옴
    /** @type {MAIN[]} */
    let mainList = await this.biModule.getTable('main', { is_deleted: 0 });

    /** @type {dataLoggerInfo[]} */
    const dataLoggerList = await this.biModule.getTable('v_dv_data_logger');
    /** @type {nodeInfo[]} */
    const nodeList = await this.biModule.getTable('v_dv_node');

    /** @type {placeInfo[]} */
    const placeRelationList = await this.biModule.getTable('v_dv_place_relation');

    mainList = _.sortBy(mainList, 'main_seq');
    // Main 정보 만큼 List 생성
    mainList.forEach(mainInfo => {
      const { main_seq: mainSeq, map } = mainInfo;

      if (BU.IsJsonString(map)) {
        this.mapList.push({
          mainSeq,
          map: JSON.parse(map),
        });

        delete mainInfo.map;
      }

      const filterdDataLoggerList = _.filter(dataLoggerList, {
        main_seq: mainSeq,
      });
      const filterdNodeList = _.filter(nodeList, {
        main_seq: mainSeq,
      });

      const filterdPlaceList = _.filter(placeRelationList, {
        main_seq: mainSeq,
      });

      /** @type {msInfo} */
      const mainStorageInfo = {
        msFieldInfo: mainInfo,
        msClient: null,
        msDataInfo: {
          dataLoggerList: filterdDataLoggerList,
          nodeList: filterdNodeList,
          placeList: filterdPlaceList,
          contractCmdList: [],
        },
        msUserList: [],
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  /**
   * Field Socket Client의 접속 변화가 생겼을 경우
   * @param {msInfo} msInfo
   */
  updateMsFieldClient(msInfo) {
    this.socketIoManager.submitMsClientStatus(msInfo);
  }

  /**
   * TODO: 사용자의 요청 명령에 대한 결과 처리 필요 시 작성
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} fieldMessage field 에서 요청한 명령에 대한 응답
   */
  responseFieldMessage(msInfo, fieldMessage) {}

  /**
   * SocketServer로 수신받은 DataLogger Node 정보
   * @param {msInfo} msInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드. 차후에 속도에 문제가 된다면 갱신된 노드만 적용토록 해야함.
   */
  updateNodeList(msInfo, renewalList) {
    this.socketIoManager.submitNodeListToIoClient(msInfo, renewalList);
  }

  /**
   * @desc SocketServer Observer Method Implement
   * SocketServer로 수신받은 DataLogger Order 정보
   * @param {msInfo} msInfo
   */
  updateContractCmdList(msInfo) {
    this.socketIoManager.submitOrderListToIoClient(msInfo);
  }
}
module.exports = Control;
