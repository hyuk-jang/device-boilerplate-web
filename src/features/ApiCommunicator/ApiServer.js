const _ = require('lodash');
const split = require('split');
const net = require('net');

const { BU } = require('base-util-jh');

const AbstApiServer = require('./AbstApiServer');

const {
  dcmConfigModel: { reqWrapCmdFormat: reqWCF },
  dcmWsModel: { transmitToServerCommandType },
} = require('../../module').di;

class ApiServer extends AbstApiServer {
  /**
   * Socket Server 구동
   * @param {Object} apiConfig API Communicator 설정
   * @param {number} apiConfig.socketPort API Communicator 설정
   */
  init(apiConfig) {
    const { socketPort: apiPort } = apiConfig;
    /**
     * encodingMsg: 수신자에게 메시지를 보낼 때 시작문자와 종료문자 및 체크섬, 전송 종료 문자를 자동으로 붙여주는 메소드
     * decodingMsg: encoding 처리한 Frame을 걷어내는 역할
     * 여러 유용한 converter 유틸 모음
     */
    const { encodingMsg, decodingMsg, protocolConverter } = this.defaultConverter;
    /**
     * EOT: 종료 Buffer. 0x04
     * CAN: 명령 실패 응답 Buffer. 0x18
     */
    const { EOT, CAN } = protocolConverter;
    const server = net
      .createServer(socket => {
        console.log(
          `client is Connected ${apiPort} ===> addressInfo: ${socket.remoteAddress}`,
        );

        // steram 연결 및 파서 등록
        const stream = socket.pipe(split(EOT));
        // Field의 Socket Client에서 보내온 데이터 수신 핸들러
        stream.on('data', data => {
          try {
            // Parser 가 EOT 까지 삭제하므로 끝에 붙임
            data += EOT;
            // BU.CLI(data);
            // 수신받은 데이터의 CRC 계산 및 본 데이터 추출
            const strData = decodingMsg(data).toString();
            // BU.CLI(strData);

            // JSON 형태로만 데이터를 받아 들임.
            if (!BU.IsJsonString(strData)) {
              BU.errorLog('socketServer', '데이터가 JSON 형식이 아닙니다.');
              throw new Error('데이터가 JSON 형식이 아닙니다.');
            }

            // JSON 객체로 변환.
            // 1. 서버 -> Field으로 요청한 명령에 대한 응답이거나
            // 2. Field -> 서버로 보내온 메시지 일 수 있음.
            /** @type {defaultFormatToRequest|defaultFormatToResponse} */
            const fieldMessage = JSON.parse(strData);

            const responseDataByServer = this.interpretData(socket, fieldMessage);

            // 응답할 데이터가 존재하지 않을 경우 무시
            if (_.isEmpty(responseDataByServer)) return false;

            // BU.CLI(responseDataByServer);
            socket.write(encodingMsg(responseDataByServer));
          } catch (error) {
            socket.write(encodingMsg(CAN));
            // throw error;
          }
        });

        socket.on('error', err => {
          // socket.emit('close')
          socket.emit('close');
        });

        // client가 접속 해제 될 경우에는 clientList에서 제거
        // TODO: Socket 접속이 해제 되었을 경우 Node, Command 정보를 초기화 시키고 SocketIO로 전송 로직 필요
        socket.on('close', () => {
          // 저장소 목록을 돌면서 해당 client를 초기화
          this.mainStorageList.forEach(msInfo => {
            if (_.isEqual(msInfo.msClient, socket)) {
              // msClient 초기화
              msInfo.msClient = null;
              // Data Logger와의 접속이 끊어졌다고 알림
              this.observers.forEach(observer => {
                if (_.get(observer, 'updateMsFieldClient')) {
                  observer.updateMsFieldClient(msInfo);
                }
              });
            }
          });
        });
      })
      .on('error', err => {
        // handle errors here
        console.error('@@@@', err, server.address());
        // throw err;
      });

    // grab an arbitrary unused port.
    server.listen(apiPort, () => {
      console.log('API Communicator Server Listen', apiPort);
    });

    server.on('close', () => {
      console.log('close');
    });

    server.on('error', err => {
      console.error(err);
    });
  }

  /**
   * Main Storage 안에 있는 데이터 중 client와 동일한 객체 반환
   * @param {net.Socket} fieldClient
   * @return {msInfo}
   */
  findMainStorage(fieldClient) {
    const foundMainStorage = _.find(this.mainStorageList, msInfo =>
      _.isEqual(msInfo.msClient, fieldClient),
    );
    // 해당 객체가 있을 경우만 처리
    if (!foundMainStorage) {
      throw new Error(`${fieldClient.remoteAddress}는 등록되지 않은 Client 입니다.`);
    }
    return foundMainStorage;
  }

  /**
   * Field Client 인증을 하고자 할 경우
   * FIXME: uuid를 통한 인증을 함. Diffle Hellman 으로 추후 변경해야 할 듯
   * @param {net.Socket} fieldClient
   * @param {defaultFormatToRequest} fieldMessage
   * @return {defaultFormatToResponse}
   */
  certifyFieldClient(fieldClient, fieldMessage) {
    BU.log('certifyClient');
    // 사이트에서 보내온 메시지 명령 타입, 세부 내용
    const { commandId, contents } = fieldMessage;

    /** @type {defaultFormatToResponse} */
    const responseFieldMessage = {
      commandId,
      isError: 1,
    };
    // 저장소목록에서 uuid와 일치하는 저장소를 찾음
    const foundMainStorage = _.find(this.mainStorageList, msInfo =>
      _.isEqual(msInfo.msFieldInfo.uuid, contents),
    );
    // 인증이 성공했다면 Socket Client를 적용.
    if (foundMainStorage) {
      // BU.CLI('인증 성공');
      foundMainStorage.msClient = fieldClient;
      responseFieldMessage.isError = 0;

      // Data Logger와의 접속이 연결되었다고 알림
      this.observers.forEach(observer => {
        if (_.get(observer, 'updateMsFieldClient')) {
          observer.updateMsFieldClient(foundMainStorage);
        }
      });
    } else {
      responseFieldMessage.message = '등록되지 않은 거점입니다.';
    }

    // BU.CLIN(responseFieldMessage);
    return responseFieldMessage;
  }

  /**
   * 보내온 명령 성격에 따라 해석
   * @param {net.Socket} fieldSocket 필드 TCP/IP Socket
   * @param {defaultFormatToResponse} fieldData 필드에서 보내온 데이터
   */
  interpretData(fieldSocket, fieldData) {
    const { isError } = fieldData;

    // isError Key가 존재하지 않을 경우 요청한 명령에 대한 응답이 아님
    if (isError === undefined) {
      return this.interpretCommand(fieldSocket, fieldData);
    }
    this.interpertResponse(fieldSocket, fieldData);
  }

  /**
   * 웹에서 보낸 명령에 대한 응답 결과 해석
   * @param {net.Socket} fieldSocket 필드 TCP/IP Socket
   * @param {defaultFormatToResponse} fieldData 필드에서 보내온 데이터
   */
  async interpertResponse(fieldClient, fieldData) {
    const { commandId, isError, uuid, contents, message } = fieldData;

    try {
      const { COMMAND, MODE } = transmitToServerCommandType;

      const msInfo = this.findMainStorage(fieldClient);

      const {
        msDataInfo: { reqCmdList },
      } = msInfo;

      // 사용자가 요청한 목록 찾음
      const foundIndex = _.findIndex(
        reqCmdList,
        reqCmd => reqCmd.reqCmdInfo.uuid === uuid,
      );
      const reqCmd = reqCmdList[foundIndex];

      const { user, socket, timer } = reqCmd;
      // 타이머 삭제
      clearTimeout(timer);

      // 사용자 요청 명령 목록에서 제거
      _.pullAt(reqCmdList, [foundIndex]);

      // 요청한 명령에 문제가 있을 경우
      if (isError === 1) {
        return socket.emit('updateAlert', message);
      }
      // 사용자가 요청한 명령에 대한 응답일 경우
      if (commandId === COMMAND) {
        // 사용자에게 응답
        socket.emit('updateAlert', `${contents.wrapCmdName} 명령 수행을 요청하였습니다.`);

        // this.dbUpdatorList.push(contents, user.main_seq);
        // 사용자 명령 요청이 성공하였을 경우 사용자 정보와 명령 ID를 저장
        this.controlModel.addReqCmdUser(user.member_seq, contents);
      } else if (commandId === MODE) {
        // console.log(fieldData);
        socket.emit('updateAlert', '제어모드를 변경하였습니다.');
      }
    } catch (error) {
      BU.error(error.message);
    }
  }

  /**
   * 필드에서 보내온 데이터를 해석
   * @param {net.Socket} fieldClient
   * @param {defaultFormatToRequest} fieldData 사이트에서 보내온 메시지
   * @return {defaultFormatToResponse} 정상적인 명령 해석이라면 true, 아니라면 throw
   */
  interpretCommand(fieldClient, fieldData) {
    // BU.CLI('interpretCommand');
    // 사이트에서 보내온 메시지 명령 타입, 세부 내용
    const { commandId, contents } = fieldData;

    /** @type {defaultFormatToResponse} */
    const responseDataByServer = {
      commandId,
      isError: 0,
      message: '',
    };

    try {
      const {
        CERTIFICATION,
        COMMAND,
        MODE,
        NODE,
        SVG_IMG,
        POWER_BOARD,
      } = transmitToServerCommandType;
      // client를 인증하고자 하는 경우
      if (commandId === CERTIFICATION) {
        return this.certifyFieldClient(fieldClient, fieldData);
      }

      const msInfo = this.findMainStorage(fieldClient);

      switch (commandId) {
        case MODE: // 제어 모드가 업데이트 되었을 경우
          this.updateOperationMode(msInfo, contents);
          break;
        case NODE: // 노드 정보가 업데이트 되었을 경우
          this.compareNodeList(msInfo, contents);
          break;
        case COMMAND: // 명령 정보가 업데이트 되었을 경우
          this.compareCommandList(msInfo, contents);
          break;
        case SVG_IMG: // 명령 정보가 업데이트 되었을 경우
          // BU.CLI(contents);
          msInfo.msDataInfo.svgImgList = contents;
          msInfo.msUserList.forEach(clientInfo => {
            clientInfo.socketClient.emit('updateSvgImg', contents);
          });
          break;
        case POWER_BOARD: // 현황판 데이터를 요청할 경우
          responseDataByServer.contents = msInfo.msDataInfo.statusBoard;
          break;
        default:
          throw new Error(`${commandId}은 등록되지 않은 명령입니다.`);
      }

      // 정보가 정상적으로 처리되었고 단순 정보 알림에 관한 내용은 따로 응답하지 않음
      return {};
    } catch (error) {
      responseDataByServer.isError = 1;
      responseDataByServer.message = error.message;
      return responseDataByServer;
    }
  }

  /**
   * 필드에서 수신받은 데이터를 DB에 반영하고자 할 경우
   * @param {{key: string, args: *}} fieldEventInfo 필드에서 수신받은 데이터 및 관리할 key
   */
  updateFieldEvent(fieldEventInfo) {
    // BU.CLI('test');
    this.fieldEventList.push(fieldEventInfo);

    if (this.fieldEventList.length === 1) {
      this.updateOnFieldEvent();
    }
  }

  /**
   * 필드로부터 수신받은 데이터 DB 적용.
   * fieldEventList 순서대로 1개씩 처리하며 배열의 끝까지 도달하였을 경우 배열 초기화
   */
  async updateOnFieldEvent(listIndex = 0) {
    // BU.CLI('runEachUpdator');

    const updatorInfo = this.fieldEventList[listIndex];

    const { key, args } = updatorInfo;
    switch (key) {
      case 'currCommand':
        await this.updateControlEvent(...args);
        break;
      default:
        break;
    }

    listIndex += 1;
    if (this.fieldEventList[listIndex] === undefined) {
      this.fieldEventList = [];
    } else {
      this.updateOnFieldEvent(listIndex);
    }
  }

  /**
   * @description dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {contractCmdInfo[]} fieldCmdList
   */
  async updateControlEvent(msInfo, fieldCmdList = []) {
    const { msFieldInfo } = msInfo;
    const controlEventHistoryRows = await this.controlModel.getTable(
      'dv_control_cmd_history',
      {
        main_seq: msFieldInfo.main_seq,
        end_date: null,
      },
      // true,
    );

    // insertCmdEventList 정제
    const controlEventHistoryUUIDs = _.map(controlEventHistoryRows, 'cmd_uuid');
    const contractCmdUUIDs = _.map(fieldCmdList, 'wrapCmdUUID');

    /** @type {contractCmdInfo[]} */
    const startCmdEventList = _.filter(fieldCmdList, contractCmdInfo => {
      const { wrapCmdFormat, wrapCmdUUID } = contractCmdInfo;

      // 계측 명령은 취급 X
      if (reqWCF.MEASURE === wrapCmdFormat) return false;

      // 존재하는 명령이라면 X
      if (_.includes(controlEventHistoryUUIDs, wrapCmdUUID)) return false;

      return true;
    });
    // 신규 명령 반영
    await this.controlModel.insertCmdHistory(msFieldInfo, startCmdEventList);

    // 현재 수행중인 명령 목록에 EventHistory가 없다면 종료된 명령이라고 해석
    const completeCmdEventList = _.reject(controlEventHistoryRows, historyRow =>
      _.includes(contractCmdUUIDs, historyRow.cmd_uuid),
    );
    // 제어 종료 업데이트
    await this.controlModel.completeCmdHistory(completeCmdEventList);
  }

  /**
   * 구동 모드 갱신 알림해올경우
   * @description dcmWsModel.transmitToServerCommandType.MODE 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {wsModeInfo} fieldModeInfo
   */
  updateOperationMode(msInfo, fieldModeInfo) {
    const { algorithmId, operationConfigList = [] } = fieldModeInfo;

    const { modeInfo } = msInfo.msDataInfo;

    // 구동 모드 설정 정보 목록이 존재할 경우에만 덮어씌움
    if (operationConfigList.length) {
      modeInfo.operationConfigList = operationConfigList;
    }

    // 현재 모드와 동일할 경우 갱신하지 않음
    if (_.isEqual(modeInfo.algorithmId, algorithmId)) return false;

    // 구동 모드 정보 갱신
    modeInfo.algorithmId = algorithmId;

    // 사용자에게 알림
    this.observers.forEach(observer => {
      if (_.get(observer, 'updateOperationMode')) {
        observer.updateOperationMode(msInfo);
      }
    });
  }

  /**
   * Site에서 보내온 NodeList 데이터와 현재 가지고 있는 데이터와 비교하여 변화가 있을 경우 해당 노드를 선별하여 부모 호출
   * @description dcmWsModel.transmitToServerCommandType.NODE 명령 처리 메소드
   * @param {msInfo} msInfo
   * @param {wsNodeInfo[]} fieldNodeList
   */
  compareNodeList(msInfo, fieldNodeList) {
    /** @type {nodeInfo[]} */
    const renewalList = fieldNodeList.reduce((updatedList, wsNodeInfo) => {
      const { nri: nodeRealId, d: data } = wsNodeInfo;
      const msNodeInfo = _.find(msInfo.msDataInfo.nodeList, {
        node_real_id: nodeRealId,
      });

      // 객체이거나 동일 데이터가 아닐 경우
      if (msNodeInfo !== undefined && data !== msNodeInfo.data) {
        // 데이터가 서로 다르다면 갱신된 데이터
        msNodeInfo.data = data;
        updatedList.push(msNodeInfo);
      }
      return updatedList;
    }, []);

    // 업데이트 내역이 있다면 전송
    if (renewalList.length) {
      // Observer가 해당 메소드를 가지고 있다면 전송
      this.observers.forEach(observer => {
        if (_.get(observer, 'updateNodeList')) {
          observer.updateNodeList(msInfo, renewalList);
        }
      });
    }

    return renewalList;
  }

  /**
   * @description dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {contractCmdInfo[]} fieldCmdList
   */
  async compareCommandList(msInfo, fieldCmdList = []) {
    // BU.CLI(fieldCmdList);
    // Data Logger에서 보내온 List를 전부 적용해버림
    this.updateFieldEvent({
      key: 'currCommand',
      args: [msInfo, fieldCmdList],
    });

    //  현재 수행 중인 명령 갱신
    msInfo.msDataInfo.contractCmdList = fieldCmdList;

    // Observer가 해당 메소드를 가지고 있다면 전송
    this.observers.forEach(observer => {
      if (_.get(observer, 'updateContractCmdList')) {
        observer.updateContractCmdList(msInfo);
      }
    });

    return msInfo.msDataInfo.contractCmdList;
  }
}
module.exports = ApiServer;

/**
 * @typedef {Object} wsNodeInfo
 * @property {string} nri node_real_id
 * @property {number|string} d data
 */
