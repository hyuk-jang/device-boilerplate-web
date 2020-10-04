const _ = require('lodash');

const { BU } = require('base-util-jh');

module.exports = {
  /**
   *
   * @param {mDeviceMap} deviceMap
   * @param {V_DV_PLACE[]} placeList
   */
  initCommand(deviceMap, placeList) {
    const {
      controlInfo: { flowCmdList = [], setCmdList = [], scenarioCmdList = [] },
    } = deviceMap;

    // 단순 명령을 쉽게 인식하기 위한 한글 명령을 입력
    flowCmdList.forEach((flowSrcInfo, srcIndex) => {
      const { srcPlaceId, destList } = flowSrcInfo;
      // 출발지 한글 이름
      let { srcPlaceName } = flowSrcInfo;

      if (_.isNil(srcPlaceName)) {
        srcPlaceName = _.chain(placeList)
          .find({ place_id: srcPlaceId })
          .get('place_name')
          .value();
      }
      // 출발지 한글이름 추가
      // simpleCommandInfo.srcPlaceName ||
      _.set(flowSrcInfo, 'srcPlaceName', srcPlaceName);
      // 목적지 목록을 순회하면서 상세 명령 정보 정의
      destList.forEach((flowDesInfo, desIndex) => {
        const { destPlaceId } = flowDesInfo;
        let { destPlaceName } = flowDesInfo;
        // 목적지 한글 이름
        if (_.isNil(destPlaceName)) {
          destPlaceName = _.chain(placeList)
            .find({ place_id: destPlaceId })
            .get('place_name')
            .value();
        }

        flowSrcInfo.destList[desIndex] = {
          cmdId: destPlaceId,
          cmdName: destPlaceName,
        };

        // 목적지 한글이름 추가 및 명령 정보 정의
        // _.set(scDesInfo, 'destPlaceName', destPlaceName);
        // _.set(scDesInfo, 'cmdId', `${srcPlaceId}_TO_${destPlaceId}`);
        // _.set(scDesInfo, 'cmdName', `${srcPlaceName} → ${destPlaceName}`);
      });

      flowCmdList[srcIndex] = {
        cmdId: srcPlaceId,
        cmdName: srcPlaceName,
        destList,
      };
    });

    // 설정 명령 세팅
    setCmdList.forEach((cmdInfo, index) => {
      const { cmdId, cmdName = '' } = cmdInfo;

      setCmdList[index] = {
        cmdId,
        cmdName: cmdName.length ? cmdName : cmdId,
      };
      // setCmdInfo.scenarioName = cmdName.length ? cmdName : cmdId;
    });

    // 시나리오 명령 세팅
    scenarioCmdList.forEach((cmdInfo, index) => {
      const { cmdId, cmdName = '' } = cmdInfo;

      scenarioCmdList[index] = {
        cmdId,
        cmdName: cmdName.length ? cmdName : cmdId,
      };
      // scenarioCmdInfo.scenarioName = scenarioName.length ? scenarioName : scenarioId;
    });

    const mapCmdInfo = {
      /** @type {flowCmdInfo[]} 기존 Map에 있는 Flow Command를 변형 처리 */
      flowCmdList,
      setCmdList,
      scenarioCmdList,
    };

    return mapCmdInfo;
  },

  /**
   * 장치 류 돔을 생성할 경우
   * @param {V_DV_NODE[]} nodeList
   * @param {boolean=} isDevice 장치류 돔 여부
   */
  makeNodeDom(nodeList, isDevice = true) {
    const nodeCategoryTemplate = _.template(
      '<option value="<%= nd_target_id %>"> <%= nd_target_name %></option>',
    );

    const nodeTemplate = _.template(
      '<option value="<%= node_id %>"><%= node_name %></option>',
    );

    // 노드 목록에 제어 장치 만 골라 정의
    const filterdNodeList = _(nodeList)
      .filter({ is_sensor: isDevice ? 0 : 1 })
      .sortBy('node_real_id')
      .value();

    // 장치 카테고리 별 Dom 생성
    const deviceDomList = _.unionBy(filterdNodeList, 'nd_target_id').map(nodeInfo => {
      return {
        type: nodeInfo.nd_target_id,
        list: [],
        category: nodeCategoryTemplate(nodeInfo),
        controlType: [],
      };
    });

    // BU.CLI(deviceInfoList);
    // 노드 목록을 순회하면서 해당 노드에 맞는 장치 카테고리 Dom에 삽입
    filterdNodeList.forEach(nodeInfo => {
      _.find(deviceDomList, { type: nodeInfo.nd_target_id }).list.push(
        nodeTemplate(nodeInfo),
      );
    });

    return deviceDomList;
  },

  /**
   *
   * @param {mDeviceMap} deviceMapInfo
   */
  makePlace(deviceMapInfo) {
    const {
      setInfo,
      relationInfo: { placeRelationList },
    } = deviceMapInfo;
  },

  /**
   * 흐름 명령 돔 생성
   * @param {V_DV_PLACE[]} placeList
   * @param {mflowCmdInfo[]} flowCmdList
   */
  makeFlowCmdDom(placeList, flowCmdList) {
    const placeCategoryTemplate = _.template(
      '<option value="<%= pd_target_id %>"> <%= pd_target_name %></option>',
    );

    const placeTemplate = _.template(
      '<option value="<%= place_id %>"><%= place_name %></option>',
    );

    const placeDomList = _(flowCmdList)
      .map('srcPlaceId')
      .union()
      .map(placeId => {
        return _.find(placeList, { place_id: placeId });
      })
      .unionBy('pd_target_id')
      .map(placeInfo => {
        const templateInfo = _.isUndefined(placeInfo)
          ? { pd_target_id: '', pd_target_name: '기타' }
          : placeInfo;
        return placeCategoryTemplate(templateInfo);
      })
      .value();

    // 단순 명령을 쉽게 인식하기 위한 한글 명령을 입력
    flowCmdList.forEach(flowCmdInfo => {
      const { srcPlaceId } = flowCmdInfo;
      // 출발지 한글 이름
      let { srcPlaceName } = flowCmdInfo;

      if (_.isNil(srcPlaceName)) {
        srcPlaceName = _.chain(placeList)
          .find({ place_id: srcPlaceId })
          .get('place_name')
          .value();
      }
      // 출발지 한글이름 추가
      // simpleCommandInfo.srcPlaceName ||
      _.set(flowCmdInfo, 'srcPlaceName', srcPlaceName);
      // 목적지 목록을 순회하면서 상세 명령 정보 정의
      flowCmdInfo.destList.forEach(scDesInfo => {
        const { destPlaceId } = scDesInfo;
        let { destPlaceName } = scDesInfo;
        // 목적지 한글 이름
        if (_.isNil(destPlaceName)) {
          destPlaceName = _.chain(this.placeList)
            .find({ place_id: destPlaceId })
            .get('place_name')
            .value();
        }
      });
    });
  },

  /**
   * TODO:
   * @param {*} cmdHistoryList
   */
  makeCmdHistoryDom(cmdHistoryList) {
    _.forEach(cmdHistoryList, cmdHistoryInfo => {
      const {} = cmdHistoryInfo;
    });
  },
};
