const asyncHandler = require('express-async-handler');
const router = require('express').Router();
const _ = require('lodash');
const {BU, DU} = require('base-util-jh');

const BiModule = require('../models/BiModule.js');
const webUtil = require('../models/web.util');

const map = require('../public/Map/map');

module.exports = app => {
  const initSetter = app.get('initSetter');
  const biModule = new BiModule(initSetter.dbInfo);

  // server middleware
  router.use(
    asyncHandler(async (req, res, next) => {
      if (app.get('auth')) {
        if (!req.user) {
          return res.redirect('/auth/login');
        }
      }

      _.set(req, 'locals.menuNum', 0);

      /** @type {V_MEMBER} */
      const user = _.get(req, 'user', {});
      req.locals.user = user;

      /** @type {V_UPSAS_PROFILE[]} */
      const viewPowerProfile = await biModule.getTable(
        'v_upsas_profile',
        {main_seq: user.main_seq},
        false,
      );
      req.locals.viewPowerProfile = viewPowerProfile;

      // 로그인 한 사용자가 관리하는 염전의 동네예보 위치 정보에 맞는 현재 날씨 데이터를 추출
      const currWeatherCastInfo = await biModule.getCurrWeatherCast(user.weather_location_seq);
      req.locals.weatherCastInfo = webUtil.convertWeatherCast(currWeatherCastInfo);
      next();
    }),
  );

  // Get
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      /** @type {V_MEMBER} */
      const userInfo = req.locals.user;
      // BU.CLI(req.user);
      // BU.CLI('control', req.locals);
      const deviceInfoList = [];
      // FIXME: 로그인 한 사용자에 따라서 nodeList가 달라져야함.
      /** @type {nodeInfo[]} */
      const nodeList = await biModule.getTable('v_dv_node', {
        main_seq: _.get(userInfo, 'main_seq', null),
      });

      // BU.CLI(nodeList);

      const compiledDeviceType = _.template(
        '<option value="<%= nd_target_id %>"> <%= nd_target_name %></option>',
      );

      nodeList.forEach(nodeInfo => {
        const {nd_target_id, nd_target_name, is_sensor, node_id, node_name} = nodeInfo;
        // 센서가 아닌 장비만 등록
        if (is_sensor === 0) {
          let foundIt = _.find(deviceInfoList, {
            type: nd_target_id,
          });

          if (_.isEmpty(foundIt)) {
            // const onOffList = ['pump'];
            foundIt = {
              type: nd_target_id,
              list: [],
              template: compiledDeviceType({
                nd_target_id,
                nd_target_name,
              }),
              controlType: [],
            };
            deviceInfoList.push(foundIt);
          }
          const compiledDeviceList = _.template(
            '<option value="<%= node_id %>"><%= node_name %></option>',
          );

          foundIt.list.push(
            compiledDeviceList({
              node_id,
              node_name,
            }),
          );
        }
      });

      // BU.CLI(deviceInfoList);

      req.locals.excuteControlList = map.controlList;
      // req.locals.cancelControlList = map.controlList;

      const compiled = _.template(`<option value="<%= controlName %>">
        <%= controlName %>
      </option>`);

      const excuteControlList = [];
      map.controlList.forEach(currentItem => {
        excuteControlList.push(
          compiled({
            controlName: currentItem.cmdName,
          }),
        );
      });

      // BU.CLI(excuteControlList);
      // 세션 정보를 넘김
      req.locals.sessionID = req.sessionID;
      req.locals.user = req.user;

      req.locals.deviceInfoList = deviceInfoList;
      req.locals.automaticControlList = excuteControlList;

      // BU.CLI(req.locals);
      // return res.status(200).send(DU.locationJustGoBlank('http://115.23.49.28:7999'));
      return res.render('./controller/index.html', req.locals);
    }),
  );

  return router;
};
