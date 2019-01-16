const _ = require('lodash');
const { BU } = require('base-util-jh');

const uuidv4 = require('uuid/v4');
const SocketIO = require('socket.io');

const net = require('net');

const AbstSocketIOManager = require('./AbstSocketIOManager');

const {
  requestOrderCommandType,
  combinedOrderType,
  simpleOrderStatus,
} = require('../../../../default-intelligence').dcmConfigModel;
/** 무안 6kW TB */

class SocketIOManager extends AbstSocketIOManager {
  /**
   * Web Socket 설정
   * @param {Object} ioConfig SocketIOManager 설정
   * @param {httpServer} ioConfig.httpServer http 객체
   */
  init(ioConfig) {
    const { httpServer } = ioConfig;
    this.setSocketIO(httpServer);
  }

  /**
   * Web Socket 설정
   * @param {httpServer} httpServer
   */
  setSocketIO(httpServer) {
    this.io = new SocketIO(httpServer);

    this.io.on('connection', socket => {
      // BU.CLI('connection');
      // 접속한 Socket 등록
      socket.on('certifySocket', target => {
        /** @type {msUserInfo} */
        const msUser = target;
        // 접속한 Socket 정보 정의
        msUser.socketClient = socket;

        const { sessionUserInfo } = msUser;
        const { main_seq: mainSeq } = sessionUserInfo;

        // Main 정보(거점)의 ID가 동일한 객체 탐색
        const foundMsInfo = _.find(this.mainStorageList, msInfo =>
          _.isEqual(msInfo.msFieldInfo.main_seq, mainSeq),
        );

        // 거점을 찾을 경우 초기 값을 보내줌.
        if (foundMsInfo) {
          foundMsInfo.msUserList.push(msUser);

          const { simpleOrderList } = foundMsInfo.msDataInfo;

          let connectedStatus = 'Disconnected';
          if (foundMsInfo.msClient instanceof net.Socket) {
            connectedStatus = 'Connected';
          }

          const pickedNodeList = this.pickNodeList(foundMsInfo.msDataInfo);
          // BU.CLI(pickedNodeList);
          // Site 접속 상태 코드 전송
          socket.emit('updateMsClientStatus', connectedStatus);
          // NodeList 에서 선택한 key 만을 정제해서 전송
          socket.emit('updateNodeInfo', pickedNodeList);
          // OrderList에서 명령 타입을 한글로 변환 후 전송
          socket.emit('updateOrderInfo', this.pickSimpleOrderList(simpleOrderList));
        }
      });

      // 연결 해제한 Socket 제거
      socket.on('disconnect', () => {
        _.forEach(this.mainStorageList, msInfo =>
          _.remove(msInfo.msUserList, msUserInfo => _.isEqual(msUserInfo.socketClient, socket)),
        );
      });

      // 사용자 브라우저에서 명령 요청이 발생할 경우 처리
      socket.on('executeCommand', msg => {
        // BU.CLI(msg)
        /** @type {defaultFormatToRequest} */
        const defaultFormatToRequestInfo = msg;

        // uuid 추가
        defaultFormatToRequestInfo.uuid = uuidv4();
        // Main Storage 찾음.
        const msInfo = this.findMainStorageBySocketClient(socket);

        // Data Logger와 연결이 되어야만 명령 요청 가능
        if (msInfo && msInfo.msClient instanceof net.Socket) {
          // Socket Client로 명령 전송
          msInfo.msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
        }
      });
    });
  }

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {msDataInfo} dataInfo
   */
  pickNodeList(dataInfo) {
    const pickList = ['node_id', 'nd_target_name', 'data'];
    const { nodeList, placeList } = dataInfo;
    return _(nodeList)
      .map(nodeInfo => {
        const placeNameList = _(placeList)
          .filter(placeInfo => placeInfo.node_real_id === nodeInfo.node_real_id)
          .map(pInfo => pInfo.place_name)
          .value();
        //  _.filter(placeList, placeInfo => {
        //   placeInfo.node_real_id === nodeInfo.node_real_id;
        // })
        return _(nodeInfo)
          .pick(pickList)
          .assign({ place_name_list: placeNameList })
          .value();
      })
      .sortBy('node_id')
      .value();
  }

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {simpleOrderInfo[]} simpleOrderList
   */
  pickSimpleOrderList(simpleOrderList) {
    const pickList = ['orderCommandType', 'orderStatus', 'commandId', 'commandName'];
    const returnValue = _.map(simpleOrderList, simpleOrderInfo => {
      const pickInfo = _.pick(simpleOrderInfo, pickList);

      // 명령 타입 한글로 변경
      switch (simpleOrderInfo.orderCommandType) {
        case requestOrderCommandType.CONTROL:
          pickInfo.orderCommandType = '명령 제어';
          break;
        case requestOrderCommandType.CANCEL:
          pickInfo.orderCommandType = '명령 취소';
          break;
        case requestOrderCommandType.MEASURE:
          pickInfo.orderCommandType = '계측';
          break;
        default:
          pickInfo.orderCommandType = '알수없음';
          break;
      }

      // 명령 상태 한글로 변경
      switch (simpleOrderInfo.orderStatus) {
        case simpleOrderStatus.NEW:
          pickInfo.orderStatus = '대기 중';
          pickInfo.index = 0;
          break;
        case simpleOrderStatus.PROCEED:
          pickInfo.orderStatus = '진행 중';
          pickInfo.index = 1;
          break;
        case simpleOrderStatus.COMPLETE:
          pickInfo.orderStatus = '완료';
          pickInfo.index = 2;
          break;
        default:
          pickInfo.orderStatus = '알수없음';
          pickInfo.index = 3;
          break;
      }
      return pickInfo;
    });

    return _.sortBy(returnValue, 'index');
  }

  /**
   * 접속한 SocketIO 객체 정보가 등록된 Main Storage를 반환
   * @param {net.Socket} socket
   */
  findMainStorageBySocketClient(socket) {
    return _.find(this.mainStorageList, msInfo =>
      _.find(msInfo.msUserList, { socketClient: socket }),
    );
  }

  /**
   * Data Logger 상태를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitMsClientStatus(msInfo) {
    let connectedStatus = 'Disconnected';
    if (msInfo.msClient instanceof net.Socket) {
      connectedStatus = 'Connected';
    }
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateMsClientStatus', connectedStatus);
    });
  }

  /**
   * 등록되어져 있는 노드 리스트를 io Client로 보냄.
   * @param {msInfo} msInfo
   */
  submitNodeListToIoClient(msInfo) {
    const simpleNodeList = this.pickNodeList(msInfo.msDataInfo);
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateNodeInfo', simpleNodeList);
    });
  }

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitOrderListToIoClient(msInfo) {
    const pickedOrderList = this.pickSimpleOrderList(msInfo.msDataInfo.simpleOrderList);
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateOrderInfo', pickedOrderList);
    });
  }
}
module.exports = SocketIOManager;
