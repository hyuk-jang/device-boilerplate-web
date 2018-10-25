const config = {
  hasDev: false, // 장치 연결을 실제로 하는지 여부
  socketServerPort: process.env.WEB_SOCKET_PORT,
  dbInfo: {
    port: process.env.WEB_DB_PORT || '3306',
    host: process.env.WEB_DB_HOST || 'localhost',
    user: process.env.WEB_DB_USER || 'root',
    password: process.env.WEB_DB_PW || 'test',
    database: process.env.WEB_DB_DB || 'test',
  },
};
module.exports = config;
