const _ = require('lodash');
const { BU } = require('base-util-jh');
const { BM } = require('base-model-jh');

const { BaseModel } = require('../../../../module/device-protocol-converter-jh');

const SocketServer = require('./SocketServer');
// const PowerStatusMaker = require('./PowerStatusMaker');

const dsmConfig = require('./config');

// const SocketIoManager = require('./SocketIoManager');

class Control {
  /**
   *
   * @param {dsmConfig} config
   */
  constructor(config) {
    BU.CLI(config);
    this.config = config || dsmConfig;

    // this.map = this.controller.map;

    this.defaultConverter = BaseModel.defaultModule;
    /**
     * Main Storage List에서 각각의 거점 별 모든 정보를 가지고 있을 객체 정보 목록
     * @type {Array.<msInfo>}
     */
    this.mainStorageList = [];

    // SocketIO를 관리하는 객체 생성
    // this.socketIoManager = new SocketIoManager(this);
  }

  /**
   * Main Storage List를 설정하고 자식들을 구동
   */
  async init() {
    // BU.CLI('?');
    await this.setMainStorageByDB();

    // BU.CLIN(this.mainStorageList);
    this.setChildren();
  }

  /**
   * @desc Step 1
   * Main Storage List를 초기화
   * @param {dbInfo=} dbInfo
   */
  async setMainStorageByDB(dbInfo) {
    dbInfo = dbInfo || this.config.dbInfo;

    BU.CLI(dbInfo);
    this.BM = new BM(dbInfo);

    // DB에서 main 정보를 가져옴
    /** @type {MAIN[]} */
    let mainList = await this.BM.getTable('main', { is_deleted: 0 });

    /** @type {dataLoggerInfo[]} */
    const dataLoggerList = await this.BM.getTable('v_dv_data_logger');
    /** @type {nodeInfo[]} */
    const nodeList = await this.BM.getTable('v_dv_node');

    /** @type {placeInfo[]} */
    const placeRelationList = await this.BM.getTable('v_dv_place_relation');

    // TEST: main Seq 1번에 강제로 데이터를 넣으므로 정렬 시킴
    mainList = _.sortBy(mainList, 'main_seq');
    // Main 정보 만큼 List 생성
    mainList.forEach(mainInfo => {
      const filterDataLoggerList = _.filter(dataLoggerList, {
        main_seq: mainInfo.main_seq,
      });
      const filterNodeList = _.filter(nodeList, {
        main_seq: mainInfo.main_seq,
      });

      const filterPlaceList = _.filter(placeRelationList, {
        main_seq: mainInfo.main_seq,
      });

      /** @type {msInfo} */
      const mainStorageInfo = {
        msFieldInfo: mainInfo,
        msClient: null,
        msDataInfo: {
          dataLoggerList: filterDataLoggerList,
          nodeList: filterNodeList,
          placeList: filterPlaceList,
          simpleOrderList: [],
        },
        msUserList: [],
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  /**
   * @desc Step 2
   * Storage를 구동하기 위한 자식 객체를 생성
   */
  setChildren() {
    // 소켓 서버 구동
    this.socketServer = new SocketServer({
      dbInfo: this.config.dbInfo,
      socketServerPort: this.config.socketServerPort,
    });
    this.socketServer.mainStorageList = this.mainStorageList;
    // socket Server의 갱신 내용을 받기위해 Observer 등록
    this.socketServer.attach(this);
    this.socketServer.init();

    // 태양광 발전 현황판 데이터 생성 객체
    // this.powerStatusMaker = new PowerStatusMaker({
    //   dbInfo: this.config.dbInfo,
    // });
    // this.powerStatusMaker.mainStorageList = this.mainStorageList;
    // this.powerStatusMaker.runCronCalcPowerStatus();
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
