const { BU } = require('base-util-jh');

const Control = require('../../../Control');

const Weathercast = require('../../../features/Weathercast/Weathercast');
const SocketIO = require('../../../features/SocketIO/SocketIO');

module.exports = class extends Control {
  bindingFeature() {
    BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    this.socketIoManager = new SocketIO();
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {Object} featureInfo
   * @param {httpServer} featureInfo.httpServer
   */
  runFeature(featureInfo) {
    // this.weathercast.init(this.dbInfo);
    this.socketIoManager.init();
  }
};
