const AbstSensorProtocol = require('./SensorProtocol');
const FarmParallelSP = require('./FarmParallelSP');
const Solar2WaySP = require('./Solar2WaySP');
const EanTB1 = require('./EanTB1');

/**
 * 현재 프로젝트에 따라 Sensor Protocol을 선택하여 반환
 */
function selectSensorProtocol() {
  const projectMainId = process.env.PJ_MAIN_ID || 'FP';
  // const projectSubId = process.env.PJ_SUB_ID || 'RnD';

  let SensorProtocol = AbstSensorProtocol;

  switch (projectMainId) {
    case 'FP':
      SensorProtocol = FarmParallelSP;
      break;
    case 'S2W':
      SensorProtocol = Solar2WaySP;
      break;
    case 'Ean':
      SensorProtocol = EanTB1;
      break;
    default:
      break;
  }

  return SensorProtocol;
}

module.exports = selectSensorProtocol();
