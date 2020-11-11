const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const control = require('./control');
const status = require('./status');
const abnormal = require('./abnormal');
const analysis = require('./analysis');
const trend = require('./trend');
const report = require('./report');
const cctv = require('./cctv');
const admin = require('../users/admin');

const commonUtil = require('../../models/templates/common.util');

const domMakerMaster = require('../../models/domMaker/masterDom');

const DEFAULT_SITE_ID = 'all';

// server middleware
// router.use((req, res, next) => {
//   BU.CLI('Main Middile Ware', req.user);
//   // if (process.env.DEV_AUTO_AUTH !== '1') {
//   // if (global.app.get('auth')) {

//   if (!req.user) {
//     return res.redirect('/auth/login');
//   }
//   // }

//   next();
// });

// 검색할 기간 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_TYPE = 'days';
// Report 데이터 간 Grouping 할 단위 (min: 1분, min10: 10분, hour: 1시간, day: 일일, month: 월, year: 년 )
const DEFAULT_SEARCH_INTERVAL = 'hour';
const DEFAULT_SEARCH_OPTION = 'merge';

// server middleware
router.get(
  [
    '/',
    '/:naviMenu',
    '/:naviMenu/:siteId',
    '/:naviMenu/:siteId/:subCategory',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId',
    '/:naviMenu/:siteId/:subCategory/:subCategoryId/:finalCategory',
  ],
  asyncHandler(async (req, res, next) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {MEMBER} */
    const user = _.get(req, 'user', {});

    const { grade } = user;

    // 사용자가 Manager 등급이라면 기본 siteId를 all로 지정
    const userMainSeq = grade === 'manager' ? DEFAULT_SITE_ID : user.main_seq;

    // 선택한 SiteId와 인버터 Id를 정의
    const {
      naviMenu = 'main',
      siteId = userMainSeq,
      subCategory,
      subCategoryId,
    } = req.params;

    const mainWhere = _.isNumber(siteId) ? { main_seq: siteId } : null;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {WeatherModel} */
    const weatherModel = global.app.get('weatherModel');
    /** @type {PowerModel} */
    const powerModel = global.app.get('powerModel');

    // req.query 값 비구조화 할당
    const {
      searchType = DEFAULT_SEARCH_TYPE,
      searchInterval = DEFAULT_SEARCH_INTERVAL,
      searchOption = DEFAULT_SEARCH_OPTION,
      strStartDateInputValue = moment().format('YYYY-MM-DD'),
      strEndDateInputValue = '',
    } = req.query;

    // BU.CLI(req.query);

    // SQL 질의를 위한 검색 정보 옵션 객체 생성
    const searchRange = biModule.createSearchRange({
      searchType,
      searchInterval,
      searchOption,
      strStartDate: strStartDateInputValue,
      strEndDate: strEndDateInputValue,
    });
    // const searchRange = biModule.createSearchRange({
    //   searchType: 'days',
    //   searchInterval: 'hour',
    //   strStartDate: '2019-08-05',
    //   strEndDate: '',
    // });

    _.set(req, 'locals.searchRange', searchRange);

    /** @type {MAIN[]} */
    const mainRows = await biModule.getTable('main', { is_deleted: 0 });

    /** @type {V_PW_PROFILE[]} */
    const viewPowerProfileRows = await biModule.getTable('v_pw_profile');

    let totalSiteAmount = 0;
    const siteList = mainRows.map(mainRow => {
      const { name: mainName, main_seq: mainSeq, power_amount: pAmount = 0 } = mainRow;

      // const totalAmount = _.chain(viewPowerProfileRows)
      //   .filter(viewPowerProfileRow => viewPowerProfileRow.main_seq === mainSeq)
      //   .map('ivt_amount')
      //   .sum()
      //   .round(1);

      totalSiteAmount += pAmount;

      const siteName = `${pAmount}kW급 (${mainName})`;
      return { siteId: mainSeq.toString(), name: siteName, m_name: mainName };
    });
    siteList.unshift({ siteId: DEFAULT_SITE_ID, name: `모두(${totalSiteAmount}kW급)` });
    _.set(req, 'locals.viewPowerProfileRows', _.filter(viewPowerProfileRows, mainWhere));

    const projectSource = commonUtil.convertProjectSource(process.env.PJ_MAIN_ID);

    _.set(req, 'locals.mainInfo.projectMainId', projectSource.projectName);
    _.set(req, 'locals.mainInfo.naviId', naviMenu);
    _.set(req, 'locals.mainInfo.siteId', siteId);
    _.set(req, 'locals.mainInfo.subCategory', subCategory);
    _.set(req, 'locals.mainInfo.subCategoryId', subCategoryId);
    _.set(req, 'locals.mainInfo.siteList', siteList);
    _.set(req, 'locals.mainInfo.mainWhere', mainWhere);

    // BU.CLI(req.locals.mainInfo);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 프로젝트 홈
    _.set(req, 'locals.dom.projectHome', domMakerMaster.makeProjectHome(projectSource));
    // 사이트 목록 추가
    const loginAreaDom = domMakerMaster.makeLoginUser(user);
    _.set(req, 'locals.dom.loginAreaDom', loginAreaDom);

    const siteListDom = domMakerMaster.makeSiteListDom(siteList, siteId);
    _.set(req, 'locals.dom.siteListDom', siteListDom);

    // 네비게이션 목록 추가
    const naviList = [
      {
        href: 'main',
        name: '메인',
      },
      {
        href: 'control',
        name: '제어',
      },
      {
        href: 'status',
        name: '계측현황',
      },
      {
        href: 'analysis',
        name: '데이터분석',
      },
      {
        href: 'trend',
        name: '트렌드',
      },
      {
        href: 'report',
        name: '보고서',
      },
      // {
      //   href: 'cctv',
      //   name: 'CCTV',
      // },
    ];

    if (_.eq(grade, 'admin')) {
      naviList.push({
        href: 'admin',
        name: '관리',
      });
    }

    const naviListDom = domMakerMaster.makeNaviListDom(naviList, naviMenu, siteId);
    _.set(req, 'locals.dom.naviListDom', naviListDom);

    // Site All일 경우 날씨 정보는 로그인 한 User 의 Main 을 기준으로함.
    const mainSeq = _.eq(siteId, DEFAULT_SITE_ID) ? user.main_seq : siteId;
    /** @type {MAIN} */
    const mainRow = await biModule.getTableRow('main', { main_seq: mainSeq }, false);
    // BU.CLI(mainRow)

    _.set(req, 'locals.mainInfo.uuid', mainRow.uuid);

    // Site 기상청 날씨 정보 구성
    const currWeatherCastInfo = await weatherModel.getCurrWeatherCast(
      mainRow.weather_location_seq,
    );
    const weathercastDom = domMakerMaster.makeWeathercastDom(currWeatherCastInfo);

    _.set(req, 'locals.dom.weathercastDom', weathercastDom);

    // 현재 시간 기준 오늘, 내일, 모레 날씨 정보 FIXME: Row? Info?
    const weatherCastRows = await weatherModel.getWeatherCast(
      mainRow.weather_location_seq,
    );
    _.set(req, 'locals.weatherCastList', weatherCastRows);

    // 해당 지역 위치값 정보 TODO:
    const powerPredictionInfo = await powerModel.getPowerPrediction(
      moment().add(2, 'days').format('YYYY-MM-DD'),
      mainRow.weather_location_seq,
    );
    // BU.CLI(powerPredictionInfo);
    _.set(req, 'locals.powerPredictionInfo', powerPredictionInfo);

    next();
  }),
);

// Router 추가
router.use('/', main);
router.use('/control', control);
router.use('/tta_status', status);
router.use('/status', status);
router.use('/analysis', analysis);
router.use('/trend', trend);
router.use('/report', report);
router.use('/cctv', cctv);
router.use('/admin', admin);

// router.use('/users', users);

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     const user = _.get(req, 'user', {});
//     next();
//   }),
// );

// /* GET users listing. */
// router.get('/', (req, res, next) => {
//   BU.CLI(process.env.DEV_PAGE);
//   if (_.isString(process.env.DEV_PAGE)) {
//     res.redirect(`/${process.env.DEV_PAGE}`);
//   } else {
//     res.redirect('/main');
//   }
// });

module.exports = router;
