const { BU } = require('base-util-jh');

const Control = require('./Control');
const DefaultControl = require('./projects/Default/DefaultControl');
const UpsasControl = require('./projects/UPSAS/UpsasControl');
const FpRndControl = require('./projects/FP/FpRndControl');
const S2WRndControl = require('./projects/S2W/S2WRndControl');

/**
 * 프로젝트에 따라 Control과 Model을 생성.
 */
class Main {
  /**
   * @param {Object} config
   * @param {Object} config.projectInfo
   * @param {string} config.projectInfo.projectMainId
   * @param {string} config.projectInfo.projectSubId
   * @param {dbInfo} config.dbInfo
   */
  createControl(config = {}) {
    const { projectInfo = {} } = config;
    const { projectMainId, projectSubId } = projectInfo;

    // BU.CLI('projectMainId', projectInfo);

    let MainControl = Control;

    switch (projectMainId) {
      case 'UPSAS':
        MainControl = UpsasControl;
        break;
      case 'FP':
        MainControl = FpRndControl;
        break;
      case 'HS':
      case 'S2W':
        MainControl = S2WRndControl;
        break;
      default:
        MainControl = DefaultControl;
        break;
    }

    const mainControl = new MainControl(config);

    return mainControl;
  }
}
module.exports = Main;
