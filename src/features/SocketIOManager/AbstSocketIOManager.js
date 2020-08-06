class AbstSocketIOManager {
  /** @param {MainControl} controller */
  constructor(controller) {
    // controller에서 받아옴
    this.controller = controller;
    this.defaultConverter = controller.defaultConverter;
    this.mainStorageList = controller.mainStorageList;

    this.io;
  }

  /**
   * Web Socket 설정
   * @param {Object} ioConfig SocketIOManager 설정
   * @param {httpServer} ioConfig.httpServer http 객체
   */
  init(ioConfig) {}

  /**
   * Web Socket 설정
   * @param {HttpServer} httpServer
   */
  setSocketIO(httpServer) {}

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {msDataInfo} dataInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드
   */
  pickNodeList(dataInfo, renewalList) {}

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {contractCmdInfo[]} contractCmdList
   */
  pickContractCmdList(contractCmdList) {}

  /**
   * 접속한 SocketIO 객체 정보가 등록된 Main Storage를 반환
   * @param {net.Socket} socket
   * @return {msInfo}
   */
  findMainStorage(socket) {}

  /**
   * Data Logger 상태를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitApiClientIsConn(msInfo) {}

  /**
   * 제어 모드 업데이트
   * @param {msInfo} msInfo
   */
  submitMode(msInfo) {}

  /**
   * 등록되어져 있는 노드 리스트를 io Client로 보냄.
   * @param {msInfo} msInfo
   */
  submitNodeList(msInfo) {}

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitCommandList(msInfo) {}

  /**
   * 현재 추적 중인 이미지를 보냄
   * @param {msInfo} msInfo
   */
  submitSvgImgList(msInfo) {}

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} execCommandResultInfo
   */
  submitExecCommandResult(msInfo, execCommandResultInfo) {}
}
module.exports = AbstSocketIOManager;
