const _ = require('lodash');
const { BU } = require('base-util-jh');

const uuidv4 = require('uuid/v4');
const Server = require('socket.io');

const net = require('net');
// const map = require('../../../public/Map/map');

// const {
//   requestOrderCommandType,
//   combinedOrderType,
//   simpleOrderStatus,
// } = require('../../../../../module/default-intelligence').dcmConfigModel;

/** 무안 6kW TB */

class SocketIoManager {
  constructor() {
    this.connectedSocketList = [];
  }

  /**
   * Web Socket 설정
   * @param {Object} http
   */
  setSocketIO(http) {
    this.io = new Server(http);

    this.io.on('connection', socket => {
      this.connectedSocketList.push(socket);

      // // 접속한 Socket 등록
      // socket.on('certifySocket', target => {
      //   /** @type {msUserInfo} */
      //   const msUser = target;
      //   // 접속한 Socket 정보 정의
      //   msUser.socketClient = socket;

      //   // Main 정보(거점)의 ID가 동일한 객체 탐색
      //   const foundIt = _.find(this.mainStorageList, msInfo =>
      //     _.isEqual(msInfo.msFieldInfo.main_seq, msUser.sessionUserInfo.main_seq),
      //   );

      //   // 거점을 찾을 경우 초기 값을 보내줌.
      //   if (foundIt) {
      //     foundIt.msUserList.push(msUser);

      //     const { simpleOrderList } = foundIt.msDataInfo;

      //     let connectedStatus = 'Disconnected';
      //     if (foundIt.msClient instanceof net.Socket) {
      //       connectedStatus = 'Connected';
      //     }

      //     const pickedNodeList = this.pickNodeList();
      //     // BU.CLI(pickedNodeList);
      //     socket.emit('updateNodeInfo', pickedNodeList);
      //   }
      // });

      // 연결 해제한 Socket 제거
      socket.on('disconnect', () => {
        _.remove(this.connectedSocketList, connSocket => _.isEqual(connSocket, socket));
      });

      // socket.on('executeCommand', msg => {
      //   // BU.CLI(msg)
      //   /** @type {defaultFormatToRequest} */
      //   const defaultFormatToRequestInfo = msg;

      //   // uuid 추가
      //   defaultFormatToRequestInfo.uuid = uuidv4();
      //   // Main Storage 찾음.
      //   const msInfo = this.findMainStorageBySocketClient(socket);

      //   // Data Logger와 연결이 되어야만 명령 요청 가능
      //   if (msInfo && msInfo.msClient instanceof net.Socket) {
      //     // Socket Client로 명령 전송
      //     msInfo.msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
      //   }
      // });
    });
  }

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {msDataInfo} dataInfo
   */
  pickNodeList(dataInfo) {
    const pickList = ['node_id', 'nd_target_name', 'data'];
    return _(dataInfo.nodeList)
      .map(nodeInfo => {
        const placeNameList = _(dataInfo.placeList)
          .filter(placeInfo => placeInfo.node_real_id === nodeInfo.node_real_id)
          .map(pInfo => pInfo.place_name)
          .value();
        //  _.filter(dataInfo.placeList, placeInfo => {
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
}
module.exports = SocketIoManager;
