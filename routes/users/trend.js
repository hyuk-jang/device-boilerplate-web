const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const webUtil = require('../../models/templates/web.util');

router.get(
  ['/', '/:siteId'],
  asyncHandler(async (req, res) => {
    // BU.CLI(req.user);

    // Site Sequence.지점 Id를 불러옴
    const { siteId = req.user.main_seq } = req.params;

    // 모든 인버터 조회하고자 할 경우 Id를 지정하지 않음
    const mainWhere = BU.isNumberic(siteId) ? { main_seq: Number(siteId) } : null;

    // TODO: 1. 각종 Chart 작업

    // TODO: 1.1 인버터 발전량 차트 + 경사 일사량

    // TODO: 1.2 조도 + 이산화 탄소

    // TODO: 1.3 토양 수분 차트

    // TODO: 1.4 토양 온.습도, 외기 온.습도

    // TODO: 1.5 수평 일사량, 풍속

    // BU.CLIN(req.locals);
    res.render('./trend/trend', req.locals);
  }),
);

module.exports = router;
