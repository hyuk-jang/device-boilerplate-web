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
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {
    const { isStopWeathercast = false, ioConfig, apiConfig, rtspConfig } = featureConfig;

    // 기상청 동네예보 스케줄러 구동
    !isStopWeathercast && this.weathercast.init(this.dbInfo);

    // this.socketIoManager.init(ioConfig);

    // this.apiServer.init(apiConfig);
  }
}
module.exports = FpRndControl;
