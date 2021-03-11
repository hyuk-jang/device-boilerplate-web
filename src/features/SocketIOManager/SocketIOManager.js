const _ = require('lodash');
const { BU } = require('base-util-jh');

const uuid = require('uuid');
const SocketIO = require('socket.io');

const net = require('net');

const AbstSocketIOManager = require('./AbstSocketIOManager');

const {
  dcmConfigModel: {
    reqWrapCmdFormat: reqWCF,
    reqWrapCmdType: reqWCT,
    reqDeviceControlType: reqDCT,
    nodePickKey,
  },
  dccFlagModel: { definedCommandSetRank: cmdRank },
  dcmWsModel: { transmitToServerCommandType: transmitToServerCT },
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
    this.io = SocketIO(httpServer);

    this.io.on('connection', socket => {
      // BU.CLI('connection', socket.id);

      // 인증 요청
      socket.emit('authSocket');

      // 인증 요청 응답 수신 처리(접속한 Socket 등록)
      socket.on('authSocket', sessionInfo => {
        const { sessionUserInfo } = sessionInfo;
        let { siteId = '' } = sessionInfo;

        // 사이트가 지정이 안되어 있거나 all 일 경우 사용자 siteId 가져옴
        if (siteId === '' || _.toLower(siteId) === 'all') {
          siteId = sessionUserInfo.main_seq;
        }

        // Main 정보(거점)의 ID가 동일한 객체 탐색
        const foundMsInfo = _.find(this.mainStorageList, msInfo =>
          _.isEqual(msInfo.msFieldInfo.main_seq, Number(siteId)),
        );

        /** @type {msUserInfo} */
        const msUser = sessionInfo;
        // 접속한 Socket 정보 정의
        msUser.socketClient = socket;

        // 거점을 찾을 경우 초기 값을 보내줌.
        if (foundMsInfo) {
          const {
            msUserList,
            msClient,
            msDataInfo,
            msDataInfo: { nodeList, modeInfo },
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
          socket.emit('updateCommand', msDataInfo.contractCmdList);
          // 표현하는 이미지의 구성요소가 달라질 경우
          socket.emit('updateSvgImg', msDataInfo.svgImgList);
        }
      });

      // 연결 해제한 Socket 제거
      socket.on('disconnect', () => {
        // BU.log('소켓 해제 발생', socket.id);
        _.forEach(this.mainStorageList, msInfo =>
          _.remove(msInfo.msUserList, msUserInfo =>
            _.isEqual(msUserInfo.socketClient, socket),
          ),
        );
      });

      // 사용자 브라우저에서 명령 요청이 발생할 경우 처리
      socket.on('executeCommand', (generateControlCmdInfo = {}) => {
        try {
          /** @type {wsGenerateControlCmdAPI} */
          const {
            cmdFormat: WCF = reqWCF.SINGLE,
            // 기본 값은 명령 요청
            cmdType: WCT = reqWCT.CONTROL,
            cmdId: WCI,
            cmdGoal: WCG = {},
            nodeId: NI,
            singleControlType: SCT,
            controlSetValue: CSV,
            SPI,
            DPI,
          } = generateControlCmdInfo;

          const { limitTimeSec = 0 } = WCG;

          // 24시간 59분 59초 => 89,999초 보다 높은 타이머가 들어올 경우
          if (limitTimeSec >= 90000) {
            throw new Error('제한 시간의 허용 범위를 넘어섰습니다.');
          }

          // BU.CLI(generateControlCmdInfo);

          /** @type {wsControlCmdAPI} */
          const controlCmdInfo = {
            WCF,
            WCT,
            WCI,
            WCG,
            rank: cmdRank.SECOND,
          };

          let isCommandError = 0;

          // 명령 형식에 따라 데이터 가공
          switch (WCF) {
            case reqWCF.SINGLE:
              controlCmdInfo.NI = NI;
              controlCmdInfo.SCT = _.isString(SCT) ? Number(SCT) : SCT;
              controlCmdInfo.CSV = _.isString(CSV) ? Number(CSV) : CSV;
              break;
            case reqWCF.FLOW:
              // 출발지와 도착지가 있을 경우 에러 해제
              isCommandError = SPI.length && DPI.length ? 0 : 1;
              controlCmdInfo.SPI = SPI;
              controlCmdInfo.DPI = DPI;
              break;
            default:
              break;
          }

          // isError 가 1일 경우 명령 실패 처리
          if (isCommandError) {
            throw new Error('요청한 명령 형식이 맞지 않습니다. 관리자에게 문의하십시오.');
          }

          // BU.CLI(controlCmdInfo);

          this.reqExecuteCommand(socket, controlCmdInfo);
        } catch (error) {
          BU.error(error);
          socket.emit('updateAlert', error.message);
        }
      });

      socket.on('cancelCommand', wrapCmdUUID => {
        const {
          msDataInfo: { contractCmdList },
        } = this.findMainStorage(socket);

        const cmdInfo = _.find(contractCmdList, { wrapCmdUUID });

        if (cmdInfo === undefined) {
          socket.emit('updateAlert', '해당 명령은 존재하지 않습니다.');
        }

        /** @type {contractCmdInfo} */
        const {
          wrapCmdUUID: WCU,
          wrapCmdFormat: WCF,
          wrapCmdId: WCI,
          wrapCmdName: WCN,
        } = cmdInfo;

        /** @type {wsControlCmdAPI} */
        const controlCmdInfo = {
          WCU,
          WCF,
          WCT: reqWCT.CANCEL,
          WCI,
          WCN,
          rank: cmdRank.FIRST,
        };

        this.reqExecuteCommand(socket, controlCmdInfo);
      });

      socket.on('changeOperationMode', algorithmId => {
        try {
          /** @type {defaultFormatToRequest} */
          const defaultFormatToRequestInfo = {
            commandId: transmitToServerCT.MODE,
            uuid: uuid.v4(),
            contents: algorithmId,
          };
          // BU.log(defaultFormatToRequestInfo);

          const msInfo = this.findMainStorage(socket);

          // 변경할려고 하는 알고리즘이 현재와 같을 경우 실행하지 않음
          if (msInfo.msDataInfo.modeInfo.algorithmId === algorithmId) {
            throw new Error('변경하고자 하는 시스템 구동 모드가 현재와 동일합니다.');
          }

          const {
            msClient,
            msDataInfo: { reqCmdList },
            msUserList,
          } = msInfo;

          // DBS와 접속이 되어 있는지 체크
          if (!(msClient instanceof net.Socket)) {
            throw new Error('장치와 연결이 되어있지 않습니다.');
          }

          // // 동일한 명령이 이미 사용자로부터 요청되었는지 체크
          const foundReqCmd = _.find(reqCmdList, reqCmd =>
            _.isEqual(reqCmd.reqCmdInfo.contents, algorithmId),
          );

          if (foundReqCmd) {
            throw new Error('다른 사용자가 동일한 명령 요청중입니다.');
          }

          // 요청한 사용자 정보 추출
          const userInfo = _.find(
            msUserList,
            msUserInfo => msUserInfo.socketClient === socket,
          );

          if (userInfo === undefined) {
            throw new Error('사용자 정보를 찾을 수 없습니다. 관리자에게 문의해주십시오.');
          }

          reqCmdList.push({
            user: userInfo.sessionUserInfo,
            socket,
            reqCmdInfo: defaultFormatToRequestInfo,
            // 1초내에 DBS에서 명령 수행한 결과를 보내주지 않을 경우 에러로 판단
            timer: setTimeout(() => {
              // 요청한 사용자 목록에서 삭제
              _.remove(
                reqCmdList,
                reqCmd => reqCmd.reqCmdInfo === defaultFormatToRequestInfo,
              );
              socket.emit('updateAlert', '계측시스템에서 아무런 응답이 없습니다.');
            }, 3000),
          });

          // Data Logger와 연결이 되어야만 명령 요청 가능
          msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
        } catch (error) {
          socket.emit('updateAlert', error.message);
        }
      });
    });
  }

  reqExecuteCommand(socket, executeCmdInfo) {
    try {
      // Main Storage 찾음.
      const msInfo = this.findMainStorage(socket);

      const {
        msClient,
        msDataInfo: { reqCmdList },
        msUserList,
      } = msInfo;

      // DBS와 접속이 되어 있는지 체크
      if (!(msClient instanceof net.Socket)) {
        throw new Error('장치와 연결이 되어있지 않습니다.');
      }

      // 동일한 명령이 이미 사용자로부터 요청되었는지 체크
      const foundReqCmd = _.find(reqCmdList, reqCmd =>
        _.isEqual(reqCmd.reqCmdInfo.contents, executeCmdInfo),
      );

      if (foundReqCmd) {
        throw new Error('다른 사용자가 동일한 명령 요청중입니다.');
      }

      // 요청한 사용자 정보 추출
      const userInfo = _.find(
        msUserList,
        msUserInfo => msUserInfo.socketClient === socket,
      );

      if (userInfo === undefined) {
        throw new Error('사용자 정보를 찾을 수 없습니다. 관리자에게 문의해주십시오.');
      }

      /** @type {defaultFormatToRequest} */
      const defaultFormatToRequestInfo = {
        commandId: transmitToServerCT.COMMAND,
        uuid: uuid.v4(),
        contents: executeCmdInfo,
      };

      // 사용자가 요청한 명령을 요청 목록에 추가
      reqCmdList.push({
        user: userInfo.sessionUserInfo,
        socket,
        reqCmdInfo: defaultFormatToRequestInfo,
        // 1초내에 DBS에서 명령 수행한 결과를 보내주지 않을 경우 에러로 판단
        timer: setTimeout(() => {
          // 요청한 사용자 목록에서 삭제
          _.remove(
            reqCmdList,
            reqCmd => reqCmd.reqCmdInfo === defaultFormatToRequestInfo,
          );
          socket.emit('updateAlert', '계측시스템에서 아무런 응답이 없습니다.');
        }, 3000),
      });

      // Socket Client로 명령 전송
      msClient.write(this.defaultConverter.encodingMsg(defaultFormatToRequestInfo));
    } catch (error) {
      BU.error(error);
      socket.emit('updateAlert', error.message);
    }
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
      .map(nodeInfo =>
        _.chain(nodePickKey.FOR_USER)
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
            return _.assign(pickNode, {
              [[nodePickKey.FOR_USER.place_name_list]]: placeNameList,
            });
          })
          .value(),
      )
      .sortBy(nodePickKey.FOR_USER.node_id)
      .value();
  }

  /**
   * 접속한 SocketIO 객체 정보가 등록된 Main Storage를 반환
   * @param {net.Socket} socket
   * @return {msInfo}
   */
  findMainStorage(socket) {
    const foundMsInfo = _.find(this.mainStorageList, msInfo =>
      _.find(msInfo.msUserList, { socketClient: socket }),
    );

    if (foundMsInfo === undefined) {
      throw new ReferenceError(
        '관리하는 사이트를 찾을 수 없습니다. 관리자에게 문의하여 주십시오.',
      );
    }

    return foundMsInfo;
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
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateCommand', msInfo.msDataInfo.contractCmdList);
    });
  }

  /**
   * 현재 추적 중인 이미지를 보냄
   * @param {msInfo} msInfo
   */
  submitSvgImgList(msInfo) {
    // 해당 Socket Client에게로 데이터 전송
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('updateSvgImg', msInfo.msDataInfo.svgImgList);
    });
  }

  /**
   * 현재 수행중인 명령 리스트를 io Client로 보냄
   * @param {msInfo} msInfo
   * @param {defaultFormatToResponse} execCommandResultInfo
   */
  submitExecCommandResult(msInfo, execCommandResultInfo) {
    msInfo.msUserList.forEach(clientInfo => {
      clientInfo.socketClient.emit('resultExecCommand', execCommandResultInfo.message);
    });
    // 해당 Socket Client에게로 데이터 전송
  }
}
module.exports = SocketIOManager;
