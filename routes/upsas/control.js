const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');
const controlDom = require('../../models/domMaker/controlDom');

const commonUtil = require('../../models/templates/common.util');

const { wsPlaceRelationPickKey } = require('../../../default-intelligence').dcmWsModel;

const DEFAULT_CATEGORY = 'command';

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'command',
    btnName: '제어관리',
  },
  {
    subCategory: 'event',
    btnName: '이벤트관리',
  },
  {
    subCategory: 'threshold',
    btnName: '임계치관리',
  },
];

/* middleware. */
router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    const { subCategory = DEFAULT_CATEGORY } = req.params;

    // 선택된 subCategoryDom 정의
    const subCategoryDom = defaultDom.makeSubCategoryDom(subCategory, subCategoryList);
    _.set(req, 'locals.dom.subCategoryDom', subCategoryDom);

    //  로그인 한 사용자 세션 저장
    req.locals.sessionID = req.sessionID;
    req.locals.user = req.user;

    next();
  }),
);

/* GET 제어 관리. */
router.get(
  ['/', '/:siteId', '/:siteId/command'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // Site Sequence.지점 Id를 불러옴
    const { siteId, mainWhere } = req.locals.mainInfo;

    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', mainWhere);
    /** @type {MAIN_MAP} */
    const mainMapRow = await biModule.getTableRow('main_map', mainWhere);

    /** @type {V_DV_NODE[]} */
    const nodeRows = await biModule.getTable('v_dv_node', mainWhere);

    // 장치 카테고리 별 Dom 생성
    const deviceDomList = controlDom.makeNodeDom(nodeRows);
    const sensorDomList = controlDom.makeNodeDom(nodeRows, false);

    // BU.CLI(deviceInfoList);

    /** @type {V_DV_PLACE[]} */
    const placeRows = await biModule.getTable('v_dv_place', mainWhere);
    // BU.CLI(placeRows);

    // /** @type {V_DV_PLACE_RELATION[]} */
    // const placeRelationRows = await biModule.getTable('v_dv_place_relation', mainWhere);

    /**
     * Main Storage List에서 각각의 거점 별 모든 정보를 가지고 있을 객체 정보 목록
     * @type {msInfo[]} mainStorageList
     */
    /** @type {MainControl} */
    const mainController = global.mainControl;

    const foundMsInfo = _.find(mainController.mainStorageList, msInfo =>
      _.isEqual(msInfo.msFieldInfo.main_seq, _.get(req.user, 'main_seq', null)),
    );
    // BU.CLIN(foundMsInfo.msDataInfo.placeList);
    if (foundMsInfo) {
      const wsPlaceRelList = mainController.convertPlaRelsToWsPlaRels({
        placeRelationRows: foundMsInfo.msDataInfo.placeRelList,
        isSubmitAPI: 1,
      });
      // BU.CLIN(wsPlaceRelList);
      // FIXME: 만약 제어 장치도 넣고자 할 경우 EJS에서 달성 목표치를 제어할 수 있는 select or input 동적 분기 로직 추가
      req.locals.wsPlaceRelList = _.filter(wsPlaceRelList, { is: 1 }).map(pr => _.omit(pr, 'is'));
    } else {
      req.locals.wsPlaceRelList = [];
    }

    // BU.CLIN(mainRow.map);
    /** @type {mDeviceMap} */
    const map = JSON.parse(mainRow.map);

    controlDom.initCommand(map, placeRows);

    // const flowCmdDom = controlDom.makeFlowCmdDom(placeList, map.controlInfo.flowCmdList);

    // BU.CLI(flowCmdDom);

    // 명령 정보만 따로 저장
    req.locals.controlInfo = map.controlInfo;
    delete map.controlInfo;

    //  Map 경로 재설정
    _.set(map, 'drawInfo.frame.mapInfo.backgroundInfo.backgroundData', `/map/${mainMapRow.path}`);
    req.locals.map = map;

    req.locals.deviceDomList = deviceDomList;

    // BU.CLI(req.locals);

    res.render('./UPSAS/control/command', req.locals);
  }),
);

/* GET 제어 현황. */
router.get(
  ['/:siteId', '/:siteId/:feature'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.locals);

    res.send(DU.locationAlertBack(`${req.params.feature} 은 준비 중입니다.`));

    // res.send('');
    // res.render('./UPSAS/control/status', req.locals);
  }),
);

module.exports = router;
