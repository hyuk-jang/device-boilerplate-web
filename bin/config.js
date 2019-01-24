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
        rtspUrl: 'rtsp://smsoft.iptime.org:30554/live.sdp',
        streamWebPort: 40404,
      },
      weathercastConfig: {
        isRunWeathercast: ENV.IS_RUN_WEATHERCAST === '0',
      },
    },
  },
  webServer: {
    httpPort: ENV.PJ_HTTP_PORT || 7500,
  },
  dbInfo: {
    port: ENV.PJ_DB_PORT || '3306',
    host: ENV.PJ_DB_HOST || 'localhost',
    user: ENV.PJ_DB_USER || 'root',
    password: ENV.PJ_DB_PW || 'test',
    database: ENV.PJ_DB_DB || 'test',
  },
  dev: {
    devMode: ENV.NODE_ENV,
    devPage: ENV.DEV_PAGE || '/',
    isAutoAuth: ENV.DEV_AUTO_AUTH,
    userId: ENV.DEV_USER_ID,
    userPw: ENV.DEV_USER_PW,
  },
};
