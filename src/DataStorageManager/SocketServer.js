const EventEmitter = require('events');
const _ = require('lodash');
const split = require('split');
const { BU } = require('base-util-jh');
const { BM } = require('base-model-jh');

const net = require('net');
// const AbstDeviceClient = require('device-client-controller-jh');
const { BaseModel } = require('../../../../module/device-protocol-converter-jh');

const { dcmWsModel } = require('../../../../module/default-intelligence');

const Control = require('./Control');

const socketServerConfig = require('./config');

class SocketServer extends EventEmitter {
  /**
   *
   * @param {socketServerConfig} config
   */
  constructor(config = socketServerConfig) {
    super();
    this.config = config;

    /**
     * 해당 Socket Serve를 감시하고 있는 객체
     * @type {Control[]}
     */
    this.observerList = [];

    this.defaultConverter = BaseModel.defaultModule;
    /**
     * Main Storage List에서 각각의 거점 별 모든 정보를 가지고 있을 객체 정보 목록
     * @type {msInfo[]}
     */
    this.mainStorageList = [];

    /**
     * Socket Server에 접속하는 거점 Socket Client 목록
     * @type {net.Socket[]}
     */
    this.clientList = [];
  }

  /**
   * Observer 추가
   * @param {Object} parent
   */
  attach(parent) {
    this.observerList.push(parent);
  }

  /**
   * @desc Step 1
   * DB에서 특정 데이터를 가져오고 싶을경우
   * @param {dbInfo} dbInfo
   * @param {string} mainUuid main UUID
   */
  async setMainStorageByDB(dbInfo) {
    this.biModule = new BM(dbInfo);

    // DB에서 main 정보를 가져옴
    /** @type {MAIN[]} */
    const mainList = await this.biModule.getTable('main', { is_deleted: 0 });

    /** @type {dataLoggerInfo[]} */
    const dataLoggerList = await this.biModule.getTable('v_dv_data_logger');
    /** @type {nodeInfo[]} */
    const nodeList = await this.biModule.getTable('v_dv_node');

    // mainList = _.sortBy(mainList, 'main_seq');
    // Main 정보 만큼 List 생성
    mainList.forEach(mainInfo => {
      const filterDataLoggerList = _.filter(dataLoggerList, {
        main_seq: mainInfo.main_seq,
      });
      const filterNodeList = _.filter(nodeList, {
        main_seq: mainInfo.main_seq,
      });
      /** @type {msInfo} */
      const mainStorageInfo = {
        msFieldInfo: mainInfo,
        msClient: null,
        msDataInfo: {
          dataLoggerList: filterDataLoggerList,
          nodeList: filterNodeList,
          simpleOrderList: [],
        },
      };

      this.mainStorageList.push(mainStorageInfo);
    });

    return this.mainStorageList;
  }

  /**
   * @desc Step 2
   * Socket Server 구동
   * @param {number} port
   */
  init() {
    const server = net
      .createServer(socket => {
        // socket.end('goodbye\n');
        console.log(
          `client is Connected ${this.config.socketServerPort}\n addressInfo: ${
            socket.remoteAddress
          }`,
        );

        // steram 연결 및 파서 등록
        const stream = socket.pipe(split(this.defaultConverter.protocolConverter.EOT));
        // 데이터 수신
        stream.on('data', data => {
          try {
            // Parser 가 EOT 까지 삭제하므로 끝에 붙임
            data += this.defaultConverter.protocolConverter.EOT;
            // BU.CLI(data);
            // 수신받은 데이터의 CRC 계산 및 본 데이터 추출
            const strData = this.defaultConverter.decodingMsg(data).toString();
            // BU.CLI(strData);

            // JSON 형태로만 데이터를 받아 들임.
            if (!BU.IsJsonString(strData)) {
              BU.errorLog('socketServer', '데이터가 JSON 형식이 아닙니다.');
              throw new Error('데이터가 JSON 형식이 아닙니다.');
            }

            // JSON 객체로 변환
            /** @type {defaultFormatToRequest|defaultFormatToResponse} */
            const requestedDataByDataLogger = JSON.parse(strData);
            // BU.CLI(requestedDataByDataLogger);

            // isError Key가 존재하고 Number 형태라면 요청에 대한 응답이라고 판단하고 이벤트 발생
            if (_.isNumber(_.get(requestedDataByDataLogger, 'isError'))) {
              const msInfo = this.findMsInfoByClient(socket);
              return this.observerList.forEach(observer => {
                if (_.get(observer, 'responsedDataFromDataLogger')) {
                  observer.responsedDataFromDataLogger(msInfo, requestedDataByDataLogger);
                }
              });
            }

            // JSON 객체 분석 메소드 호출
            const responseDataByServer = this.interpretCommand(socket, requestedDataByDataLogger);
            // 여기까지 오면 유효한 데이터로 생각하고 완료 처리
            // BU.CLI(responseDataByServer);
            socket.write(this.defaultConverter.encodingMsg(responseDataByServer));
          } catch (error) {
            BU.logFile(error);
            socket.write(
              this.defaultConverter.encodingMsg(this.defaultConverter.protocolConverter.CAN),
            );
            throw error;
          }
        });

        socket.on('error', err => {
          // socket.emit('close')
          BU.logFile(err);
          socket.emit('close');
        });

        // client가 접속 해제 될 경우에는 clientList에서 제거
        // TODO: Socket 접속이 해제 되었을 경우 Node, Order 정보를 초기화 시키고 SocketIO로 전송 로직 필요
        socket.on('close', () => {
          // 저장소 목록을 돌면서 해당 client를 초기화
          this.mainStorageList.forEach(msInfo => {
            if (_.isEqual(msInfo.msClient, socket)) {
              // msClient 초기화
              msInfo.msClient = null;
              // Data Logger와의 접속이 끊어졌다고 알림
              this.observerList.forEach(observer => {
                if (_.get(observer, 'updateMsClient')) {
                  observer.updateMsClient(msInfo);
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
    server.listen(this.config.socketServerPort, () => {
      console.log('Opend socket server on', server.address());
    });

    server.on('close', () => {
      console.log('close');
    });

    server.on('error', err => {
      console.error(err);
    });
  }

  /**
   * Client에서 인증을 하고자 할 경우
   * FIXME: uuid를 통한 인증을 함. Diffle Hellman 으로 추후 변경해야 할 듯
   * @param {net.Socket} client
   * @param {defaultFormatToRequest} requestedDataByDataLogger
   * @return {defaultFormatToResponse}
   */
  certifyClient(client, requestedDataByDataLogger) {
    /** @type {defaultFormatToResponse} */
    const responseDataByServer = {
      commandId: requestedDataByDataLogger.commandId,
      isError: 1,
    };
    const uuid = requestedDataByDataLogger.contents;
    const foundIt = _.find(this.mainStorageList, msInfo =>
      _.isEqual(msInfo.msFieldInfo.uuid, uuid),
    );
    // 인증이 성공했다면 Socket Client를 적용.
    if (foundIt) {
      foundIt.msClient = client;
      responseDataByServer.isError = 0;

      // Data Logger와의 접속이 연결되었다고 알림
      // TODO: Socket 접속이 연결 되었을 경우 Socket에게 Node, Order 정보를 요청하고 반영하는 로직 필요
      this.observerList.forEach(observer => {
        if (_.get(observer, 'updateMsClient')) {
          observer.updateMsClient(foundIt);
        }
      });
    } else {
      responseDataByServer.errorStack = '등록되지 않은 거점입니다.';
    }
    return responseDataByServer;
  }

  /**
   * Client에서 보내온 데이터를 해석
   * @param {net.Socket} client
   * @param {defaultFormatToRequest} requestedDataByDataLogger
   * @return {defaultFormatToResponse} 정상적인 명령 해석이라면 true, 아니라면 throw
   */
  interpretCommand(client, requestedDataByDataLogger) {
    // BU.CLI(requestedDataByDataLogger);

    try {
      const {
        CERTIFICATION,
        COMMAND,
        NODE,
        STAUTS,
        POWER_BOARD,
      } = dcmWsModel.transmitToServerCommandType;
      // client를 인증하고자 하는 경우
      if (requestedDataByDataLogger.commandId === CERTIFICATION) {
        return this.certifyClient(client, requestedDataByDataLogger);
      }

      /** @type {defaultFormatToResponse} */
      const responseDataByServer = {
        commandId: requestedDataByDataLogger.commandId,
        isError: 0,
        errorStack: '',
      };

      const msInfo = this.findMsInfoByClient(client);
      if (msInfo) {
        switch (requestedDataByDataLogger.commandId) {
          case NODE: // 노드 정보가 업데이트 되었을 경우
            this.compareNodeList(msInfo, requestedDataByDataLogger.contents);
            break;
          case COMMAND: // 명령 정보가 업데이트 되었을 경우
            this.compareSimpleOrderList(msInfo, requestedDataByDataLogger.contents);
            break;
          case STAUTS: // 현황판 데이터를 요청할 경우
            this.transmitDataToClient(msInfo.msClient, msInfo.msDataInfo.statusBoard);
            break;
          case POWER_BOARD: // 현황판 데이터를 요청할 경우
            responseDataByServer.contents = msInfo.msDataInfo.statusBoard;
            // BU.CLI(responseDataByServer)
            break;
          default:
            responseDataByServer.isError = 1;
            responseDataByServer.errorStack = `${
              requestedDataByDataLogger.commandId
            }은 등록되지 않은 명령입니다.`;
        }
        return responseDataByServer;
      }
      responseDataByServer.isError = 1;
      responseDataByServer.errorStack = '사용자 인증이 필요합니다.';
      return responseDataByServer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Main Storage 안에 있는 데이터 중 client와 동일한 객체 반환
   * @param {net.Socket} client
   * @return {msInfo}
   */
  findMsInfoByClient(client) {
    try {
      const foundIt = _.find(this.mainStorageList, msInfo => _.isEqual(msInfo.msClient, client));
      // 해당 객체가 있을 경우만 처리
      if (!foundIt) {
        throw new Error(`${client.remoteAddress}는 등록되지 않은 Client 입니다.`);
      }
      return foundIt;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Client로 데이터를 보내는 메소드. data가 null이라면 데이터 전송하지 않음.
   * @param {net.Socket} client
   * @param {Buffer} data
   */
  transmitDataToClient(client, data) {
    try {
      if (!_.isNull(data)) {
        client.write(data);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * @desc dcmWsModel.transmitToServerCommandType.NODE 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {nodeInfo[]} nodeList
   */
  compareNodeList(msInfo, nodeList) {
    try {
      /** @type {nodeInfo[]} */
      const renewalList = [];
      // 수신 받은 노드 리스트를 순회
      _.forEach(nodeList, nodeInfo => {
        const msNodeInfo = _.find(msInfo.msDataInfo.nodeList, {
          node_real_id: nodeInfo.node_real_id,
        });

        // 데이터가 서로 다르다면 갱신된 데이터
        if (!_.isEqual(nodeInfo.data, msNodeInfo.data)) {
          msNodeInfo.data = nodeInfo.data;
          renewalList.push(msNodeInfo);
        }
      });

      // 업데이트 내역이 있다면 전송
      if (renewalList.length) {
        // Observer가 해당 메소드를 가지고 있다면 전송
        this.observerList.forEach(observer => {
          if (_.get(observer, 'updateNodeList')) {
            observer.updateNodeList(msInfo, renewalList);
          }
        });
      }
      // BU.CLI(renewalList);
      return renewalList;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @desc dcmWsModel.transmitToServerCommandType.COMMAND 명렁 처리 메소드
   * @param {msInfo} msInfo
   * @param {simpleOrderInfo[]} receiveSimpleOrderList
   */
  compareSimpleOrderList(msInfo, receiveSimpleOrderList) {
    // BU.CLI(receiveSimpleOrderList);
    try {
      // Data Logger에서 보내온 List를 전부 적용해버림
      msInfo.msDataInfo.simpleOrderList = receiveSimpleOrderList;

      // // 수신 받은 노드 리스트를 순회
      // _.forEach(receiveSimpleOrderList, simpleOrderInfo => {
      //   const foundIndex = _.findIndex(msInfo.msDataInfo.simpleOrderList, {
      //     uuid: simpleOrderInfo.uuid,
      //   });

      //   // 데이터가 존재한다면 해당 명령의 변화가 생긴 것
      //   if (foundIndex !== -1) {
      //     // BU.CLI('변화가 생겼네요')
      //     _.pullAt(msInfo.msDataInfo.simpleOrderList, foundIndex);
      //   }
      //   // 신규 데이터는 삽입
      //   msInfo.msDataInfo.simpleOrderList.push(simpleOrderInfo);
      // });
      // BU.CLI(msInfo.msDataInfo.simpleOrderList);

      // Observer가 해당 메소드를 가지고 있다면 전송
      this.observerList.forEach(observer => {
        if (_.get(observer, 'updateSimpleOrderList')) {
          observer.updateSimpleOrderList(msInfo);
        }
      });

      return msInfo.msDataInfo.simpleOrderList;
    } catch (error) {
      throw error;
    }
  }
}
module.exports = SocketServer;
