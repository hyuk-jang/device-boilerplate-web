const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const controlDom = require('../../models/domMaker/controlDom');

const commonUtil = require('../../models/templates/common.util');

/* GET users listing. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // res.send('respond with a resource');

    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', mainWhere);
    /** @type {MAIN_MAP} */
    const mainMapRow = await biModule.getTableRow('main_map', mainWhere);

    /** @type {V_DV_NODE[]} */
    const nodeList = await biModule.getTable('v_dv_node', mainWhere);

    // 장치 카테고리 별 Dom 생성
    const deviceDomList = controlDom.makeNodeDom(nodeList);
    const sensorDomList = controlDom.makeNodeDom(nodeList, false);

    // BU.CLI(deviceInfoList);

    /** @type {V_DV_PLACE[]} */
    const placeList = await biModule.getTable('v_dv_place', mainWhere);

    // BU.CLI(placeList);

    // BU.CLIN(mainRow.map);
    /** @type {mDeviceMap} */
    const map = JSON.parse(mainRow.map);

    initCommand(map, placeList);

    // const flowCmdDom = controlDom.makeFlowCmdDom(placeList, map.controlInfo.flowCmdList);

    // BU.CLI(flowCmdDom);

    // 명령 정보만 따로 저장
    req.locals.controlInfo = map.controlInfo;
    delete map.controlInfo;

    //  로그인 한 사용자 세션 저장
    req.locals.sessionID = req.sessionID;
    req.locals.user = req.user;
    //  Map 경로 재설정
    _.set(map, 'drawInfo.frame.mapInfo.backgroundInfo.backgroundData', `/map/${mainMapRow.path}`);
    req.locals.map = map;

    req.locals.deviceDomList = deviceDomList;

    // BU.CLI(req.locals);

    res.render('./UPSAS/structure/structure', req.locals);
  }),
);

module.exports = router;

/**
 *
 * @param {mDeviceMap} deviceMap
 * @param {V_DV_PLACE[]} placeList
 */
function initCommand(deviceMap, placeList) {
  const {
    controlInfo: { flowCmdList, setCmdList, scenarioCmdList },
  } = deviceMap;

  // 단순 명령을 쉽게 인식하기 위한 한글 명령을 입력
  flowCmdList.forEach((flowSrcInfo, srcIndex) => {
    const { srcPlaceId, destList } = flowSrcInfo;
    // 출발지 한글 이름
    let { srcPlaceName } = flowSrcInfo;

    if (_.isNil(srcPlaceName)) {
      srcPlaceName = _.chain(placeList)
        .find({ place_id: srcPlaceId })
        .get('place_name')
        .value();
    }
    // 출발지 한글이름 추가
    // simpleCommandInfo.srcPlaceName ||
    _.set(flowSrcInfo, 'srcPlaceName', srcPlaceName);
    // 목적지 목록을 순회하면서 상세 명령 정보 정의
    destList.forEach((flowDesInfo, desIndex) => {
      const { destPlaceId } = flowDesInfo;
      let { destPlaceName } = flowDesInfo;
      // 목적지 한글 이름
      if (_.isNil(destPlaceName)) {
        destPlaceName = _.chain(placeList)
          .find({ place_id: destPlaceId })
          .get('place_name')
          .value();
      }

      flowSrcInfo.destList[desIndex] = {
        cmdId: destPlaceId,
        cmdName: destPlaceName,
      };

      // 목적지 한글이름 추가 및 명령 정보 정의
      // _.set(scDesInfo, 'destPlaceName', destPlaceName);
      // _.set(scDesInfo, 'cmdId', `${srcPlaceId}_TO_${destPlaceId}`);
      // _.set(scDesInfo, 'cmdName', `${srcPlaceName} → ${destPlaceName}`);
    });

    flowCmdList[srcIndex] = {
      cmdId: srcPlaceId,
      cmdName: srcPlaceName,
      destList,
    };
  });

  // 설정 명령 세팅
  setCmdList.forEach((cmdInfo, index) => {
    const { cmdId, cmdName = '' } = cmdInfo;

    setCmdList[index] = {
      cmdId,
      cmdName: cmdName.length ? cmdName : cmdId,
    };
    // setCmdInfo.scenarioName = cmdName.length ? cmdName : cmdId;
  });

  // 시나리오 명령 세팅
  scenarioCmdList.forEach((cmdInfo, index) => {
    const { scenarioId: cmdId, scenarioName: cmdName = '' } = cmdInfo;

    scenarioCmdList[index] = {
      cmdId,
      cmdName: cmdName.length ? cmdName : cmdId,
    };
    // scenarioCmdInfo.scenarioName = scenarioName.length ? scenarioName : scenarioId;
  });

  const mapCmdInfo = {
    /** @type {flowCmdInfo[]} 기존 Map에 있는 Flow Command를 변형 처리 */
    flowCmdList,
    setCmdList,
    scenarioCmdList,
  };

  return mapCmdInfo;
}
