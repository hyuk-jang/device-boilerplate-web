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
    //  Map 저장
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
  flowCmdList.forEach(flowCmdInfo => {
    const { srcPlaceId } = flowCmdInfo;
    // 출발지 한글 이름
    let { srcPlaceName } = flowCmdInfo;

    if (_.isNil(srcPlaceName)) {
      srcPlaceName = _.chain(placeList)
        .find({ place_id: srcPlaceId })
        .get('place_name')
        .value();
    }
    // 출발지 한글이름 추가
    // simpleCommandInfo.srcPlaceName ||
    _.set(flowCmdInfo, 'srcPlaceName', srcPlaceName);
    // 목적지 목록을 순회하면서 상세 명령 정보 정의
    flowCmdInfo.destList.forEach(scDesInfo => {
      const { destPlaceId } = scDesInfo;
      let { destPlaceName } = scDesInfo;
      // 목적지 한글 이름
      if (_.isNil(destPlaceName)) {
        destPlaceName = _.chain(placeList)
          .find({ place_id: destPlaceId })
          .get('place_name')
          .value();
      }

      // 목적지 한글이름 추가 및 명령 정보 정의
      _.set(scDesInfo, 'destPlaceName', destPlaceName);
      _.set(scDesInfo, 'cmdId', `${srcPlaceId}_TO_${destPlaceId}`);
      _.set(scDesInfo, 'cmdName', `${srcPlaceName} → ${destPlaceName}`);
    });
  });

  const mapCmdInfo = {
    /** @type {flowCmdInfo[]} 기존 Map에 있는 Flow Command를 변형 처리 */
    flowCmdList,
    setCmdList,
    scenarioCmdList,
  };

  return mapCmdInfo;
}
