const Control = require('../../Control');

const Weathercast = require('../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../features/ApiCommunicator/ApiServer');

class UpsasControl extends Control {
  bindingFeature() {
    this.weathercast = new Weathercast();
    /** @type {SocketIOManager} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {
    const { isStopWeathercast = false, ioConfig, apiConfig } = featureConfig;

    // 기상청 동네예보 스케줄러 구동
    !isStopWeathercast && this.weathercast.init(this.dbInfo);

    this.socketIoManager.init(ioConfig);

    this.apiServer.init(apiConfig);

    // API 에서 발생하는 각종 이슈들을 처리할 옵저버 세팅
    this.apiServer.attach(this);
  }
}
module.exports = UpsasControl;
