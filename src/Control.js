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
    this.biModule = new BM(dbInfo);

    // DB에서 main 정보를 가져옴
    /** @type {MAIN[]} */
    let mainList = await this.biModule.getTable('main', { is_deleted: 0 });

    /** @type {dataLoggerInfo[]} */
    const dataLoggerList = await this.biModule.getTable('v_dv_data_logger');
    /** @type {nodeInfo[]} */
    const nodeList = await this.biModule.getTable('v_dv_node');

    // 장소 단위로 묶을 장소 목록을 가져옴
    /** @type {V_DV_PLACE[]} */
    const placeList = await this.biModule.getTable('v_dv_place');

    /** @type {placeInfo[]} */
    const placeRelationList = await this.biModule.getTable('v_dv_place_relation');

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

      // API 서버로 필수 데이터만을 전송하기 위한 flag 설정을 위한 Map 표기 Node 내역 추출
      const svgNodeList = _(_.get(deviceMap, 'drawInfo.positionInfo.svgNodeList', []))
        .map('defList')
        .flatten()
        .value();

      const where = {
        main_seq: mainSeq,
      };

      const filteredPlaceRelationList = _.filter(placeRelationList, where);
      /** @type {nodeInfo[]} */
      const filteredNodeList = [];

      filteredPlaceRelationList.forEach(plaRelRow => {
        // 장소 시퀀스와 노드 시퀀스를 불러옴
        const { place_seq: placeSeq, node_seq: nodeSeq, node_id: nodeId } = plaRelRow;
        // 장소 시퀀스를 가진 객체 검색
        const placeInfo = _.find(placeList, { place_seq: placeSeq });
        // 노드 시퀀스를 가진 객체 검색
        const nodeInfo = _.find(nodeList, { node_seq: nodeSeq });

        // 장소에 해당 노드가 있다면 자식으로 설정. nodeList 키가 없을 경우 생성
        if (_.isObject(placeInfo) && _.isObject(nodeInfo)) {
          // 해당 svg 노드 목록 중에 id와 매칭되는 Node Id 객체가 존재할 경우 API Client 전송 flag 설정
          _.find(svgNodeList, { id: nodeId }) &&
            _.isUndefined(_.find(filteredNodeList, { node_id: nodeId })) &&
            filteredNodeList.push(nodeInfo);
        }
      });

      /** @type {msInfo} */
      const mainStorageInfo = {
        msFieldInfo: mainInfo,
        msClient: null,
        msDataInfo: {
          dataLoggerList: _.filter(dataLoggerList, where),
          nodeList: filteredNodeList,
          placeList: filteredPlaceRelationList,
          contractCmdList: [],
        },
        msUserList: [],
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  //   /**
  //  * @desc Step 2
  //  * Storage를 구동하기 위한 자식 객체를 생성
  //  */
  // setChildren() {
  //   // 소켓 서버 구동
  //   this.socketServer = new SocketServer({
  //     dbInfo: this.config.dbInfo,
  //     socketServerPort: this.config.socketServerPort,
  //   });
  //   this.socketServer.mainStorageList = this.mainStorageList;
  //   // socket Server의 갱신 내용을 받기위해 Observer 등록
  //   this.socketServer.attach(this);
  //   this.socketServer.init();

  //   // 태양광 발전 현황판 데이터 생성 객체
  //   this.powerStatusMaker = new PowerStatusMaker({
  //     dbInfo: this.config.dbInfo,
  //   });
  //   this.powerStatusMaker.mainStorageList = this.mainStorageList;
  //   this.powerStatusMaker.runCronCalcPowerStatus();
  // }

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
  responseFieldMessage(msInfo, fieldMessage) {
    BU.CLI('responseFieldMessage');
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
