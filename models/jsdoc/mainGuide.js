/**
 * @typedef {Object} projectConfig
 * @property {pcViewInfoStorage} viewInfo
 * @property {pcNaviInfo[]} naviList
 */

/**
 * @typedef {Object} pcViewInfoStorage
 * @property {pcViewInfo} titleInfo
 * @property {pcViewInfo} homeInfo
 * @property {pcViewInfo} loginInfo
 * @property {pcViewInfo} contentsInfo
 */

/**
 * @typedef {Object} pcViewInfo
 * @property {string} name view 이름
 * @property {string=} imgPath view 관련 이미지 경로
 */

/**
 * @typedef {Object} pcNaviInfo
 * @property {string} href 네비 주소. router 명과 href 일치
 * @property {string} name 네비 이름
 * @property {pcChartInfo=} chartInfo 차트 정보
 * @property {pcNaviCateInfo[]=} subCategoryList 서브 카테고리
 */

/**
 * @typedef {Object} pcNaviCateInfo
 * @property {string} subCategory 네비 주소. router 명과 href 일치
 * @property {string} btnName 네비 이름
 * @property {pcChartInfo} chartInfo 서브 카테고리
 */

/**
 * @typedef {Object} pcChartInfo
 * @property {pcBlockChartInfo} blockChartInfo 블럭 차트 목록
 * @property {string[]=} sensorChartList 센서 차트 목록
 */

/**
 * @typedef {Object} pcBlockChartInfo
 * @property {string} blockId 블럭 차트 목록
 * @property {{isMain: boolean}} nameExpInfo 블럭 차트 목록
 * @property {string[]=} chartIdList 센서 차트 목록
 */

/**
 * 생성된 Feature를 구동시킴
 * @typedef {Object} featureConfig
 * @property {boolean} isStopWeathercast SocketIOManager 설정
 * @property {boolean} isRunRtsp RTSP 설정
 * @property {Object} ioConfig SocketIOManager 설정
 * @property {httpServer} ioConfig.httpServer http 객체
 * @property {Object} apiConfig API Communicator 설정
 * @property {number} apiConfig.socketPort API Communicator 설정
 * @property {Object} rtspConfig rtspConfig 설정
 * @property {string} rtspConfig.rtspUrl RTSP URL
 * @property {number} rtspConfig.webPort Local Web Server Port
 */

module;
