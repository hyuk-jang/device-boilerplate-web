const Control = require('./Control');
const FpRndControl = require('./projects/FP/RnD/FpRndControl');

/**
 * 프로젝트에 따라 Control과 Model을 생성.
 */
class Main {
  /**
   * @param {integratedDataLoggerConfig} config
   */
  createControl(config = {}) {
    const { projectInfo = {} } = config;
    const { projectMainId, projectSubId } = projectInfo;

    let MainControl = Control;

    switch (projectMainId) {
      // case 'UPSAS':
      //   switch (projectSubId) {
      //     case 'muan':
      //       MainControl = MuanControl;
      //       MainModel = MuanModel;
      //       break;
      //     default:
      //       break;
      //   }
      //   break;
      case 'FP':
        switch (projectSubId) {
          case 'RnD':
            MainControl = FpRndControl;
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
