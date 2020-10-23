const ENV = process.env;

/** ENV에 등록되는 설정 정보 나열. */
module.exports = {
  projectInfo: {
    projectMainId: ENV.PJ_MAIN_ID || 'FP',
    projectSubId: ENV.PJ_SUB_ID || 'RnD',
    featureConfig: {
      apiConfig: {
        socketPort: ENV.PJ_API_PORT || 7510,
      },
      rtspConfig: {
        // rtspUrl: 'rtsp://smsoft.iptime.org:30554/live.sdp',
        rtspUrl: 'rtsp://b1.dnsdojo.com:1935/live/sys3.stream',
        // rtspUrl: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov',
        streamWebPort: 40404,
      },
      isStopWeathercast: ENV.IS_STOP_WEATHERCAST === '1',
      isRunRtsp: ENV.IS_RUN_RTSP === '1',
    },
  },
  webServer: {
    httpPort: ENV.PJ_HTTP_PORT || 7500,
  },
  dbInfo: {
    port: ENV.PJ_DB_PORT || '3306',
    host: ENV.PJ_DB_HOST || 'localhost',
    user: ENV.PJ_DB_USER || 'root',
    password: ENV.PJ_DB_PW || 'smsoftware',
    database: ENV.PJ_DB_DB || 'farm_parallel',
  },
  dev: {
    devMode: ENV.NODE_ENV || 'production',
    devPage: ENV.DEV_PAGE || '/',
    isAutoAuth: ENV.DEV_AUTO_AUTH,
    userId: ENV.DEV_USER_ID,
    userPw: ENV.DEV_USER_PW,
  },
};
