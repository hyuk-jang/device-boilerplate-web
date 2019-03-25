const _ = require('lodash');
const { BU } = require('base-util-jh');

const Control = require('../../../Control');

const Weathercast = require('../../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../../features/ApiCommunicator/ApiServer');

// const RtspManager = require('../../../features/RtspManager/ToFFMPEG');
// const RtspManager = require('../../../features/RtspManager/ToIMG');

class FpRndControl extends Control {
  bindingFeature() {
    BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    // /** @type {SocketIOManager} */
    // this.socketIoManager = new SocketIOManager(this);

    // /** @type {ApiServer} */
    // this.apiServer = new ApiServer(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {Object} featureConfig
   * @param {Object} featureConfig.ioConfig SocketIOManager 설정
   * @param {httpServer} featureConfig.ioConfig.httpServer http 객체
   * @param {Object} featureConfig.apiConfig API Communicator 설정
   * @param {number} featureConfig.apiConfig.socketPort API Communicator 설정
   * @param {Object} featureConfig.rtspConfig rtspConfig 설정
   * @param {string} featureConfig.rtspConfig.rtspUrl RTSP URL
   * @param {number} featureConfig.rtspConfig.webPort Local Web Server Port
   */
  runFeature(featureConfig) {
    const { ioConfig, apiConfig, rtspConfig } = featureConfig;
    this.weathercast.init(this.dbInfo);
    // this.socketIoManager.init(ioConfig);

    // this.apiServer.init(apiConfig);
  }
}
module.exports = FpRndControl;
