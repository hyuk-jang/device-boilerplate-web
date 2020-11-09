const EtcDP = require('./EtcDP');
const FarmParallelDP = require('./FarmParallelDP');
const Solar2WayDP = require('./Solar2WayDP');
const UpsasDP = require('./UpsasDP');

/**
 * 현재 프로젝트에 따라 Sensor Protocol을 선택하여 반환
 */
function selectDeviceProtocol() {
  const projectMainId = process.env.PJ_MAIN_ID || 'FP';
  // const projectSubId = process.env.PJ_SUB_ID || 'RnD';

  let DeviceProtocol;
  // let DeviceProtocol = AbstDeviceProtocol;
  switch (projectMainId) {
    case 'ETC':
      DeviceProtocol = EtcDP;
      break;
    case 'FP':
      DeviceProtocol = FarmParallelDP;
      break;
    case 'HS':
    case 'S2W':
      DeviceProtocol = Solar2WayDP;
      break;
    case 'UPSAS':
      DeviceProtocol = UpsasDP;
      break;
    default:
      break;
  }

  return DeviceProtocol;
}

module.exports = selectDeviceProtocol();
