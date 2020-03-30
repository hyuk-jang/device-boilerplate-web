const _ = require('lodash');
const { BU } = require('base-util-jh');

const Control = require('../../../Control');

const Weathercast = require('../../../features/Weathercast/Weathercast');
const SocketIOManager = require('../../../features/SocketIOManager/SocketIOManager');
const ApiServer = require('../../../features/ApiCommunicator/ApiServer');

// const RtspManager = require('../../../features/RtspManager/ToFFMPEG');
const RtspManager = require('../../../features/RtspManager/ToIMG');

// const { Dba } = require('../../../module');

class FpRndControl extends Control {
  bindingFeature() {
    // BU.CLI('bindingFeature');
    this.weathercast = new Weathercast();
    /** @type {SocketIOManager} */
    this.socketIoManager = new SocketIOManager(this);

    /** @type {ApiServer} */
    this.apiServer = new ApiServer(this);

    /** @type {RtspManager} */
    this.rtspManager = new RtspManager(this);
  }

  /**
   * 생성된 Feature를 구동시킴
   * @param {featureConfig} featureConfig
   */
  runFeature(featureConfig) {
    const { isStopWeathercast = false, ioConfig, apiConfig, rtspConfig } = featureConfig;

    // 기상청 동네예보 스케줄러 구동
    !isStopWeathercast && this.weathercast.init(this.dbInfo);

    this.socketIoManager.init(ioConfig);

    this.apiServer.init(apiConfig);

    // this.rtspManager.bindingSocketIO(this.socketIoManager.io);

    // this.rtspManager.init(rtspConfig);

    // this.createMuanCCTV();
  }

  /**
   * @desc Step 1
   * Main Storage List를 초기화
   * @param {dbInfo=} dbInfo
   */
  async setMainStorage(dbInfo) {
    await super.setMainStorage(dbInfo);

    /** @type {CAMERA[]} */
    const cameraList = await this.controlModel.getTable('camera', { is_deleted: 0 });

    // 카메라 목록 설정
    this.mainStorageList.forEach(msInfo => {
      msInfo.msCameraList = _.filter(cameraList, { main_seq: msInfo.msFieldInfo.main_seq });
    });
  }

  /**
   * 무안 CCTV를 제어하기 위한 임시 컨트롤러 생성
   */
  createMuanCCTV() {
    // this.muanDBA = new Dba({
    //   deviceInfo: {
    //     target_id: 'muanCCTV',
    //     logOption: {
    //       hasCommanderResponse: true,
    //       hasDcError: true,
    //       hasDcEvent: true,
    //       hasReceiveData: true,
    //       hasDcMessage: true,
    //       hasTransferCommand: true,
    //     },
    //     controlInfo: {
    //       hasErrorHandling: false,
    //       hasOneAndOne: false,
    //       hasReconnect: false,
    //     },
    //     connect_info: {
    //       type: 'udp',
    //       subType: 'parser',
    //       addConfigInfo: {
    //         parser: 'readLineParser',
    //         // parser: 'delimiterParser',
    //         option: '\u000d\u000a',
    //         // option: '\r\n',
    //       },
    //       host: 'smsoft.iptime.org',
    //       port: 4210,
    //     },
    //   },
    // });

    this.socketIoManager.io.on('connection', socket => {
      // 사용자 브라우저에서 명령 요청이 발생할 경우 처리
      socket.on('executeCommand', msg => {
        // BU.CLI(msg)
        /** @type {defaultFormatToRequest} */
        const defaultFormatToRequestInfo = msg;

        /** @type {V_MEMBER} */
        const userInfo = defaultFormatToRequestInfo.contents.user;

        // 접속 ID가 무안 관리자 일 경우 명령 처리
        if (_.eq(userInfo.user_id, 'muan')) {
          this.controlMuanCCTV(defaultFormatToRequestInfo.contents.singleControlType);
        }
      });
    });
  }

  /**
   * 무안 30kW 급 CCTV를 제어하기 위한 임시 로직
   */
  async controlMuanCCTV(singleControlType) {
    BU.CLI('controlMuanCCTV', singleControlType);
    await this.muanDBA.init();
    // BU.CLI('init complate');
    try {
      let command = '';
      switch (singleControlType) {
        case 0:
          command = '@off';
          break;
        case 1:
          command = '@on';
          break;
        case 2:
          command = '@state';
          break;
        default:
          command = '@state';
          break;
      }

      // BU.CLI('command', command);
      await this.muanDBA.writeMsg(command);
      this.muanDBA.disconnect();
    } catch (error) {
      BU.errorLog('controlMuanCCTV', error);
      this.muanDBA.disconnect();
    }
  }
}
module.exports = FpRndControl;
