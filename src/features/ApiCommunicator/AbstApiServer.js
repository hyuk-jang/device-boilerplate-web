const _ = require('lodash');
const net = require('net');

const { BU } = require('base-util-jh');

class AbstApiServer {
  /** @param {MainControl} controller */
  constructor(controller) {
    // controller에서 받아옴
    this.controller = controller;
    this.controlModel = controller.controlModel;
    this.defaultConverter = controller.defaultConverter;
    this.mainStorageList = controller.mainStorageList;

    this.observers = [];

    this.fieldEventList = [];

    // this.init = _.once(this.init);
  }

  /**
   * Socket Server 구동
   * @param {Object} apiConfig API Communicator 설정
   * @param {number} apiConfig.socketPort API Communicator 설정
   */
  init(apiConfig) {}

  /**
   *
   * @param {Observer} observer
   */
  attach(observer) {
    this.observers.push(observer);
  }

  /**
   * Main Storage 안에 있는 데이터 중 client와 동일한 객체 반환
   * @param {net.Socket} fieldClient
   * @return {msInfo}
   */
  findMainStorage(fieldClient) {}

  /**
   * Field Client 인증을 하고자 할 경우
   * FIXME: uuid를 통한 인증을 함. Diffle Hellman 으로 추후 변경해야 할 듯
   * @param {net.Socket} fieldClient
   * @param {defaultFormatToRequest} fieldMessage
   * @return {defaultFormatToResponse}
   */
  certifyFieldClient(fieldClient, fieldMessage) {}

  /**
   * 보내온 명령 성격에 따라 해석
   * @param {net.Socket} fieldSocket 필드 TCP/IP Socket
   * @param {defaultFormatToResponse} fieldData 필드에서 보내온 데이터
   */
  interpretData(fieldSocket, fieldData) {}

  /**
   * 웹에서 보낸 명령에 대한 응답 결과 해석
   * @param {net.Socket} fieldSocket 필드 TCP/IP Socket
   * @param {defaultFormatToResponse} fieldData 필드에서 보내온 데이터
   * @return {Promise}
   */
  interpertResponse(fieldClient, fieldData) {}

  /**
   * 필드에서 보내온 데이터를 해석
   * @param {net.Socket} fieldClient
   * @param {defaultFormatToRequest} fieldData 사이트에서 보내온 메시지
   * @return {defaultFormatToResponse} 정상적인 명령 해석이라면 true, 아니라면 throw
   */
  interpretCommand(fieldClient, fieldData) {}

  /**
   * 필드에서 수신받은 데이터를 DB에 반영하고자 할 경우
   * @param {{key: string, args: *}} fieldEventInfo 필드에서 수신받은 데이터 및 관리할 key
   */
  updateFieldEvent(fieldEventInfo) {}

  /**
   * 필드로부터 수신받은 데이터 DB 적용.
   * fieldEventList 순서대로 1개씩 처리하며 배열의 끝까지 도달하였을 경우 배열 초기화
   * @return {Promise}
   */
  updateOnFieldEvent(listIndex = 0) {}

  /**
   * @description dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {contractCmdInfo[]} fieldCmdList
   * @return {Promise}
   */
  updateControlEvent(msInfo, fieldCmdList = []) {}

  /**
   * 구동 모드 갱신 알림해올경우
   * @description dcmWsModel.transmitToServerCommandType.MODE 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {wsModeInfo} fieldModeInfo
   */
  updateOperationMode(msInfo, fieldModeInfo) {}

  /**
   * Site에서 보내온 NodeList 데이터와 현재 가지고 있는 데이터와 비교하여 변화가 있을 경우 해당 노드를 선별하여 부모 호출
   * @description dcmWsModel.transmitToServerCommandType.NODE 명령 처리 메소드
   * @param {msInfo} msInfo
   * @param {wsNodeInfo[]} fieldNodeList
   */
  compareNodeList(msInfo, fieldNodeList) {}

  /**
   * @description dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {contractCmdInfo[]} fieldCmdList
   */
  compareCommandList(msInfo, fieldCmdList) {}
}
module.exports = AbstApiServer;
