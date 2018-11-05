const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const sensorDom = require('../../models/domMaker/sensorDom');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.user);
    /** @type {BiModule} */
    const biModule = global.app.get('biModule');

    // 기본 정보 불러옴
    const { mainInfo } = req.locals;
    /** @type {{siteid: string, m_name: string}[]} */
    const mainSiteList = mainInfo.siteList;

    // Site Sequence.지점 Id를 불러옴
    const { siteId = req.user.main_seq } = req.params;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;

    // Power 현황 테이블에서 선택한 Site에 속해있는 인버터 목록을 가져옴
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biModule.getTable('v_dv_sensor_profile', mainWhere);
    /** @type {V_DV_PLACE_RELATION[]} */
    const viewPlaceRelationRows = await biModule.getTable('v_dv_place_relation', mainWhere);

    // TODO: 각  relation에 동일 node_seq를 사용하고 있다면 profile 현재 데이터 기입, 아니라면 row는 제거

    // IVT가 포함된 장소는 제거.
    _.remove(viewPlaceRelationRows, placeRelation => _.includes(placeRelation.place_id, 'IVT'));

    // 각 Relation에 해당 데이터 확장
    viewPlaceRelationRows.forEach(placeRelation => {
      const foundIt = _.find(viewSensorProfileRows, { node_seq: placeRelation.node_seq });
      // 데이터가 존재한다면 sensorProfile Node Def ID로 해당 데이터 입력
      if (foundIt) {
        _.assign(placeRelation, {
          [foundIt.nd_target_id]: foundIt.node_data,
          writedate: foundIt.writedate,
        });
      }
    });

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    // 인버터 현재 상태 데이터 동적 생성 돔
    const sensorStatusListDom = sensorDom.makeSensorStatusDom(viewPlaceRelationRows, mainSiteList);
    _.set(req, 'locals.dom.sensorStatusListDom', sensorStatusListDom);

    req.locals.measureInfo = {
      measureTime: `실시간 작물 생육환경 모니터링 측정시간 : ${moment().format(
        'YYYY-MM-DD HH:mm',
      )}:00`,
    };

    // BU.CLIN(req.locals);
    res.render('./sensor/sensor', req.locals);
  }),
);

module.exports = router;
