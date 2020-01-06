const _ = require('lodash');
const { BU } = require('base-util-jh');

const Control = require('../../Control');

const Weathercast = require('../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../features/ApiCommunicator/ApiServer');

// const RtspManager = require('../../features/RtspManager/ToFFMPEG');
const RtspManager = require('../../features/RtspManager/ToIMG');

class UpsasControl extends Control {
  bindingFeature() {
    // BU.CLI('bindingFeature');
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
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {
    const { isStopWeathercast = false, ioConfig, apiConfig, rtspConfig } = featureConfig;

    // 기상청 동네예보 스케줄러 구동
    !isStopWeathercast && this.weathercast.init(this.dbInfo);

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
