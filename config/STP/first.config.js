/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '산업공정열 공급용 집광형 태양열 플랜트 관리 시스템 v1.0',
      imgPath: 'sm.ico',
    },
    homeInfo: {
      name: '산업공정열 공급용 집광형 태양열 플랜트 관리 시스템 v1.0',
      imgPath: 'sm_logo.png',
    },
    loginInfo: {
      name: '산업공정열 공급용 집광형 태양열 플랜트 관리 시스템 v1.0',
    },
    footerInfo: {
      copyrightInfo: {
        company: '(주)에스엠소프트',
        address: '전라남도 나주시 빛가람동 892-7 3층 Tel) 061-285-3411',
        href: 'http://smsoft.co.kr',
        imgPath: '/image/icon/sm_logo.png',
      },
      noticeList: [
        {
          name: '사용자 취급 설명서',
          href: '/docs/manual.pptx',
        },
      ],
    },
  },
  naviList: [
    {
      href: 'control',
      name: '메인',
      subCategoryList: [
        {
          subCategory: 'command',
          btnName: '모니터링',
          // chartInfo: {
          //   sensorChartList: ['batteryChart'],
          // },
        },
        // {
        //   subCategory: 'history',
        //   btnName: '제어이력',
        // },
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
            sensorChartList: [
              'ampChart',
              'fdValveChart',
              'frCumChart',
              'frequencyChart',
              'pressureChart',
              'envChart',
            ],
          },
        },
      ],
    },
    // {
    //   href: 'report',
    //   name: '레포트',
    //   subCategoryList: [
    //     {
    //       subCategory: 'sensor',
    //       btnName: '장치 데이터',
    //     },
    //   ],
    // },
    {
      href: 'myPage',
      name: '마이페이지',
    },
    {
      href: 'admin',
      name: '관리',
      grade: ['admin'],
    },
  ],
};
