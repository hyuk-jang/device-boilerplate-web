/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '태양광발전 IoT 소비전력 최적화 시스템 v1.0',
      imgPath: 'sm.ico',
    },
    homeInfo: {
      name: '태양광발전 IoT 소비전력 최적화 시스템 v1.0',
      imgPath: 'sm_logo.png',
    },
    loginInfo: {
      name: '태양광발전 IoT 소비전력 최적화 시스템 v1.0',
      // imgPath: 'bg_fp.jpg',
    },
    contentsInfo: {
      // imgPath: 'bg_fp.jpg',
    },
  },
  naviList: [
    {
      href: 'control',
      name: '메인',
      subCategoryList: [
        {
          subCategory: 'command',
          btnName: '제어관리',
          chartInfo: {
            sensorChartList: ['batteryChart'],
          },
        },
        {
          subCategory: 'history',
          btnName: '제어이력',
        },
      ],
    },
    {
      href: 'trend',
      name: '트렌드',
      subCategoryList: [
        {
          subCategory: 'sensor',
          btnName: '센서',
          chartInfo: {
            sensorChartList: ['batteryChart'],
          },
        },
      ],
    },
    {
      href: 'admin',
      name: '관리',
      grade: ['admin'],
    },
  ],
};
