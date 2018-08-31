const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const {BU, DU} = require('base-util-jh');

const webUtil = require('../models/web.util');

const PowerModel = require('../models/PowerModel');
const BiDevice = require('../models/BiDevice');

const defaultRangeFormat = 'min10';
module.exports = app => {
  const initSetter = app.get('initSetter');
  const powerModel = new PowerModel(initSetter.dbInfo);
  const biDevice = new BiDevice(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }
      _.set(req, 'locals.menuNum', 6);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await powerModel.getTable(
        'v_upsas_profile',
        {main_seq: user.main_seq},
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await powerModel.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      // BU.CLI('report', req.query);
      /** @type {V_MEMBER} */
      const userInfo = req.locals.user;

      /** @type {V_UPSAS_PROFILE[]} */
      let viewPowerProfileList = req.locals.viewPowerProfile;

      let inverterSeqList = [];
      if (BU.isNumberic(req.query.inverter_seq)) {
        inverterSeqList = Number(req.query.inverter_seq);
        viewPowerProfileList = _.filter(viewPowerProfileList, {inverter_seq: inverterSeqList});
      } else {
        inverterSeqList = _.map(viewPowerProfileList, 'inverter_seq');
      }

      // if (
      //   (typeof req.query.inverter_seq === 'number' ||
      //     typeof req.query.inverter_seq === 'string') &&
      //   !Number.isNaN(Number(req.query.inverter_seq))
      // ) {
      //   param_inverter_seq = Number(req.query.inverter_seq);
      //   viewPowerProfileList = _.filter(viewPowerProfileList, {inverter_seq: param_inverter_seq});
      // } else {
      //   param_inverter_seq = _.map(viewPowerProfileList, 'inverter_seq');
      // }

      const param_page = req.query.page || 1;
      // 조회 간격
      const searchInterval = req.query.search_interval
        ? req.query.search_interval
        : defaultRangeFormat;
      // 조회 범위
      const searchType = req.query.search_type ? req.query.search_type : 'hour';
      // 조회 객체 정의
      // BU.CLIS(searchType, searchInterval, req.query.start_date, req.query.end_date);
      const selectedReportMode = _.get(req.query, 'start_date', '').length
        ? 'reportMode'
        : 'calendarMode';
      const searchRange = powerModel.getSearchRange(
        searchType,
        req.query.start_date,
        req.query.end_date,
      );
      searchRange.searchInterval = searchInterval;
      // searchRange.searchType = searchType;
      searchRange.page = Number(param_page);
      searchRange.pageListCount = 20;

      /** @type {INVERTER[]} */
      const inverterList = await powerModel.getTable('inverter', {inverter_seq: inverterSeqList});
      const reportList = await powerModel.getInverterReport(searchRange, inverterSeqList);
      // BU.CLI(userInfo);
      const calendarEventList = await powerModel.getCalendarEventList(userInfo);

      const queryString = {
        inverter_seq: inverterSeqList,
        start_date: searchRange.strStartDateInputValue,
        end_date: searchRange.strEndDateInputValue,
        search_type: searchType,
        search_interval: searchInterval,
      };

      const paginationInfo = DU.makeBsPagination(
        searchRange.page,
        reportList.totalCount,
        '/report',
        queryString,
        searchRange.pageListCount,
      );

      // BU.CLI(paginationInfo)
      // BU.CLI(searchRange)
      // BU.CLI(reportList.totalCount);

      const deviceList = await powerModel.getInverterList(inverterSeqList);

      inverterList.unshift({
        inverter_seq: 'all',
        target_name: '모두',
      });

      req.locals.inverter_seq = inverterSeqList;
      req.locals.device_list = deviceList;
      req.locals.searchRange = searchRange;
      req.locals.reportList = reportList.report;
      req.locals.paginationInfo = paginationInfo;
      req.locals.calendarEventList = calendarEventList;
      req.locals.selectedReportMode = selectedReportMode;

      return res.render('./report/report.html', req.locals);
    }),
  );

  router.get(
    '/excel',
    asyncHandler(async (req, res) => {
      /** @type {V_MEMBER} */
      const userInfo = req.locals.user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfileList = req.locals.viewPowerProfile;

      const searchInterval = req.query.search_interval ? req.query.search_interval : 'min10';
      // Search 타입을 지정
      const searchType = req.query.search_type ? req.query.search_type : defaultRangeFormat;
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;

      // 지정된 SearchType으로 설정 구간 정의
      let searchRange = powerModel.getSearchRange(searchType, startDate, endDate);

      if (searchType === 'range') {
        const realSearchType =
          searchType === 'range'
            ? powerModel.convertSearchTypeWithCompareDate(
                searchRange.strEndDate,
                searchRange.strStartDate,
              )
            : searchType;
        if (realSearchType === 'hour') {
          searchRange = powerModel.getSearchRange(
            defaultRangeFormat,
            req.query.start_date,
            req.query.end_date,
          );
        } else {
          searchRange.searchType = realSearchType;
          searchRange.searchInterval = realSearchType;
        }
      } else if (searchType === 'hour') {
        switch (searchInterval) {
          case 'min':
          case 'min10':
            searchRange.searchType = searchInterval;
            break;
          default:
            break;
        }
        searchRange.searchInterval = searchInterval;
      }
      // BU.CLI(searchRange);
      // return;

      BU.CLI(_.includes(['min', 'min10', 'hour'], searchInterval));

      if (_.includes(['min', 'min10', 'hour'], searchInterval)) {
        const excelWorkBook = await powerModel.makeExcelSheet(
          searchRange,
          searchInterval,
          userInfo,
          viewPowerProfileList,
        );
        // BU.CLI(excelWorkBook);

        return res.send(excelWorkBook);
      }
      return res.status(500).send();

      // BU.CLI(searchRange);
    }),
  );

  router.use(
    asyncHandler(async (err, req, res) => {
      BU.CLIN(err, 2);
      return res.status(500).send(err);
    }),
  );

  return router;
};
