/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '옥상형 태양광 v1.0',
      imgPath: 'sm.ico',
    },
    homeInfo: {
      name: '옥상형 태양광 v1.0',
      imgPath: 'sm_logo.png',
    },
    loginInfo: {
      name: '옥상형 태양광 v1.0',
    },
    footerInfo: {
      copyrightInfo: {
        company: '(주)에스엠소프트',
        address: '전라남도 나주시 빛가람동 892-7 3층 Tel) 061-285-3411',
        href: 'http://smsoft.co.kr',
        imgPath: '/image/icon/sm_logo.png',
      },
      noticeList: [
        // {
        //   name: '사용자 취급 설명서',
        //   href: '/docs/manual.pptx',
        // },
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
        // {
        //   subCategory: 'sensor',
        //   btnName: '센서',
        //   chartInfo: {
        //     sensorChartList: ['pump'],
        //   },
        // },
      ],
    },
    {
      href: 'report',
      name: '레포트',
      subCategoryList: [
        {
          subCategory: 'inverter',
          btnName: '인버터 데이터',
        },
      ],
    },
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

  /**
   * 인버터 레포트 생성 정보
   * @return {blockViewMakeOption[]}
   */
  get reportInverterViewList() {
    /** @type {blockViewMakeOption} */
    return [
      {
        dataKey: 'avg_pv_v',
        dataName: 'DC 전압',
        dataUnit: 'V',
        mainTitle: '태양광',
      },
      {
        dataKey: 'avg_pv_a',
        dataName: 'DC 전류',
        dataUnit: 'A',
        mainTitle: '태양광',
      },
      {
        dataKey: 'avg_pv_kw',
        dataName: 'DC 전력',
        dataUnit: 'kW',
        mainTitle: '태양광',
      },
      {
        dataKey: 'avg_grid_rs_v',
        dataName: 'AC 전압',
        dataUnit: 'V',
        mainTitle: '인버터',
      },
      {
        dataKey: 'avg_grid_r_a',
        dataName: 'AC 전류',
        dataUnit: 'A',
        mainTitle: '인버터',
      },
      {
        dataKey: 'avg_power_kw',
        dataName: 'AC 전력',
        dataUnit: 'kW',
        mainTitle: '인버터',
      },
      {
        dataKey: 'avg_line_f',
        dataName: '주파수',
        dataUnit: 'Hz',
        mainTitle: '인버터',
      },
      {
        dataKey: 'avg_p_f',
        dataName: '효율',
        dataUnit: '%',
        mainTitle: '인버터',
      },
      {
        dataKey: 'interval_power',
        dataName: '기간 발전량',
        dataUnit: 'kWh',
        mainTitle: '발전 현황',
      },
      {
        dataKey: 'max_c_kwh',
        dataName: '누적 발전량',
        dataUnit: 'MWh',
        scale: 0.001,
        toFixed: 4,
        mainTitle: '발전 현황',
      },
    ];
  },
};
