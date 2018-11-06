const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerInverter = require('../../models/domMaker/inverterDom');

const INCLINED_SOLAR = 'inclinedSolar';

/* GET home page. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId = req.user.main_seq } = req.params;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');

    // 인버터별 경사 일사량을 가져옴
    const powerProfileRowsWithExtendedSolar = await biDevice.extendsPlaceDeviceData(
      powerProfileRows,
      INCLINED_SOLAR,
    );

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await biModule.getTable('v_pw_inverter_status', {
      inverter_seq: inverterSeqList,
    });

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = [];

    // 인버터 현황 데이터 목록에 경사 일사량 데이터를 붙임.
    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq, place_seq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(powerProfileRows, { inverter_seq });
      // pRows 장소는 모두 동일하므로 첫번째 목록 표본을 가져와 subName과 lastName을 구성하고 정의
      const {
        m_name: mainName = '',
        ivt_target_name: subName,
        ivt_director_name: company = '',
        ivt_amount: amount,
      } = foundProfile;
      const siteName = `${mainName} ${subName || ''} ${_.round(amount)} kW급 ${
        _.isString(company) && company.length ? company : ''
      }`;

      inverterSiteNameList.push({ inverter_seq, siteName });

      // 경사 일사량 구함
      const foundIncludedInclinedSolarRow = _.chain(powerProfileRowsWithExtendedSolar)
        .find({ place_seq })
        .get('INCLINED_SOLAR', null)
        .value();

      // Inverter Status Row에 경사 일사량 확장
      _.assign(inverterStatus, {
        [INCLINED_SOLAR]: foundIncludedInclinedSolarRow,
        siteName,
      });
    });

    // BU.CLI(viewInverterStatusRows);

    // 데이터 검증
    const validInverterStatusList = webUtil.checkDataValidation(
      inverterStatusRows,
      new Date(),
      'writedate',
    );

    /** 인버터 메뉴에서 사용 할 데이터 선언 및 부분 정의 */
    const refinedInverterStatusList = webUtil.refineSelectedInverterStatus(validInverterStatusList);

    // const searchRange = biModule.createSearchRange('min10');
    const searchRange = biModule.createSearchRange('min10', '2018-11-01');
    const inverterPowerList = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLI(inverterPowerList);
    const chartOption = {
      selectKey: 'avg_grid_kw',
      dateKey: 'view_date',
      groupKey: 'inverter_seq',
      colorKey: 'chart_color',
      sortKey: 'chart_sort_rank',
    };

    const inverterPowerChart = webUtil.makeDynamicChartData(inverterPowerList, chartOption);

    inverterPowerChart.series.forEach(chartInfo => {
      chartInfo.name = _.get(
        _.find(inverterSiteNameList, { inverter_seq: Number(chartInfo.name) }),
        'siteName',
        '',
      );
    });

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const inverterStatusListDom = domMakerInverter.makeInverterStatusList(
      refinedInverterStatusList,
    );

    _.set(req, 'locals.dom.inverterStatusListDom', inverterStatusListDom);

    req.locals.inverterPowerChart = inverterPowerChart;
    req.locals.measureInfo = {
      measureTime: `실시간 인버터 모니터링 측정시간 : ${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };
    // BU.CLIN(req.locals);
    res.render('./inverter/inverter', req.locals);
  }),
);

module.exports = router;
