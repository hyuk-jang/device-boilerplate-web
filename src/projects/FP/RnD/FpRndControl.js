const { BU } = require('base-util-jh');

const Control = require('../../../Control');

const Weathercast = require('../../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../../features/ApiCommunicator/ApiServer');

module.exports = class extends Control {
  bindingFeature() {
    BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    /** @type {SocketIO} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {Object} featureInfo
   * @param {httpServer} featureInfo.httpServer
   */
  runFeature(featureInfo) {
    const { httpServer } = featureInfo;
    // this.weathercast.init(this.dbInfo);
    this.socketIoManager.init(httpServer);
    this.apiServer.init();
  }
};
