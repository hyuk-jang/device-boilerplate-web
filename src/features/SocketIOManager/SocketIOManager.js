const _ = require('lodash');
const { BU } = require('base-util-jh');

const uuidv4 = require('uuid/v4');
const SocketIO = require('socket.io');

const net = require('net');

const AbstSocketIOManager = require('./AbstSocketIOManager');

const {
  dcmConfigModel: {
    reqWrapCmdFormat: reqWCF,
    reqWrapCmdType: reqWCT,
    reqDeviceControlType: reqDCT,
    commandStep: cmdStep,
    nodePickKey,
  },
  dccFlagModel: { definedCommandSetRank: cmdRank },
  dcmWsModel: { transmitToClientCommandType, transmitToServerCommandType: transmitToServerCT },
} = require('../../module').di;

/** 무안 6kW TB */

class SocketIOManager extends AbstSocketIOManager {
  /**
   * Web Socket 설정
   * @param {Object} ioConfig SocketIOManager 설정
   * @param {httpServer} ioConfig.httpServer http 객체
   */
  init(ioConfig) {
    const { httpServer } = ioConfig;
    this.setSocketIO(httpServer);
  }

  /**
   * Web Socket 설정
   * @param {httpServer} httpServer
   */
  setSocketIO(httpServer) {
    this.io = new SocketIO(httpServer);

    this.io.on('connection', socket => {
      // BU.CLI('connection');
      // 접속한 Socket 등록
      socket.on('certifySocket', sessionInfo => {
        /** @type {msUserInfo} */
        const msUser = sessionInfo;
        // 접속한 Socket 정보 정의
        msUser.socketClient = socket;

        // Main 정보(거점)의 ID가 동일한 객체 탐색
        const foundMsInfo = _.find(this.mainStorageList, msInfo =>
          _.isEqual(msInfo.msFieldInfo.main_seq, msUser.sessionUserInfo.main_seq),
        );

        // 거점을 찾을 경우 초기 값을 보내줌.
        if (foundMsInfo) {
          const {
            msUserList,
            msClient,
            msDataInfo,
            msDataInfo: { contractCmdList, nodeList, modeInfo },
          } = foundMsInfo;
          // 사용자 추가
          msUserList.push(msUser);

          // 첫 접속일 경우
          // API Client와 연결 유무 정의
          socket.emit('updateIsApiClientConn', msClient instanceof net.Socket);
          // DBS 구동 모드 정보
          socket.emit('updateMode', modeInfo);
          // NodeList 에서 선택한 key 만을 정제해서 전송
          socket.emit('updateNode', this.pickNodeList(msDataInfo, nodeList));
          // OrderList에서 명령 타입을 한글로 변환 후 전송
          socket.emit('updateCommand', this.pickContractCmdList(contractCmdList));
        }
      });

      // 연결 해제한 Socket 제거
      socket.on('disconnect', () => {
        _.forEach(this.mainStorageList, msInfo =>
          _.remove(msInfo.msUserList, msUserInfo => _.isEqual(msUserInfo.socketClient, socket)),
        );
      });

      // 사용자 브라우저에서 명령 요청이 발생할 경우 처리
      socket.on('executeCommand', (generateControlCmdInfo = {}) => {
        /** @type {wsGenerateControlCmdAPI} */
        const {
          cmdFormat: WCF,
          // 기본 값은 명령 요청
          cmdType: WCT = reqWCT.CONTROL,
          cmdId: WCI,
          cmdGoal: WCG,
          nodeId: NI,
          singleControlType: SCT,
          controlSetValue: CSV,
          SPI,
          DPI,
        } = generateControlCmdInfo;

        BU.CLI(generateControlCmdInfo);

        /** @type {wsControlCmdAPI} */
        const controlCmdInfo = {
          WCF,
          WCT,
          WCI,
          WCG,
          rank: cmdRank.SECOND,
        };

        let isError = 1;

        // 명령 형식에 따라 데이터 가공
        switch (WCF) {
          case reqWCF.SINGLE:
            controlCmdInfo.NI = NI;
            controlCmdInfo.SCT = _.isString(SCT) ? Number(SCT) : SCT;
            controlCmdInfo.CSV = _.isString(CSV) ? Number(CSV) : CSV;
            isError = _.includes(reqDCT, SCT) ? 0 : 1;
            break;
          case reqWCF.FLOW:
            // 출발지와 도착지가 있을 경우 에러 해제
            isError = SPI.length && DPI.length ? 0 : 1;
            controlCmdInfo.SPI = SPI;
            controlCmdInfo.DPI = DPI;
            break;
          default:
            break;
        }

        // TODO: isError 가 1일 경우 명령 실패 처리

        // BU.CLI(msg)
        /** @type {defaultFormatToRequest} */
        const defaultFormatToRequestInfo = {
          commandId: transmitToServerCT.COMMAND,
          uuid: uuidv4(),
          contents: controlCmdInfo,
        };

        // BU.CLI(defaultFormatToRequestInfo);

        // Main Storage 찾음.
        const msInfo = this.findMainStorage(socket);

        // Data Logger와 연결이 되어야만 명령 요청 가능
        if (msInfo && msInfo.msClient instanceof net.Socket) {
          // Socket Client로 명령 전송
          msInfo.msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
        }
      });

      socket.on('changeOperationMode', algorithmId => {
        /** @type {defaultFormatToRequest} */
        const defaultFormatToRequestInfo = {
          commandId: transmitToServerCT.MODE,
          uuid: uuidv4(),
          contents: algorithmId,
        };
        // BU.log(defaultFormatToRequestInfo);

        const msInfo = this.findMainStorage(socket);

        // 변경할려고 하는 알고리즘이 현재와 같을 경우 실행하지 않음
        if (msInfo.msDataInfo.modeInfo.algorithmId === algorithmId) {
          BU.CLI('변경하고자 하는 알고리즘이 현재와 동일합니다.');
          return false;
        }

        // Data Logger와 연결이 되어야만 명령 요청 가능
        if (msInfo && msInfo.msClient instanceof net.Socket) {
          // Socket Client로 명령 전송
          msInfo.msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
        }
      });
    });
  }

  /**
   * 노드 정보에서 UI에 보여줄 내용만을 반환
   * @param {msDataInfo} dataInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드
   */
  pickNodeList(dataInfo, renewalList) {
    const { placeRelList } = dataInfo;

    // BU.CLIN(renewalList)

    return _.chain(renewalList)
      .map(nodeInfo => {
        return _.chain(nodePickKey.FOR_USER)
          .reduce((result, value, key) => {
            result[value] = _.get(nodeInfo, key, '');
            return result;
          }, {})
          .thru(pickNode => {
            // BU.CLIN(pickNode)
            const placeNameList = _(placeRelList)
              .filter({ node_real_id: nodeInfo.node_real_id })
              .map('place_name')
              .value();
            // BU.CLIN(placeNameList);
            return _.assign(pickNode, { [[nodePickKey.FOR_USER.place_name_list]]: placeNameList });
          })
          .value();
      })
      .sortBy(nodePickKey.FOR_USER.node_id)
      .value();
  }

  /**
   * 접속한 SocketIO 객체 정보가 등록된 Main Storage를 반환
   * @param {net.Socket} socket
   * @return {msInfo}
   */
  findMainStorage(socket) {
    return _.find(this.mainStorageList, msInfo =>
      _.find(msInfo.msUserList, { socketClient: socket }),
    );
  }

  /**
   * Data Logger 상태를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitApiClientIsConn(msInfo) {
    const isApiClientConn = msInfo.msClient instanceof net.Socket;

    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateIsApiClientConn', isApiClientConn);
    });
  }

  /**
   * 제어 모드 업데이트
   * @param {msInfo} msInfo
   */
  submitMode(msInfo) {
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateMode', msInfo.msDataInfo.modeInfo);
    });
  }

  /**
   * 등록되어져 있는 노드 리스트를 io Client로 보냄.
   * @param {msInfo} msInfo
   * @param {nodeInfo[]} renewalList 갱신된 노드. 차후에 속도에 문제가 된다면 갱신된 노드만 적용토록 해야함.
   */
  submitNodeList(msInfo, renewalList) {
    // BU.CLIN(renewalList);
    const simpleNodeList = this.pickNodeList(msInfo.msDataInfo, renewalList);
    // BU.CLIN(simpleNodeList);
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateNode', simpleNodeList);
    });
  }

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   */
  submitCommandList(msInfo) {
    // const pickedOrderList = this.pickContractCmdList(msInfo.msDataInfo.contractCmdList);
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateCommand', msInfo.msDataInfo.contractCmdList);
    });
  }

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} execCommandResultInfo
   */
  submitExecCommandResult(msInfo, execCommandResultInfo) {
    // const pickedOrderList = this.pickContractCmdList(msInfo.msDataInfo.contractCmdList);

    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('resultExecCommand', execCommandResultInfo.message);
    });
    // 해당 Socket Client에게로 데이터 전송
  }
}
module.exports = SocketIOManager;
