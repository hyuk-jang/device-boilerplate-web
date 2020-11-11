const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const moment = require('moment');

const { BU } = require('base-util-jh');

const sensorDom = require('../../models/domMaker/sensorDom');

const DeviceProtocol = require('../../models/DeviceProtocol');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    const {
      mainInfo: { siteId, mainWhere },
    } = req.locals;

    /** @type {BiModule} */
    const biModule = global.app.get('biModule');
    /** @type {BiDevice} */
    const biDevice = global.app.get('biDevice');

    // 기본 정보 불러옴
    const { mainInfo } = req.locals;
    /** @type {{siteId: string, m_name: string}[]} */
    const mainSiteList = mainInfo.siteList;

    // Power 현황 테이블에서 선택한 Site에 속해있는 목록을 가져옴
    /** @type {V_DV_SENSOR_PROFILE[]} */
    const viewSensorProfileRows = await biDevice.getSensorProfile(mainWhere);

    /** @type {V_DV_PLACE_RELATION[]} */
    const viewPlaceRelationRows = await biModule.getTable('v_dv_place_relation', {
      ...mainWhere,
      is_sensor: 1,
    });

    // TODO: 각  relation에 동일 node_seq를 사용하고 있다면 profile 현재 데이터 기입, 아니라면 row는 제거
    // FIXME: IVT가 포함된 장소는 제거.(임시)
    _.remove(viewPlaceRelationRows, placeRelation =>
      _.includes(placeRelation.place_id, 'IVT'),
    );

    // 각 Relation에 해당 데이터 확장
    viewPlaceRelationRows.forEach(placeRelation => {
      const foundIt = _.find(viewSensorProfileRows, {
        node_seq: placeRelation.node_seq,
      });
      // 데이터가 존재한다면 sensorProfile Node Def ID로 해당 데이터 입력
      if (foundIt) {
        const diffMinutes = moment().diff(moment(foundIt.writedate), 'minutes');
        // BU.CLI(foundIt.node_name, diffMinutes);
        // 10분 이상 지난 데이터라면 가치 없음
        if (diffMinutes < 10) {
          _.assign(placeRelation, {
            [foundIt.nd_target_id]: foundIt.node_data,
            writedate: foundIt.writedate,
          });
        }
      }
    });

    // BU.CLIN(viewPlaceRelationRows);

    // 항목별 데이터를 추출하기 위하여 Def 별로 묶음
    const { rowsNdIdList, rowspanNdIdList } = new DeviceProtocol(siteId);

    /** @@@@@@@@@@@ DOM @@@@@@@@@@ */
    const { sensorEnvHeaderDom, sensorEnvBodyDom } = sensorDom.makeDynamicSensorDom(
      viewPlaceRelationRows,
      {
        rowsNdIdList,
        rowspanNdIdList,
      },
      mainSiteList,
    );

    _.set(req, 'locals.dom.sensorEnvHeaderDom', sensorEnvHeaderDom);
    _.set(req, 'locals.dom.sensorEnvBodyDom', sensorEnvBodyDom);

    req.locals.measureInfo = {
      measureTime: `${moment().format('YYYY-MM-DD HH:mm')}:00`,
    };

    // BU.CLIN(req.locals);
    res.render('./sensor/sensor', req.locals);
  }),
);

module.exports = router;
