const solarIotConfig = require('./ETC/solarIot.config');
const fpConfig = require('./FarmParallel/fp.config');
const hsConfig = require('./S2W/hs.config');
const stpFirstConfig = require('./STP/first.config');
const smRooftop = require('./UPSAS/smRooftop.config');

module.exports = (mainId, subId) => {
  let projectConfig;
  switch (mainId) {
    case 'ETC':
      switch (subId) {
        default:
          projectConfig = solarIotConfig;
          break;
      }
      break;
    case 'FP':
      switch (subId) {
        default:
          projectConfig = fpConfig;
          break;
      }
      break;
    case 'S2W':
      switch (subId) {
        default:
          projectConfig = hsConfig;
          break;
      }
      break;
    case 'STP':
      switch (subId) {
        default:
          projectConfig = stpFirstConfig;
          break;
      }
      break;
    case 'UPSAS':
      switch (subId) {
        default:
          projectConfig = smRooftop;
          break;
      }
      break;

    default:
      break;
  }

  return projectConfig;
};
