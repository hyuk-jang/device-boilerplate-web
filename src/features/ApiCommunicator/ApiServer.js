const _ = require('lodash');
const split = require('split');
const { BU } = require('base-util-jh');

const net = require('net');

const AbstApiServer = require('./AbstApiServer');

const {
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
        // socket.end('goodbye\n');
        console.log(`client is Connected ${apiPort} ===> addressInfo: ${socket.remoteAddress}`);

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
            // BU.CLI(fieldMessage);

            // isError Key가 존재하고 Number 형태라면 요청에 대한 응답이라고 판단하고 이벤트 발생
            if (_.isNumber(_.get(fieldMessage, 'isError'))) {
              const msInfo = this.findMainStorage(socket);
              return this.observers.forEach(observer => {
                if (_.get(observer, 'responseFieldMessage')) {
                  observer.responseFieldMessage(msInfo, fieldMessage);
                }
              });
            }

            // JSON 객체 분석 메소드 호출
            const responseDataByServer = this.interpretCommand(socket, fieldMessage);

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

    BU.CLIN(responseFieldMessage);
    return responseFieldMessage;
  }

  /**
   * Site에서 보내온 데이터를 해석
   * @param {net.Socket} fieldClient
   * @param {defaultFormatToRequest} fieldMessage 사이트에서 보내온 메시지
   * @return {defaultFormatToResponse} 정상적인 명령 해석이라면 true, 아니라면 throw
   */
  interpretCommand(fieldClient, fieldMessage) {
    // BU.CLI('interpretCommand');
    // 사이트에서 보내온 메시지 명령 타입, 세부 내용
    const { commandId, contents } = fieldMessage;

    /** @type {defaultFormatToResponse} */
    const responseDataByServer = {
      commandId,
      isError: 0,
      message: '',
    };

    try {
      const { CERTIFICATION, COMMAND, MODE, NODE, POWER_BOARD } = transmitToServerCommandType;
      // client를 인증하고자 하는 경우
      if (commandId === CERTIFICATION) {
        return this.certifyFieldClient(fieldClient, fieldMessage);
      }

      const msInfo = this.findMainStorage(fieldClient);

      // const msInfo = this.findMainStorage(fieldClient);
      switch (commandId) {
        case MODE: // 제어 모드가 업데이트 되었을 경우
          // BU.CLI(fieldMessage);
          this.updateOperationMode(msInfo, contents);
          break;
        case NODE: // 노드 정보가 업데이트 되었을 경우
          // BU.log(contents.length);
          this.compareNodeList(msInfo, contents);
          break;
        case COMMAND: // 명령 정보가 업데이트 되었을 경우
          this.compareContractCmdList(msInfo, contents);
          break;
        case POWER_BOARD: // 현황판 데이터를 요청할 경우
          responseDataByServer.contents = msInfo.msDataInfo.statusBoard;
          // BU.CLI(responseDataByServer)
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
   * Main Storage 안에 있는 데이터 중 client와 동일한 객체 반환
   * @param {net.Socket} fieldClient
   * @return {msInfo}
   */
  findMainStorage(fieldClient) {
    try {
      const foundMainStorage = _.find(this.mainStorageList, msInfo =>
        _.isEqual(msInfo.msClient, fieldClient),
      );
      // 해당 객체가 있을 경우만 처리
      if (!foundMainStorage) {
        throw new Error(`${fieldClient.remoteAddress}는 등록되지 않은 Client 입니다.`);
      }
      return foundMainStorage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 구동 모드 갱신 알림해올경우
   * @description dcmWsModel.transmitToServerCommandType.MODE 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {wsModeInfo} updatedModeInfo
   */
  updateOperationMode(msInfo, updatedModeInfo) {
    // BU.CLIN(updatedModeInfo);
    const { algorithmId, operationConfigList = [] } = updatedModeInfo;

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
   * @param {wsNodeInfo[]} updatedFieldNodeList
   */
  compareNodeList(msInfo, updatedFieldNodeList) {
    // BU.CLIN(updatedFieldNodeList);
    try {
      /** @type {nodeInfo[]} */
      const renewalList = [];
      // 수신 받은 노드 리스트를 순회
      _.forEach(updatedFieldNodeList, wsNodeInfo => {
        const { nri: nodeRealId, d: data } = wsNodeInfo;
        const msNodeInfo = _.find(msInfo.msDataInfo.nodeList, {
          node_real_id: nodeRealId,
        });

        // BU.CLIS(wsNodeInfo);
        // BU.CLIN(msNodeInfo, 2);

        // 데이터가 없는 객체이거나 동일 데이터일 경우 중지
        if (_.isEmpty(msNodeInfo) || _.isEqual(data, msNodeInfo.data)) return false;

        // if (_.includes(nodeRealId, 'WD_1_001') || _.includes(nodeRealId, 'WD_1_004')) {
        //   BU.CLIN(wsNodeInfo);
        //   BU.CLIN(msNodeInfo);
        // }

        // 데이터가 서로 다르다면 갱신된 데이터
        msNodeInfo.data = data;
        renewalList.push(msNodeInfo);

        // if (_.includes(nodeRealId, 'WD_1_001') || _.includes(nodeRealId, 'WD_1_004')) {
        //   BU.CLIN(renewalList);
        // }

        // if (_.includes(nodeRealId, 'WD_1')) {
        //   BU.CLIN(msNodeInfo);
        // }
      });

      // 업데이트 내역이 있다면 전송
      if (renewalList.length) {
        // BU.CLIN(renewalList);
        // Observer가 해당 메소드를 가지고 있다면 전송
        this.observers.forEach(observer => {
          if (_.get(observer, 'updateNodeList')) {
            // BU.log(renewalList.length);
            observer.updateNodeList(msInfo, renewalList);
          }
        });
      }
      // BU.CLIN(renewalList);
      return renewalList;
    } catch (error) {
      BU.CLI(error);
      throw error;
    }
  }

  /**
   * FIXME: 명령은 전체 갱신 처리해버림.
   * @description dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {contractCmdInfo[]} updatedFieldContractCmdList
   */
  compareContractCmdList(msInfo, updatedFieldContractCmdList = []) {
    // BU.CLI(updatedFieldContractCmdList);
    try {
      // Data Logger에서 보내온 List를 전부 적용해버림
      msInfo.msDataInfo.contractCmdList = updatedFieldContractCmdList;

      // // 수신 받은 노드 리스트를 순회
      // _.forEach(receiveContractCmdList, contractCmdInfo => {
      //   const foundIndex = _.findIndex(msInfo.msDataInfo.contractCmdList, {
      //     uuid: contractCmdInfo.uuid,
      //   });

      //   // 데이터가 존재한다면 해당 명령의 변화가 생긴 것
      //   if (foundIndex !== -1) {
      //     // BU.CLI('변화가 생겼네요')
      //     _.pullAt(msInfo.msDataInfo.contractCmdList, foundIndex);
      //   }
      //   // 신규 데이터는 삽입
      //   msInfo.msDataInfo.contractCmdList.push(contractCmdInfo);
      // });
      // BU.CLI(msInfo.msDataInfo.contractCmdList);

      // Observer가 해당 메소드를 가지고 있다면 전송
      this.observers.forEach(observer => {
        if (_.get(observer, 'updateContractCmdList')) {
          observer.updateContractCmdList(msInfo);
        }
      });

      return msInfo.msDataInfo.contractCmdList;
    } catch (error) {
      throw error;
    }
  }
}
module.exports = ApiServer;

/**
 * @typedef {Object} wsNodeInfo
 * @property {string} nri node_real_id
 * @property {number|string} d data
 */
