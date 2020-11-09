/**
 * @type {projectConfig}
 */
module.exports = {
  viewInfo: {
    titleInfo: {
      name: '영농형 태양광 통합 관리 시스템 v1.0',
      imgPath: 'fp.ico',
    },
    homeInfo: {
      name: '영농형 태양광 통합 관리 시스템 v1.0',
      imgPath: 'fp_logo.png',
    },
    loginInfo: {
      name: '영농형 태양광 통합 관리 시스템 v1.0',
      imgPath: 'bg_fp.jpg',
    },
    contentsInfo: {
      imgPath: 'bg_fp.jpg',
    },
  },
  naviList: [
    {
      href: 'main',
      name: '메인',
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
              'windSpeedChart',
              'co2Chart',
              'r1Chart',
              'isRainChart',
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
