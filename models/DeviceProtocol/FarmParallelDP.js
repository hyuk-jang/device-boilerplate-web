const { BaseModel } = require('../../src/module').dpc;

const {
  FarmParallel: { BASE_KEY: BASE_FARM_KEY },
  Inverter: { BASE_KEY: BASE_INV_KEY },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

class FarmParallelDP extends DeviceProtocol {
  constructor() {
    super();

    this.BASE_KEY = BASE_FARM_KEY;
  }

  /**
   * @return {string[]} 현 프로젝트에서 사용할 Sensor 목록, ND Id List
   */
  get pickedNodeDefIdList() {
    return [
      BASE_FARM_KEY.pvRearTemperature,
      BASE_FARM_KEY.pvUnderlyingSolar,
      BASE_FARM_KEY.lux,
      BASE_FARM_KEY.co2,
      BASE_FARM_KEY.soilWaterValue,
      BASE_FARM_KEY.soilTemperature,
      BASE_FARM_KEY.soilReh,
      BASE_FARM_KEY.outsideAirTemperature,
      BASE_FARM_KEY.outsideAirReh,
      BASE_FARM_KEY.horizontalSolar,
      BASE_FARM_KEY.inclinedSolar,
      BASE_FARM_KEY.windSpeed,
      BASE_FARM_KEY.r1,
    ];
  }

  /**
   * @return {string[]} 내부 센서 ND ID 목록
   */
  get rowsNdIdList() {
    return [
      BASE_FARM_KEY.pvRearTemperature,
      BASE_FARM_KEY.pvUnderlyingSolar,
      BASE_FARM_KEY.inclinedSolar,
      BASE_FARM_KEY.lux,
      BASE_FARM_KEY.co2,
      BASE_FARM_KEY.soilWaterValue,
      BASE_FARM_KEY.soilTemperature,
      BASE_FARM_KEY.soilReh,
      BASE_FARM_KEY.outsideAirTemperature,
      BASE_FARM_KEY.outsideAirReh,
      BASE_FARM_KEY.horizontalSolar,
      // BASE_FARM_KEY.windDirection,
      BASE_FARM_KEY.windSpeed,
      BASE_FARM_KEY.r1,
      BASE_FARM_KEY.isRain,
    ];
  }

  /**
   * @return {string[]} 외기 센서 ND ID 목록
   */
  get rowspanNdIdList() {
    return [];
  }

  /**
   * Main 화면에 나타낼 데이터 목록
   * @return {string[]} Node Def Id List
   */
  get mainViewList() {
    return [
      BASE_FARM_KEY.pvUnderlyingSolar,
      BASE_FARM_KEY.lux,
      BASE_FARM_KEY.soilWaterValue,
      BASE_FARM_KEY.soilTemperature,
      BASE_FARM_KEY.soilReh,
      BASE_FARM_KEY.outsideAirTemperature,
      BASE_FARM_KEY.outsideAirReh,
      BASE_FARM_KEY.co2,
    ];
  }

  /**
   * 레포트 - 센서 페이지에서 나타낼 목록
   * @return {{key: string, protocol: string}[]} key: ND ID, protocol: CALC_TYPE
   */
  get senorReportProtocol() {
    const avgPickList = [
      BASE_FARM_KEY.pvRearTemperature,
      BASE_FARM_KEY.pvUnderlyingSolar,
      BASE_FARM_KEY.lux,
      BASE_FARM_KEY.co2,
      BASE_FARM_KEY.soilWaterValue,
      BASE_FARM_KEY.soilTemperature,
      BASE_FARM_KEY.soilReh,
      BASE_FARM_KEY.outsideAirTemperature,
      BASE_FARM_KEY.outsideAirReh,
      BASE_FARM_KEY.horizontalSolar,
      BASE_FARM_KEY.inclinedSolar,
      BASE_FARM_KEY.windSpeed,
      BASE_FARM_KEY.r1,
    ];

    return avgPickList.map(key => ({
      key,
      protocol: this.CALC_TYPE.AVG,
    }));
  }

  /**
   * 트렌드 생성 정보
   * @return {trendSensorDomConfig[]}
   */
  get trendSensorViewList() {
    return [
      {
        domId: 'solarChart',
        title: '일사량 정보',
        subtitle: '경사 일사량, 수평 일사량, 모듈 하부 일사량',
        chartOptionList: [
          {
            keys: [
              BASE_FARM_KEY.inclinedSolar,
              BASE_FARM_KEY.horizontalSolar,
              BASE_FARM_KEY.pvUnderlyingSolar,
            ],
            mixColors: [null, '#fab005', '#4c6ef5'],
            yTitle: '일사량',
            dataUnit: ' W/m²',
          },
        ],
      },
      {
        domId: 'luxChart',
        title: '조도 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.lux],
            mixColors: [null, '#d9480f'],
            yTitle: '조도',
            dataUnit: ' lx',
          },
        ],
      },
      {
        domId: 'waterValueChart',
        title: '토양 EC 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.soilWaterValue],
            mixColors: [null, '#d9480f'],
            yTitle: '토양 EC',
            dataUnit: ' %',
          },
        ],
      },
      {
        domId: 'temperatureChart',
        title: '온도 정보',
        subtitle: '토양 온도, 외기 온도',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.soilTemperature, BASE_FARM_KEY.outsideAirTemperature],
            mixColors: [null, '#5c940d'],
            yTitle: '온도',
            dataUnit: ' ℃',
          },
        ],
      },
      {
        domId: 'rehChart',
        title: '습도 정보',
        subtitle: '토양 습도, 외기 습도',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.soilReh, BASE_FARM_KEY.outsideAirReh],
            mixColors: [null, '#d9480f'],
            yTitle: '습도',
            dataUnit: ' %',
          },
        ],
      },
      {
        domId: 'windSpeedChart',
        title: '풍속 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.windSpeed],
            mixColors: [],
            yTitle: '풍속',
            dataUnit: ' m/s',
          },
        ],
      },
      {
        domId: 'co2Chart',
        title: '이산화탄소 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.co2],
            mixColors: [],
            yTitle: 'co2',
            dataUnit: ' ppm',
          },
        ],
      },
      {
        domId: 'r1Chart',
        title: '시간당 강우량 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.r1],
            mixColors: [],
            yTitle: '강우량',
            dataUnit: ' mm/h',
          },
        ],
      },
      {
        domId: 'isRainChart',
        title: '강우 감지 여부 정보',
        chartOptionList: [
          {
            keys: [BASE_FARM_KEY.isRain],
            mixColors: [],
            yTitle: '강우 감지 여부',
          },
        ],
      },
    ];
  }

  /**
   * 트렌드 인버터 생성 정보
   * @return {trendInverterDomConfig[]}
   */
  get trendInverterViewList() {
    return [
      {
        domId: 'avg_power_kw_chart',
        title: '평균 AC 전력',
        yAxisList: [
          {
            dataUnit: 'kW',
            yTitle: '전력(kW)',
          },
        ],
        dataKey: 'avg_power_kw',
      },
      {
        domId: 'avg_pv_v_chart',
        title: '평균 DC 전압',
        yAxisList: [
          {
            dataUnit: 'V',
            yTitle: '전압(V)',
          },
        ],
        dataKey: 'avg_pv_v',
      },
      {
        domId: 'avg_pv_a_chart',
        title: '평균 DC 전류',
        yAxisList: [
          {
            dataUnit: 'A',
            yTitle: '전류(V)',
          },
        ],
        dataKey: 'avg_pv_a',
      },
      {
        domId: 'interval_power_chart',
        title: '기간 발전량',
        yAxisList: [
          {
            dataUnit: 'kWh',
            yTitle: '전력(kWh)',
          },
        ],
        dataKey: 'interval_power',
      },
      {
        domId: 'max_c_kwh_chart',
        title: '누적 발전량',
        yAxisList: [
          {
            dataUnit: 'MWh',
            yTitle: '전력(MWh)',
          },
        ],
        dataKey: 'max_c_kwh',
        scale: 0.001,
        toFixed: 3,
      },
    ];
  }

  /**
   * @desc App
   * @return {string[]} 앱 Master로 쓸 센서  ND ID 목록
   */
  get appMasterViewList() {
    return [BASE_FARM_KEY.inclinedSolar];
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

  // FIXME: 이 아래로는 임시

  /**
   * 트렌드 생성 정보
   * @property {string} blockId
   * @return {blockTableInfo}
   */
  getBlockChart(blockId) {
    switch (blockId) {
      case 'farmSensor':
        return this.blockFarmSensor;
      case 'inverter':
        return this.blockInverterChart;
      // case 'inverter':
      //   return this.blockInverter;
      // case 'connector':
      //   return this.blockConnector;
      default:
        break;
    }
  }

  /**
   * 트렌드 생성 정보
   * @return {blockTableInfo}
   */
  get blockFarmSensor() {
    console.trace('blockFarmSensor');
    return {
      blockTableName: 'farm_sensor_data',
      baseTableInfo: {
        tableName: 'v_dv_place',
        idKey: 'place_real_id',
        placeKey: 'place_seq',
        placeClassKeyList: ['farmParallelSite', 'outside'],
        fromToKeyTableList: [
          {
            fromKey: 'place_seq',
            toKey: 'place_seq',
          },
        ],
      },
      blockChartList: [
        {
          domId: 'solarChart',
          title: '일사량 정보',
          subtitle: '경사 일사량, 수평 일사량, 모듈 하부 일사량',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.inclinedSolar,
                  toKey: 'inclined_solar',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_FARM_KEY.horizontalSolar,
                  toKey: 'pv_under_solar',
                  toFixed: 4,
                  mixColor: '#fab005',
                },
                {
                  fromKey: BASE_FARM_KEY.pvUnderlyingSolar,
                  toKey: 'pv_under_solar',
                  toFixed: 4,
                  mixColor: '#4c6ef5',
                },
              ],
              yTitle: '일사량',
              dataUnit: ' W/m²',
            },
          ],
        },
        {
          domId: 'luxChart',
          title: '조도 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.lux,
                  toKey: 'lux',
                  toFixed: 4,
                },
              ],
              yTitle: '조도',
              dataUnit: ' lx',
            },
          ],
        },
        {
          domId: 'waterValueChart',
          title: '토양 EC 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.soilWaterValue,
                  toKey: 'soil_ec',
                  toFixed: 4,
                },
              ],
              yTitle: '토양 EC',
              dataUnit: ' %',
            },
          ],
        },
        {
          domId: 'temperatureChart',
          title: '온도 정보',
          subtitle: '토양 온도, 외기 온도',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.soilTemperature,
                  toKey: 'soil_temp',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_FARM_KEY.outsideAirTemperature,
                  toKey: 'oa_temp',
                  toFixed: 4,
                  mixColor: '#5c940d',
                },
              ],
              yTitle: '온도',
              dataUnit: ' ℃',
            },
          ],
        },
        {
          domId: 'rehChart',
          title: '습도 정보',
          subtitle: '토양 습도, 외기 습도',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.soilReh,
                  toKey: 'soil_reh',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_FARM_KEY.outsideAirReh,
                  toKey: 'oa_reh',
                  toFixed: 4,
                  mixColor: '#d9480f',
                },
              ],
              yTitle: '습도',
              dataUnit: ' %',
            },
          ],
        },
        {
          domId: 'windSpeedChart',
          title: '풍속 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.windSpeed,
                  toKey: 'oa_ws',
                  toFixed: 4,
                },
              ],
              yTitle: '풍속',
              dataUnit: ' m/s',
            },
          ],
        },
        {
          domId: 'co2Chart',
          title: '이산화탄소 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.co2,
                  toFixed: 4,
                },
              ],
              yTitle: 'co2',
              dataUnit: ' ppm',
            },
          ],
        },
        {
          domId: 'r1Chart',
          title: '시간당 강우량 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.r1,
                  toKey: 'oa_r1',
                  toFixed: 4,
                },
              ],
              yTitle: '강우량',
              dataUnit: ' mm/h',
            },
          ],
        },
        {
          domId: 'isRainChart',
          title: '강우 감지 여부 정보',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_FARM_KEY.isRain,
                  toKey: 'oa_is_rain',
                  toFixed: 4,
                },
              ],
              yTitle: '강우 감지 여부',
            },
          ],
        },
      ],
    };
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
}

module.exports = FarmParallelDP;
