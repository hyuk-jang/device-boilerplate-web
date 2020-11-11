/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '농가 보급형 태양광',
      imgPath: 's2w.ico',
    },
    homeInfo: {
      name: '농가 보급형 태양광',
      imgPath: 's2w_logo.png',
    },
    loginInfo: {
      name: '농가 보급형 태양광',
      imgPath: 'bg_fp.jpg',
    },
    contentsInfo: {
      imgPath: 'bg_fp.jpg',
    },
    footerInfo: {
      copyrightInfo: {
        company: '(주)에스엠소프트',
        address: '전라남도 나주시 빛가람동 892-7 3층 Tel) 061-285-3411',
        href: 'http://smsoft.co.kr',
        imgPath: '/image/icon/sm_logo.png',
      },
    },
  },
  naviList: [
    {
      href: 'main',
      name: '메인',
    },
    {
      href: 'control',
      name: '제어',
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
    {
      href: 'inverter',
      name: '인버터',
      chartInfo: {
        blockChartInfo: {
          blockId: 'inverter',
          nameExpInfo: {
            isMain: true,
          },
          chartIdList: ['invPowerChart'],
        },
      },
    },
    {
      href: 'sensor',
      name: '생육환경',
    },
    {
      href: 'trend',
      name: '트렌드',
      subCategoryList: [
        {
          subCategory: 'inverter',
          btnName: '인버터',
          chartInfo: {
            blockChartInfo: {
              blockId: 'inverter',
              nameExpInfo: {
                isMain: false,
              },
              chartIdList: [
                'invPowerChart',
                'invPvChart',
                'invGridChart',
                'intervalPowerChart',
                'cumulativeMwhChart',
              ],
            },
          },
        },
        {
          subCategory: 'sensor',
          btnName: '생육환경',
          chartInfo: {
            sensorChartList: [
              'solarChart',
              'luxChart',
              'waterValueChart',
              'temperatureChart',
              'rehChart',
            ],
          },
        },
      ],
    },
    {
      href: 'report',
      name: '레포트',
      subCategoryList: [
        {
          subCategory: 'inverter',
          btnName: '인버터',
        },
        {
          subCategory: 'sensor',
          btnName: '생육환경',
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
