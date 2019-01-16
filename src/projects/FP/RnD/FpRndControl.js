const { BU } = require('base-util-jh');

const Control = require('../../../Control');

const Weathercast = require('../../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../../features/ApiCommunicator/ApiServer');

const ToFFMPEG = require('../../../features/RtspManager/ToFFMPEG');

class FpRndControl extends Control {
  bindingFeature() {
    BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    /** @type {SocketIO} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);

    /** @type {ToFFMPEG} */
    this.rtspManager = new ToFFMPEG();
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {Object} featureConfig
   * @param {Object} featureConfig.ioConfig SocketIOManager 설정
   * @param {httpServer} featureConfig.ioConfig.httpServer http 객체
   * @param {Object} featureConfig.rtspConfig rtspConfig 설정
   * @param {express} featureConfig.rtspConfig.app Express App
   * @param {string} featureConfig.rtspConfig.rtspUrl RTSP URL
   * @param {number} featureConfig.rtspConfig.webPort Local Web Server Port
   */
  runFeature(featureConfig) {
    const { ioConfig, rtspConfig } = featureConfig;
    // this.weathercast.init(this.dbInfo);
    this.socketIoManager.init(ioConfig);
    this.apiServer.init();

    this.rtspManager.init(rtspConfig);
  }

  /**
   *
   * @param {*} url
   * @param {express} app
   */
  runStream(url, app) {
    const streamManager = new ToFFMPEG(this.socketIoManager);

    // streamManager.init(app, 'rtsp://smsoft.iptime.org:30554/live.sdp');
    streamManager.init(app, 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov');
  }
}
module.exports = FpRndControl;
