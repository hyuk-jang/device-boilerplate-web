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
   * @param {number} rtspConfig.webPort Local Web Server Port
   */
  init(rtspConfig) {
    const { rtspUrl } = rtspConfig;

    this.connectRtspServer(rtspUrl);
  }

  /**
   *
   * @param {string} rtspUrl RTSP URL
   */
  connectRtspServer(rtspUrl) {
    const stream = new FFMpeg({ input: rtspUrl });

    this.io.on('connection', socket => {
      // 접속한 Socket 등록
      const pipeStream = data => {
        socket.emit('data', data.toString('base64'));
      };

      socket.on('certifySocket', target => {
        /** @type {msUserInfo} */
        const msUser = target;

        const { sessionUserInfo } = msUser;
        const { user_id: userId } = sessionUserInfo;

        // 거점을 찾을 경우 초기 값을 보내줌.
        // if (userId === 'muan') {
        stream.on('data', pipeStream);
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
