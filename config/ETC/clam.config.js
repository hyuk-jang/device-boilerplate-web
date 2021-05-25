/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '조개 세척 시스템',
      imgPath: 'sm.ico',
    },
    homeInfo: {
      name: '조개 세척 시스템',
      imgPath: 'sm_logo.png',
    },
    loginInfo: {
      name: '조개 세척 시스템',
    },
    footerInfo: {
      copyrightInfo: {
        // company: '조실장!',
        // address: '주소',
        // href: 'http://smsoft.co.kr',
        // imgPath: '/image/icon/sm_logo.png',
      },
      noticeList: [],
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
        },
        {
          subCategory: 'history',
          btnName: '제어이력',
        },
      ],
    },
    // {
    //   href: 'trend',
    //   name: '트렌드',
    //   subCategoryList: [
    //     {
    //       subCategory: 'sensor',
    //       btnName: '센서',
    //       chartInfo: {
    //         sensorChartList: ['frequency', 'waterLevel', 'frIns', 'temp'],
    //       },
    //     },
    //   ],
    // },
  ],
};
