const EventEmitter = require('events');
const _ = require('lodash');

const { BU } = require('base-util-jh');

const { BM } = require('base-model-jh');

const AbstApiClient = require('./features/ApiCommunicator/AbstApiClient');
const AbstSocketIO = require('./features/SocketIO/AbstSocketIO');
const AbstWeathercast = require('./features/Weathercast/AbstWeathercast');

const { BaseModel } = require('../../../module/device-protocol-converter-jh');

// class Control extends EventEmitter {
class Control {
  constructor(config = {}) {
    // super();

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
    this.apiClient = new AbstApiClient();
    this.socketIoManager = new AbstSocketIO();
    this.weathercast = new AbstWeathercast();
  }

  /** 생성된 Feature를 구동시킴 */
  runFeature() {}

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
          simpleOrderList: [],
        },
        msUserList: [],
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  /**
   * SocketIO 설정
   * @param {Object} httpObj
   */
  setSocketIO(httpObj) {
    // SocketIO Manager에게 객체 생성 요청
    this.socketIoManager.setSocketIO(httpObj);
  }

  /**
   * Data Logger와의 접속에 변화가 생겼을 경우 이벤트 발생 핸들러
   * @param {msInfo} msInfo
   */
  updateMsClient(msInfo) {
    this.socketIoManager.submitMsClientStatus(msInfo);
  }

  /**
   * SocketServer로 수신받은 DataLogger Node 정보
   * @param {msInfo} msInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드. 차후에 속도에 문제가 된다면 갱신된 노드만 적용토록 해야함.
   */
  updateNodeList(msInfo, renewalList) {
    this.socketIoManager.submitNodeListToIoClient(msInfo);
  }

  /**
   * @desc SocketServer Observer Method Implement
   * SocketServer로 수신받은 DataLogger Order 정보
   * @param {msInfo} msInfo
   */
  updateSimpleOrderList(msInfo) {
    this.socketIoManager.submitOrderListToIoClient(msInfo);
  }

  /**
   * FIXME: 브라우저를 통해 DataLogger로 명령을 요청한 결과를 추적하고 싶다면 해당 브라우저 명령 리스트를 관리하고 이 메소드에서 처리해야함.
   * 현재는 명령 추적 하지 않음.
   * @desc SocketServer Observer Method Implement
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} requestedDataByDataLogger
   */
  responsedDataFromDataLogger(msInfo, requestedDataByDataLogger) {}
}
module.exports = Control;
