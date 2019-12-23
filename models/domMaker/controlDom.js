const _ = require('lodash');

const { BU } = require('base-util-jh');

module.exports = {
  /**
   * 장치 류 돔을 생성할 경우
   * @param {V_DV_NODE[]} nodeList
   * @param {boolean=} isDevice 장치류 돔 여부
   */
  makeNodeDom(nodeList, isDevice = true) {
    const nodeCategoryTemplate = _.template(
      '<option value="<%= nd_target_id %>"> <%= nd_target_name %></option>',
    );

    const nodeTemplate = _.template('<option value="<%= node_id %>"><%= node_name %></option>');

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
      _.find(deviceDomList, { type: nodeInfo.nd_target_id }).list.push(nodeTemplate(nodeInfo));
    });

    return deviceDomList;
  },

  /**
   * 
   * @param {mDeviceMap} deviceMapInfo 
   */
  makePlace(deviceMapInfo) {
    const {setInfo, relationInfo: {placeRelationList}}= deviceMapInfo;




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

    const placeTemplate = _.template('<option value="<%= place_id %>"><%= place_name %></option>');

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

    // const placeDomList = _(flowCmdList)
    //   .map(flowCmdInfo => {
    //     const templateInfo = _.isNil(flowCmdInfo.srcPlaceId)
    //       ? { pd_target_id: '', pd_target_name: '기타' }
    //       : placeInfo;
    //     return placeCategoryTemplate(templateInfo);
    //   })
    //   .value();

    // BU.CLI(placeDomList);

    // placeList[0].pd_target_id

    // 장치 카테고리 별 Dom 생성
    // const deviceDomList = _.unionBy(flowCmdList, 'nd_target_id').map(nodeInfo => {
    //   return {
    //     type: nodeInfo.nd_target_id,
    //     list: [],
    //     category: nodeCategoryTemplate(nodeInfo),
    //     controlType: [],
    //   };
    // });

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
};
