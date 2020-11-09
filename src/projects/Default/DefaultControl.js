const _ = require('lodash');
const { BU } = require('base-util-jh');

const Control = require('../../Control');

const {
  ApiServer,
  SocketIOManager,
  ToIMG,
  Weathercast,
} = require('../../features/index');

module.exports = class extends Control {
  bindingFeature() {
    // BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();

    /** @type {SocketIOManager} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);

    /** @type {ToIMG} */
    this.rtspManager = new ToIMG(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {
    const {
      isStopWeathercast = false,
      isRunRtsp = false,
      ioConfig,
      apiConfig,
      rtspConfig,
    } = featureConfig;

    // 기상청 동네예보 스케줄러 구동
    !isStopWeathercast && this.weathercast.init(this.dbInfo);

    this.socketIoManager.init(ioConfig);

    this.apiServer.init(apiConfig);

    this.apiServer.attach(this);

    // RTSP 모드를 사용할 경우 구동
    if (isRunRtsp) {
      this.rtspManager.bindingSocketIO(this.socketIoManager.io);

      this.rtspManager.init(rtspConfig);
    }
  }
};
