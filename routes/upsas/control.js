const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');
const controlDom = require('../../models/domMaker/controlDom');

const commonUtil = require('../../models/templates/common.util');

const DEFAULT_CATEGORY = 'command';
const PAGE_LIST_COUNT = 10; // 한 페이지당 목록을 보여줄 수

/** @type {setCategoryInfo[]} */
const subCategoryList = [
  {
    subCategory: 'command',
    btnName: '제어관리',
  },
  {
    subCategory: 'history',
    btnName: '제어이력',
  },
  // {
  //   subCategory: 'event',
  //   btnName: '이벤트관리',
  // },
  // {
  //   subCategory: 'threshold',
  //   btnName: '임계치관리',
  // },
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

/* TODO: GET */
router.get(
  ['/', '/:siteId', '/:siteId/history'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    const {
      mainInfo: { siteId },
    } = req.locals;

    const { page = 1 } = req.query;

    /** @type {} */
    const controlModel = global.app.get('controlModel');

    // 레포트 데이터로 환산
    const { reportRows, totalCount } = await controlModel.getCommandHistoryReport({
      page,
      pageListCount: PAGE_LIST_COUNT,
    });

    // TODO: 회원 정보
    const memberRows = await biModule.getTable('MEMBER');

    // TODO: 명령 목록의 member_seq에 맞게 memberName 추가
    _.forEach(reportRows, cmdHistoryInfo => {
      /** @type{MEMBER} */
      const memberInfo = _.find(memberRows, { member_seq: cmdHistoryInfo.member_seq });
      const memberName = memberInfo.name;

      cmdHistoryInfo.memberName = memberName;
    });

    _.set(req, 'locals.reportRows', reportRows);

    // 페이지 네이션 생성
    let paginationInfo = DU.makeBsPagination(
      page,
      totalCount,
      `/control/${siteId}/history`,
      _.omit(req.query, 'page'),
      PAGE_LIST_COUNT,
    );

    // 페이지네이션 돔 추가
    _.set(req, 'locals.dom.paginationDom', paginationInfo.paginationDom);

    // 페이지 정보 추가
    paginationInfo = _.omit(paginationInfo, 'paginationDom');
    _.set(req, 'locals.paginationInfo', paginationInfo);

    res.render('./UPSAS/control/history', req.locals);
  }),
);

/* GET 제어 현황. */
// router.get(
//   ['/:siteId', '/:siteId/:feature'],
//   asyncHandler(async (req, res) => {
//     // BU.CLI(req.locals);

//     res.send(DU.locationAlertBack(`${req.params.feature} 은 준비 중입니다.`));

//     // res.send('');
//     // res.render('./UPSAS/control/status', req.locals);
//   }),
// );

module.exports = router;
