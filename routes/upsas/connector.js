const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');

const router = express.Router();

const { BU } = require('base-util-jh');

const sensorUtil = require('../../models/templates/sensor.util');
const excelUtil = require('../../models/templates/excel.util');
const commonUtil = require('../../models/templates/common.util');

const webUtil = require('../../models/templates/web.util');

const DeviceProtocol = require('../../models/DeviceProtocol');

/* GET users listing. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res, next) => {
    /** @type {RefineModel} */
    const refineModel = global.app.get('refineModel');

    const { siteId } = req.locals.mainInfo;

    const searchRange = refineModel.createSearchRange({
      searchType: 'days',
      searchInterval: 'min10',
    });

    // console.time('refinedCharts');
    const refinedCharts = await refineModel.refineBlockCharts(searchRange, 'connector', siteId);
    // console.timeEnd('refinedCharts');

    // BU.CLIN(refinedCharts, 3);

    // 만들어진 차트 목록에서 domId 를 추출하여 DomTemplate를 구성
    const domTemplate = _.template(`
       <div class="lineChart_box default_area" id="<%= domId %>"></div>
   `);
    const divDomList = refinedCharts.map(refinedChart =>
      domTemplate({
        domId: refinedChart.domId,
      }),
    );

    _.set(req, 'locals.dom.divDomList', divDomList);
    _.set(req, 'locals.madeLineChartList', refinedCharts);

    res.render('./UPSAS/connector/connector', req.locals);
  }),
);

module.exports = router;
