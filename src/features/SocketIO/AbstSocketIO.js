const _ = require('lodash');
const { BU } = require('base-util-jh');

const net = require('net');

module.exports = class {
  /** @param {MainControl} controller */
  constructor(controller) {
    // controller에서 받아옴
    this.controller = controller;
    this.defaultConverter = controller.defaultConverter;
    this.mainStorageList = controller.mainStorageList;

    this.io;
  }

  /**
   *
   * @param {HttpServer} httpServer
   */
  init(httpServer) {}

  /**
   * Web Socket 설정
   * @param {HttpServer} httpServer
   */
  setSocketIO(httpServer) {}

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {msDataInfo} dataInfo
   */
  pickNodeList(dataInfo) {}

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {simpleOrderInfo[]} simpleOrderList
   */
  pickSimpleOrderList(simpleOrderList) {}

  /**
   * 접속한 SocketIO 객체 정보가 등록된 Main Storage를 반환
   * @param {net.Socket} socket
   */
  findMainStorageBySocketClient(socket) {}

  /**
   * Data Logger 상태를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitMsClientStatus(msInfo) {}

  /**
   * 등록되어져 있는 노드 리스트를 io Client로 보냄.
   * @param {msInfo} msInfo
   */
  submitNodeListToIoClient(msInfo) {}

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitOrderListToIoClient(msInfo) {}
};
