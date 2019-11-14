const { BU } = require('base-util-jh');

const Control = require('./Control');
const UpsasControl = require('./projects/UPSAS/UpsasControl');
const FpRndControl = require('./projects/FP/RnD/FpRndControl');
const S2WRndControl = require('./projects/S2W/RnD/S2WRndControl');

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
        switch (projectSubId) {
          case 'RnD':
            MainControl = FpRndControl;
            break;
          default:
            break;
        }
        break;
      case 'S2W':
        switch (projectSubId) {
          case 'RnD':
            MainControl = S2WRndControl;
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }

    const mainControl = new MainControl(config);

    return mainControl;
  }
}
module.exports = Main;
