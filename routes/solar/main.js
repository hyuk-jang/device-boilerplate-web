const _ = require('lodash');
const moment = require('moment');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerMain = require('../../models/domMaker/mainDom');

const commonUtil = require('../../models/templates/common.util');
const sensorUtil = require('../../models/templates/sensor.util');

router.get(
  ['/', '/main', '/main/:siteId'],
  asyncHandler(async (req, res) => {
    commonUtil.applyHasNumbericReqToNumber(req);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    const solarRows = await biModule.getTable('v_solar_profile');

    // req.locals.moduleStatusList = validModuleStatusList;

    const solarData = {};

    const solarList = _.map(solarRows, solarInfo => {
      _.set(solarData, [solarInfo.solar_id], solarInfo.solar);

      solarInfo.writedate = solarInfo.writedate
        ? moment(solarInfo.writedate).format('YYYY.MM.DD HH:mm (ddd)')
        : '';

      return _.pick(solarInfo, ['solar', 'solar_id', 'solar_name', 'writedate']);
    });

    req.locals.solarData = solarData;
    req.locals.solarList = solarList;
    res.render('./templates/solar/main/index', req.locals);
  }),
);

router.get(
  '/main/:id',
  asyncHandler(async (req, res) => {
    res.render('./main/index', req.locals);
  }),
);

module.exports = router;
