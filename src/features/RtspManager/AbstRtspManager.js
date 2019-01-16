class AbstRtspManager {
  /** @param {MainControl} controller */
  constructor(controller) {
    // controller에서 받아옴
  }

  /**
   * RTSP 통신 초기화
   * @param {Object} RtspConfig
   * @param {string} RtspConfig.url RTSP 주소
   * @param {express} RtspConfig.app express App
   */
  init(RtspConfig) {}

  /**
   * 운영 중인 express App에 RTSP Stream 데이터를 연결(pipe) 처리 함.
   * @param {express} app
   */
  appSetting(app) {}

  /**
   * RTSP Server 로 접속
   * @param {string} rtspUrl RTSP URL
   */
  connectRtspServer(rtspUrl) {}
}
module.exports = AbstRtspManager;
