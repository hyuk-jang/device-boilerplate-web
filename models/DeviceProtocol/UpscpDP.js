const { BaseModel } = require('../../src/module').dpc;

const {
  Inverter: { BASE_KEY: BASE_INV_KEY },
  STP: { BASE_KEY: BASE_STP_KEY },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

module.exports = class extends DeviceProtocol {
  // constructor() {
  //   super();

  //   // this.BASE_KEY = BASE_STP_KEY;
  // }

  /**
   * 차트 생성 정보
   * @param {string} blockId
   * @return {blockTableInfo}
   */
  getBlockChart(blockId) {
    switch (blockId) {
      case 'inverter':
        return this.blockInverterChart;
      default:
        break;
    }
  }

  /**
   * 인버터 생성 정보
   * @return {blockTableInfo}
   */
  get blockInverterChart() {
    return {
      blockTableName: 'pw_inverter_data',
      baseTableInfo: {
        tableName: 'pw_inverter',
        idKey: 'target_id',
        placeKey: 'place_seq',
        fromToKeyTableList: [
          {
            fromKey: 'inverter_seq',
            toKey: 'inverter_seq',
          },
        ],
      },
      blockChartList: [
        {
          domId: 'invPowerChart',
          title: 'AC 출력',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.powerGridKw,
                  toKey: 'power_kw',
                  convertName: 'AC 출력',
                  toFixed: 4,
                },
              ],
              dataUnit: 'kW',
              yTitle: '전력(kW)',
            },
          ],
        },
        {
          domId: 'invPvChart',
          title: 'DC 현황',
          subtitle: '전압, 전류',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.pvVol,
                  toKey: 'pv_v',
                  convertName: '전압',
                  toFixed: 4,
                },
              ],
              dataUnit: 'V',
              yTitle: '전압(V)',
            },
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.pvAmp,
                  toKey: 'pv_a',
                  convertName: '전류',
                  toFixed: 4,
                },
              ],
              dataUnit: 'A',
              yTitle: '전류(A)',
            },
          ],
        },
        {
          domId: 'invGridChart',
          title: 'AC Grid 현황',
          subtitle: '전압, 전류',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.gridRsVol,
                  toKey: 'grid_rs_v',
                  convertName: 'RS 전압',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_INV_KEY.gridStVol,
                  toKey: 'grid_st_v',
                  convertName: 'ST 전압',
                  mixColor: '#eeeeee',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_INV_KEY.gridTrVol,
                  toKey: 'grid_tr_v',
                  convertName: 'TR 전압',
                  mixColor: '#dddddd',
                  toFixed: 4,
                },
              ],
              dataUnit: 'V',
              yTitle: '전압(V)',
            },
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.gridRAmp,
                  toKey: 'grid_r_a',
                  convertName: 'R 전류',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_INV_KEY.gridSAmp,
                  toKey: 'grid_s_a',
                  convertName: 'S 전류',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_INV_KEY.gridTAmp,
                  toKey: 'grid_t_a',
                  convertName: 'T 전류',
                  toFixed: 4,
                },
              ],
              dataUnit: 'A',
              yTitle: '전류(A)',
            },
          ],
        },
        {
          domId: 'intervalPowerChart',
          title: '기간 발전량',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.powerCpKwh,
                  toKey: 'power_cp_kwh',
                  convertKey: 'interval_power_cp_kwh',
                  convertName: '',
                  calcType: this.CALC_TYPE.INTERVAL_MAX,
                },
              ],
              dataUnit: 'kWh',
              yTitle: '전력(kWh)',
            },
          ],
        },
        {
          domId: 'cumulativeMwhChart',
          title: '누적 발전량',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.powerCpKwh,
                  toKey: 'power_cp_kwh',
                  convertKey: 'max_power_cp_mwh',
                  convertName: '',
                  calcType: this.CALC_TYPE.MAX,
                  scale: 0.001,
                  toFixed: 4,
                },
              ],
              dataUnit: 'MWh',
              yTitle: '전력(MWh)',
            },
          ],
        },
      ],
    };
  }

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
  }
};
