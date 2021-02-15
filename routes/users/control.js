const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU, DU } = require('base-util-jh');

const defaultDom = require('../../models/domMaker/defaultDom');
const commonUtil = require('../../models/templates/common.util');

const DEFAULT_CATEGORY = 'command';
const PAGE_LIST_COUNT = 20; // 한 페이지당 목록을 보여줄 수

/** @type {projectConfig} */
const pConfig = global.projectConfig;

const { naviList } = pConfig;

const subCategoryList = _.chain(naviList)
  .find({ href: 'control' })
  .get('subCategoryList')
  .value();

router.get(
  ['/', '/:siteId', '/:siteId/:subCategory'],
  asyncHandler(async (req, res, next) => {
    /** @type {BiModule} */
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
    const {
      // searchRange,
      mainInfo: { siteId, mainWhere },
    } = req.locals;

    const searchRange = biModule.createSearchRange({
      searchType: 'day',
      searchInterval: 'min',
    });

    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', mainWhere);

    /** @type {mDeviceMap} */
    const baseMap = mainRow.map;

    req.locals.map = JSON.parse(baseMap);

    const { chartDomList, chartList } = await commonUtil.getDynamicChartDom({
      searchRange,
      siteId,
      mainNavi: 'control',
      subNavi: 'command',
    });

    _.set(req, 'locals.dom.chartDomList', chartDomList);

    _.set(req, 'locals.chartList', chartList);

    res.render('./control/command', req.locals);
  }),
);

router.get(
  ['/', '/:siteId', '/:siteId/history'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    const {
      mainInfo: { siteId, mainWhere },
    } = req.locals;
    const { page = 1 } = req.query;

    /** @type {ControlModel} */
    const controlModel = global.app.get('controlModel');

    // FIXME: 임시 나중에 삭제 또는 수정
    const cmdFormatBase = [
      {
        key: 'SINGLE',
        value: '단일 제어',
      },
      {
        key: 'FLOW',
        value: '흐름 제어',
      },
      {
        key: 'SET',
        value: '설정 제어',
      },
      {
        key: 'SCENARIO',
        value: '시나리오',
      },
    ];

    // 레포트 데이터로 환산

    const { reportRows, totalCount } = await controlModel.getCmdHistoryReport(
      {
        page,
        pageListCount: PAGE_LIST_COUNT,
      },
      mainWhere,
    );

    // 회원 정보
    /** @type {MEMBER[]} */
    const memberRows = await biModule.getTable('MEMBER');
    /** @type {MAIN[]} */
    const mainRows = await biModule.getTable('MAIN');

    // 제어 이력 데이터 가공
    _.forEach(reportRows, cmdHistoryInfo => {
      // /** @type{DV_CONTROL_CMD_HISTORY} */
      const {
        main_seq: mainSeq,
        member_seq: memSeq,
        cmd_format: cf,
        start_date: sd,
        end_date: ed,
      } = cmdHistoryInfo;

      // 회원 이름 추가
      cmdHistoryInfo.memberName = _.chain(memberRows)
        .find({ member_seq: memSeq })
        .get('name', '시스템')
        .value();

      // 사이트 이름 추가
      cmdHistoryInfo.siteName = _.chain(mainRows)
        .find({ main_seq: mainSeq })
        .get('name')
        .value();

      // 명령 타입 한글 표시
      cmdHistoryInfo.cmd_format = _.chain(cmdFormatBase)
        .find({ key: cf })
        .get('value', '')
        .value();

      // 명령 시각 포멧 처리
      cmdHistoryInfo.start_date = moment(sd).format('YYYY-MM-DD HH:mm:ss');
      cmdHistoryInfo.end_date = moment(ed).format('YYYY-MM-DD HH:mm:ss');

      // FIXME: null 데이터 - 표시 , 임시 나중에 수정 해야함.
      _.isNull(cmdHistoryInfo.control_set_value) &&
        _.set(cmdHistoryInfo, 'control_set_value', '-');
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

    res.render('./control/history', req.locals);
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
