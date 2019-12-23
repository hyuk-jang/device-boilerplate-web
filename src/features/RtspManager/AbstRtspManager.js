class AbstRtspManager {
  /** @param {MainControl} controller */
  constructor(controller) {
    // controller에서 받아옴
    this.controller = controller;

    this.io = null;

    this.cronScheduler = null;

    this.rtspStreamList = [];
  }

  /**
   * RTSP 통신 초기화
   * @param {Object} rtspConfig Express App
   * @param {string} rtspConfig.rtspUrl RTSP URL
   * @param {number} rtspConfig.streamWebPort Local Web Server Port
   */
  init(rtspConfig) {}

  /**
   * @param {SocketIO} socketIo SocketIO 객체
   */
  bindingSocketIO(socketIo) {}

  /**
   * RTSP Server 로 접속
   * @param {string} rtspUrl RTSP URL
   */
  connectRtspServer(rtspUrl) {}
}
module.exports = AbstRtspManager;
