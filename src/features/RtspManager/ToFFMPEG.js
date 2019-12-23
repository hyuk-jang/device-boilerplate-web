const events = require('events');
const { spawn } = require('child_process');

const app = require('express')();

// const server = http.createServer(app);
const server = require('http').createServer(app);
// const server = require('http').Server(app);

const { BU } = require('base-util-jh');

const AbstRtspManager = require('./AbstRtspManager');

/**
 * @desc SocketIO 사용
 * RTSP 접속을 한 후 수신받은 Stream Data를 Express App 에 호스팅 처리함.
 * H264 인코딩 처리를 한 후 FFMPEG 플레이어로 실행
 */
class ToFFMPEG extends AbstRtspManager {
  /**
   * RTSP 통신 초기화
   * @param {Object} rtspConfig rtspConfig 설정
   * @param {string} rtspConfig.rtspUrl RTSP URL
   * @param {number} rtspConfig.streamWebPort RTSP 데이터를 변환처리 할 Sub Express Web Server Port
   */
  init(rtspConfig) {
    const { rtspUrl, streamWebPort } = rtspConfig;

    // Sub Server 구동
    server.listen(streamWebPort);

    this.appSetting(streamWebPort);

    this.connectRtspServer(rtspUrl, streamWebPort);
  }

  /**
   * 운영 중인 express App에 RTSP Stream 데이터를 연결(pipe) 처리 함.
   * @param {express} webPort cctv stream 주소
   */
  appSetting(number) {
    const Emitters = {};
    const initEmitter = feed => {
      if (!Emitters[feed]) {
        Emitters[feed] = new events.EventEmitter().setMaxListeners(0);
      }
      return Emitters[feed];
    };

    app.all('/streamIn/:feed', (req, res) => {
      req.Emitter = initEmitter(req.params.feed);
      // req.params.feed = Feed Number (Pipe Number)
      res.connection.setTimeout(0);
      req.on('data', buffer => {
        req.Emitter.emit('data', buffer);
        this.io.to(`STREAM_${req.params.feed}`).emit('h264', { feed: req.params.feed, buffer });
      });
      req.on('end', () => {
        console.log('close');
      });
    });

    // simulate RTSP over HTTP
    app.get(['/h264', '/h264/:feed'], (req, res) => {
      if (!req.params.feed) {
        req.params.feed = '1';
      }
      req.Emitter = initEmitter(req.params.feed);
      let contentWriter;
      const date = new Date();
      res.writeHead(200, {
        Date: date.toUTCString(),
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Content-Type': 'video/mp4',
        Server: 'H.264 Test Stream',
      });
      req.Emitter.on(
        'data',
        (contentWriter = buffer => {
          res.write(buffer);
        }),
      );
      res.on('close', () => {
        req.Emitter.removeListener('data', contentWriter);
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
   *
   * @param {string} rtspUrl RTSP URL
   * @param {number} webPort Local Web Server Port
   */
  connectRtspServer(rtspUrl, webPort) {
    // BU.CLI(rtspUrl, webPort);
    let ffmpegString = `-i ${rtspUrl}`;
    ffmpegString += ` -f mpegts -c:v mpeg1video -s 960x540 -an http://localhost:${webPort}/streamIn/1`;
    ffmpegString += ` -f mpegts -c:v mpeg1video -an http://localhost:${webPort}/streamIn/2`;
    if (ffmpegString.indexOf('rtsp://') > -1) {
      ffmpegString = `-rtsp_transport tcp ${ffmpegString}`;
    }
    console.log(`Executing : ffmpeg ${ffmpegString}`);
    const ffmpeg = spawn('ffmpeg', ffmpegString.split(' '));
    ffmpeg.on('close', buffer => {
      console.log('ffmpeg died', buffer);
    });

    // socket.io client commands
    this.io.on('connection', socket => {
      // socket.on('certifySocket', target => {
      //   /** @type {msUserInfo} */
      //   const msUser = target;

      //   const { sessionUserInfo } = msUser;
      //   const { user_id: userId } = sessionUserInfo;

      //   // 거점을 찾을 경우 초기 값을 보내줌.
      //   // if (userId === 'muan') {
      //   stream.on('data', pipeStream);
      //   // }
      // });

      socket.on('f', data => {
        switch (data.function) {
          case 'getStream':
            socket.join(`STREAM_${data.feed}`);
            break;
          default:
            break;
        }
      });
    });
  }
}
module.exports = ToFFMPEG;
