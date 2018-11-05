const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const sensorDom = require('../../models/domMaker/sensorDom');

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    // BU.CLI(req.locals);
    next();
  }),
);

/* GET home page. */
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

    // 지점 Id를 불러옴
    const { siteId } = mainInfo;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const profileWhere = _.eq(siteId, 'all') ? null : { main_seq: siteId };

    // Power 현황 테이블에서 선택한 Site에 속해있는 인버터 목록을 가져옴
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biModule.getTable('v_dv_sensor_profile', profileWhere);
    /** @type {V_DV_PLACE_RELATION[]} */
    let viewPlaceRelationRows = await biModule.getTable('v_dv_place_relation', profileWhere);

    // TODO: 각  relation에 동일 node_seq를 사용하고 있다면 profile 현재 데이터 기입, 아니라면 row는 제거

    // IVT가 포함된 장소는 제거.
    viewPlaceRelationRows = _.reject(viewPlaceRelationRows, placeRelation =>
      _.includes(placeRelation.place_id, 'IVT'),
    );

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

    // BU.CLIN(req.locals);
    res.render('./sensor/sensor', req.locals);
  }),
);

module.exports = router;
