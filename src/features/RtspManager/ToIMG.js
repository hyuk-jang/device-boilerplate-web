const _ = require('lodash');
const cron = require('cron');
const uuid = require('uuid');
const base64Img = require('base64-img');
const { FFMpeg } = require('rtsp-ffmpeg');

const { BU } = require('base-util-jh');

const AbstRtspManager = require('./AbstRtspManager');

/**
 * @desc SocketIO 사용
 * @desc ToFFMPEG 에 비해 프레임이 간헐적으로 끊김
 * RTSP 접속을 한 후 수신받은 Stream Data를 string으로 변환한 후 Socket.Io 객체에 이벤트 전송
 * 이 Class를 사용할 경우 Html 에서는 Img Dom 에 전송해야함.
 */
class ToIMG extends AbstRtspManager {
  /**
   * RTSP 통신 초기화
   * @param {Object} rtspConfig rtspConfig 설정
   * @param {string} rtspConfig.rtspUrl RTSP URL
   */
  init(rtspConfig) {
    const { rtspUrl } = rtspConfig;

    this.runSnapshotCron(rtspUrl);
    // this.snapshot(rtspUrl);

    // this.connectRtspServer(rtspUrl);
  }

  /**
   * 저장소에 설정된 카메라 RTSP 목록만큼 카메라 스틸샷을 처리하는 메소드
   */
  runSnapshotScheduler() {
    // 저장소 목록을 순회
    this.controller.mainStorageList.forEach(msInfo => {
      // 카메라 목록 순회
      msInfo.msCameraList.forEach(cameraInfo => {
        // RTSP 경로 생성을 위한 인자 정의
        const {
          uri_rtsp_domain: uriDomain,
          uri_rtsp_port: uriPort,
          uri_rtsp_path: uriPath,
        } = cameraInfo;
        // RTSP 경로 생성
        const rtspUri = `rtsp://${uriDomain}${_.isNil(uriPort) ? '' : `:${uriPort}`}/${uriPath}`;

        // stream 객체 생성
        const stream = new FFMpeg({
          input: rtspUri,
          resolution: '640X480',
          rate: 1,
          quality: 3,
        });

        // Image 데이터 수신 핸들러
        stream.on('data', data => {
          // 필요한건 스틸 샷 1장이므로 스트림 종료
          stream.stop();

          // DB와 이미지 명으로 설정할 이름 생성
          const fileName = uuid.v4();

          // Buffer To Base64 변환
          const base64 = data.toString('base64');

          // 저장할 경로 설정
          const filePath = `snapshot/${msInfo.msFieldInfo.uuid}`;

          // 이미지 파일 저장
          base64Img.imgSync(`data:image/jpeg;base64,${base64}`, filePath, fileName);

          /** @type {CAMERA_SNAPSHOT_DATA} */
          const snapshotData = {
            camera_seq: cameraInfo.camera_seq,
            snapshot_uuid: fileName,
          };

          // DB에 1Row 추가
          this.controller.controlModel
            .setTable('camera_snapshot_data', snapshotData)
            .catch(err => BU.CLI(err));
        });
      });
    });
  }

  /**
   * @param {SocketIO} socketIo SocketIO 객체
   */
  bindingSocketIO(socketIo) {
    this.io = socketIo;
  }

  /**
   * 데이터 로거의 현 상태를 조회하는 스케줄러
   * @param {string} rtspUrl RTSP URL
   */
  runSnapshotCron(rtspUrl) {
    if (this.cronScheduler !== null) {
      this.cronScheduler.stop();
    }

    // BU.CLI(this.config.inquiryIntervalSecond)
    // 1분마다 요청
    this.cronScheduler = new cron.CronJob(
      '*/10 * * * *',
      () => {
        this.runSnapshotScheduler(rtspUrl);
      },
      null,
      true,
    );

    return true;
  }

  /**
   *
   * @param {string} rtspUrl RTSP URL
   */
  snapshot(rtspUrl) {
    const stream = new FFMpeg({ input: rtspUrl, resolution: '640X480', rate: 1, quality: 3 });

    // stream.on('data',)

    // const streamStop = _.once(stream.stop);

    let index = 0;

    stream.on('data', data => {
      stream.stop();

      // stream.stop();

      // const string = data;
      // const stringWithMime = `data:image/png;base64,${string}`;

      // console.log(isBase64(string)); // true
      // console.log(isBase64(stringWithMime)); // false
      // console.log(isBase64(stringWithMime, { mime: true })); // true
      // console.log(isBase64('1342234')); // false
      // console.log(isBase64('afQ$%rfew')); // false
      // console.log(isBase64('dfasdfr342')); // false
      // console.log(isBase64('uuLMhh==')); // true
      // console.log(isBase64('uuLMhh')); // false
      // console.log(isBase64('uuLMhh', { paddingRequired: false })); // true
      // console.log(isBase64('')); // true
      // console.log(isBase64('', { allowBlank: false })); // false

      index += 1;
      // fs.writeFile(`${index}.txt`, data.toString('base64'), err => {
      //   if (index === 3) {
      //     stream.stop();
      //     BU.CLI('Stop Complete');
      //   }
      // });

      // streamStop();
    });
  }

  /**
   *
   * @param {string} rtspUrl RTSP URL
   */
  connectRtspServer(rtspUrl) {
    const stream = new FFMpeg({ input: rtspUrl, resolution: '640X480', rate: 5, quality: 5 });

    this.io.on('connection', socket => {
      // 접속한 Socket 등록
      const pipeStream = data => {
        BU.CLI(('pipeStream', data.length));
        socket.emit('data', data.toString('base64'));
        // stream.removeListener('data', pipeStream);
      };

      socket.on('certifySocket', target => {
        /** @type {msUserInfo} */
        const msUser = target;

        const { sessionUserInfo } = msUser;
        const { user_id: userId } = sessionUserInfo;

        // 로그인 유저가 muan 일 경우에만 데이터 전송
        // if (userId === 'muan') {
        //   stream.on('data', pipeStream);
        // }
      });

      // 연결 해제한 Socket 제거
      socket.on('disconnect', () => {
        stream.removeListener('data', pipeStream);
      });
    });
  }
}
module.exports = ToIMG;
