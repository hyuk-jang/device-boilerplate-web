const _ = require('lodash');
const { BU } = require('base-util-jh');

const Control = require('../../Control');

const Weathercast = require('../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../features/ApiCommunicator/ApiServer');

// const RtspManager = require('../../features/RtspManager/ToFFMPEG');
const RtspManager = require('../../features/RtspManager/ToIMG');

const DBA = require('../../../../device-boilerplate-abbreviation');

class UpsasControl extends Control {
  bindingFeature() {
    BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    /** @type {SocketIOManager} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);

    /** @type {RtspManager} */
    this.rtspManager = new RtspManager(this);
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
    BU.CLI('runFeature');
    const { ioConfig, apiConfig, rtspConfig } = featureConfig;
    // this.weathercast.init(this.dbInfo);
    this.socketIoManager.init(ioConfig);

    this.apiServer.init(apiConfig);

    // API 에서 발생하는 각종 이슈들을 처리할 옵저버 세팅
    this.apiServer.attach(this);

    // this.rtspManager.bindingSocketIO(this.socketIoManager.io);

    // this.rtspManager.init(rtspConfig);

    // this.createMuanCCTV();
  }

  // /**
  //  * @desc Step 1
  //  * Main Storage List를 초기화
  //  * @param {dbInfo=} dbInfo
  //  */
  // async setMainStorage(dbInfo) {
  //   await super.setMainStorage(dbInfo);
  // }
}
module.exports = UpsasControl;
