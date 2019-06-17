const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

const domMakerInverter = require('../../models/domMaker/inverterDom');

const HORIZONTAL_SOLAR = 'horizontalSolar';

/* GET home page. */
router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // Site Sequence.지점 Id를 불러옴
    const { siteId } = req.locals.mainInfo;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId)
      ? {
          main_seq: Number(siteId),
        }
      : null;

    /** @type {V_PW_PROFILE[]} */
    const powerProfileRows = _.filter(req.locals.viewPowerProfileRows, mainWhere);
    // BU.CLI(powerProfileRows);

    // 인버터 Seq 목록
    const inverterSeqList = _.map(powerProfileRows, 'inverter_seq');
    const inverterWhere = inverterSeqList.length ? { inverter_seq: inverterSeqList } : null;
    // 인버터별 수평 일사량을 가져옴
    const powerProfileRowsWithExtendedSolar = await biDevice.extendsPlaceDeviceData(
      powerProfileRows,
      HORIZONTAL_SOLAR,
    );

    // BU.CLI(powerProfileRowsWithExtendedSolar);

    /** @type {V_INVERTER_STATUS[]} */
    const inverterStatusRows = await biModule.getTable('v_pw_inverter_status', inverterWhere);

    /** @type {{inverter_seq: number, siteName: string}[]} */
    const inverterSiteNameList = [];

    // 인버터 현황 데이터 목록에 수평 일사량 데이터를 붙임.
    inverterStatusRows.forEach(inverterStatus => {
      const { inverter_seq, place_seq } = inverterStatus;
      // BU.CLI(foundPlaceData);
      // 인버터 Sequence가 동일한 Power Profile을 가져옴
      const foundProfile = _.find(powerProfileRows, {
        inverter_seq,
      });
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

      inverterSiteNameList.push({
        inverter_seq,
        siteName,
      });

      // 수평 일사량 구함
      const horizontalSolarRow = _.chain(powerProfileRowsWithExtendedSolar)
        .find({
          place_seq,
        })
        .get('INCLINED_SOLAR', null)
        .value();

      // Inverter Status Row에 수평 일사량 확장
      _.assign(inverterStatus, {
        [HORIZONTAL_SOLAR]: horizontalSolarRow,
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

    // const searchRange = biModule.createSearchRange({
    //   searchType: 'days',
    //   // searchType: 'range',
    //   searchInterval: 'min10',
    //   strStartDate: '2019-05-21',
    //   // strEndDate: '',
    //   // strEndDate: '2019-02-14',
    // });
    const searchRange = biModule.createSearchRange();

    // 구하고자 하는 데이터와 실제 날짜와 매칭시킬 날짜 목록
    // const strGroupDateList = sensorUtil.getGroupDateList(searchRange);
    // BU.CLI(strGroupDateList);
    // plotSeries 를 구하기 위한 객체
    // const momentFormat = sensorUtil.getMomentFormat(searchRange);

    // BU.CLI(momentFormat);

    const inverterPowerList = await biModule.getInverterPower(searchRange, inverterSeqList);
    // BU.CLI(inverterPowerList);

    /** @type {lineChartConfig} */
    const chartConfig = {
      domId: 'chart_div',
      title: '인버터 발전 현황',
      yAxisList: [
        {
          dataUnit: 'kW',
          yTitle: '전력(kW)',
        },
      ],
      chartOption: {
        selectKey: 'avg_grid_kw',
        dateKey: 'group_date',
        groupKey: 'inverter_seq',
        colorKey: 'chart_color',
        sortKey: 'chart_sort_rank',
      },
    };

    // 동적 라인 차트를 생성
    const inverterLineChart = webUtil.makeDynamicLineChart(chartConfig, inverterPowerList);

    // BU.CLIN(inverterLineChart, 3);

    inverterLineChart.series.forEach(chartInfo => {
      chartInfo.name = _.get(
        _.find(inverterSiteNameList, {
          inverter_seq: Number(chartInfo.name),
        }),
        'siteName',
        chartInfo.name,
      );
    });

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const inverterStatusListDom = domMakerInverter.makeInverterStatusList(
      refinedInverterStatusList,
    );

    _.set(req, 'locals.dom.inverterStatusListDom', inverterStatusListDom);

    req.locals.inverterLineChart = inverterLineChart;
    req.locals.measureInfo = {
      measureTime: `${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };
    // BU.CLIN(req.locals);
    res.render('./inverter/inverter', req.locals);
  }),
);

module.exports = router;
