const { BaseModel } = require('../../src/module').dpc;

const { BASE_KEY } = BaseModel.FarmParallel;
const { BASE_KEY: UPSAS_KEY } = BaseModel.UPSAS;
const {
  Inverter: { BASE_KEY: BASE_INV_KEY },
  UPSAS: { BASE_KEY: BASE_UPSAS_KEY },
  Sensor: { BASE_KEY: BASE_SENSOR_KEY },
  Weathercast: { BASE_KEY: BASE_WEATHER_KEY },
} = BaseModel;

const DeviceProtocol = require('./DeviceProtocol');

class UpsasDP extends DeviceProtocol {
  /**
   * @return {string[]} 현 프로젝트에서 사용할 Sensor 목록, ND Id List
   */
  get pickedNodeDefIdList() {
    return [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
    ];
  }

  /**
   * @return {string[]} 내부 센서 ND ID 목록
   */
  get rowsNdIdList() {
    return [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      // BASE_KEY.windDirection,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
      BASE_KEY.isRain,
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
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.lux,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.co2,
    ];
  }

  /**
   * 레포트 - 센서 페이지에서 나타낼 목록
   * @return {{key: string, protocol: string}[]} key: ND ID, protocol: CALC_TYPE
   */
  get senorReportProtocol() {
    const avgPickList = [
      BASE_KEY.pvRearTemperature,
      BASE_KEY.pvUnderlyingSolar,
      BASE_KEY.lux,
      BASE_KEY.co2,
      BASE_KEY.soilWaterValue,
      BASE_KEY.soilTemperature,
      BASE_KEY.soilReh,
      BASE_KEY.outsideAirTemperature,
      BASE_KEY.outsideAirReh,
      BASE_KEY.horizontalSolar,
      BASE_KEY.inclinedSolar,
      BASE_KEY.windSpeed,
      BASE_KEY.r1,
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
            keys: [BASE_KEY.inclinedSolar, BASE_KEY.horizontalSolar, BASE_KEY.pvUnderlyingSolar],
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
            keys: [BASE_KEY.lux],
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
            keys: [BASE_KEY.soilWaterValue],
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
            keys: [BASE_KEY.soilTemperature, BASE_KEY.outsideAirTemperature],
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
            keys: [BASE_KEY.soilReh, BASE_KEY.outsideAirReh],
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
            keys: [BASE_KEY.windSpeed],
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
            keys: [BASE_KEY.co2],
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
            keys: [BASE_KEY.r1],
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
            keys: [BASE_KEY.isRain],
            mixColors: [],
            yTitle: '강우 감지 여부',
            // dataUnit: 'ㅇd',
          },
        ],
      },
    ];
  }

  /**
   * @desc App
   * @return {string[]} 앱 Master로 쓸 센서  ND ID 목록
   */
  get appMasterViewList() {
    return [BASE_KEY.inclinedSolar];
  }

  /**
   * 인버터 레포트 생성 정보
   * @return {blockViewMakeOption[]}
   */
  get reportInverterViewList() {
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

  /**
   * 현황 생성 정보
   * @param {string} blockId
   * @return {blockViewMakeOption[]}
   */
  getBlockStatusTable(blockId) {
    switch (blockId) {
      case 'outline':
        return this.statusOutlineTable;
      case 'connector':
        return this.statusConnectorTable;
      case 'saltern':
        return this.statusSalternTable;
      case 'weatherCast':
        return this.statusWeatherCastTable;
      case 'analysis':
        return this.statusAnalysisTable;
      default:
        break;
    }
  }

  /**
   * 종합 계측 현황
   * @return {blockViewMakeOption[]}
   */
  get statusOutlineTable() {
    return [
      {
        dataKey: 'seb_name',
        mainTitle: '',
        cssWidthPer: 13,
        classList: ['text-center'],
      },
      {
        dataKey: 'manufacturer',
        dataName: '제조사',
        mainTitle: '모듈',
        classList: ['text-center'],
      },
      {
        dataKey: 'power_amount',
        dataName: '용량',
        dataUnit: 'kW',
        mainTitle: '모듈',
      },
      {
        dataKey: 'modulePvAmp',
        dataName: 'DC 전류',
        dataUnit: 'A',
        mainTitle: '모듈',
      },
      {
        dataKey: 'modulePvVol',
        dataName: 'DC 전압',
        dataUnit: 'V',
        mainTitle: '모듈',
      },
      {
        dataKey: 'modulePvKw',
        dataName: 'DC 출력',
        dataUnit: 'kW',
        mainTitle: '모듈',
      },
      {
        dataKey: 'pvKw',
        dataName: 'DC 입력',
        dataUnit: 'kW',
        mainTitle: '인버터',
      },
      {
        dataKey: 'gridKw',
        dataName: 'AC 출력',
        dataUnit: 'kW',
        mainTitle: '인버터',
      },
      {
        dataKey: 'gridEfficiency',
        dataName: '발전 효율',
        dataUnit: '%',
        mainTitle: '인버터',
      },
      {
        dataKey: 'gridPf',
        dataName: '역률',
        dataUnit: '%',
        mainTitle: '인버터',
      },
      {
        dataKey: 'powerCpKwh',
        dataName: '누적 발전량',
        dataUnit: 'MWh',
        mainTitle: '인버터',
        scale: 0.001,
        toFixed: 4,
      },
      {
        dataKey: 'water_level',
        dataName: '수위',
        dataUnit: 'cm',
        mainTitle: '염전 상태 계측',
      },
      {
        dataKey: 'brine_temp',
        dataName: '수온',
        dataUnit: '℃',
        mainTitle: '염전 상태 계측',
      },
      {
        dataKey: 'module_rear_temp',
        dataName: '모듈 온도',
        dataUnit: '℃',
        mainTitle: '염전 상태 계측',
      },
      {
        dataKey: 'salinity',
        dataName: '염도',
        dataUnit: '%',
        mainTitle: '염전 상태 계측',
      },
    ];
  }

  /**
   * 종합 계측 현황
   * @return {blockViewMakeOption[]}
   */
  get statusAnalysisTable() {
    return [
      {
        dataKey: 'install_place',
        mainTitle: '구분',
        cssWidthPer: 15,
      },
      {
        dataKey: 'serial_number',
        mainTitle: '타입',
        cssWidthPer: 10,
      },
      {
        dataKey: 'avg_power_eff',
        mainTitle: '출력',
        dataUnit: 'kW',
        cssWidthPer: 18,
      },
      {
        dataKey: 'avg_module_rear_temp',
        mainTitle: '모듈 온도',
        dataUnit: '℃',
        cssWidthPer: 18,
      },
      {
        dataKey: 'avg_brine_temp',
        mainTitle: '수온',
        dataUnit: '℃',
        cssWidthPer: 13,
      },
      {
        dataKey: 'avg_water_level',
        mainTitle: '수위',
        dataUnit: 'cm',
        cssWidthPer: 13,
      },
      {
        dataKey: 'avg_salinity',
        mainTitle: '염도',
        dataUnit: '%',
        cssWidthPer: 13,
      },
    ];
  }

  /**
   * 접속반 현황 정보
   * @return {blockViewMakeOption[]}
   */
  get statusConnectorTable() {
    return [
      {
        dataKey: 'target_name',
        // dataName: '접속반',
        cssWidthPer: 10,
        mainTitle: '접속반',
        classList: ['text-center'],
      },
      {
        dataKey: 'install_place',
        // dataName: '관련 모듈',
        cssWidthPer: 15,
        mainTitle: '관련 모듈',
        classList: ['text-center'],
      },
      {
        dataKey: 'a_ch_1',
        dataName: '1 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_1',
        dataName: '1 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'a_ch_2',
        dataName: '2 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_2',
        dataName: '2 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'a_ch_3',
        dataName: '3 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_3',
        dataName: '3 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'a_ch_4',
        dataName: '4 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_4',
        dataName: '4 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'a_ch_5',
        dataName: '5 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_5',
        dataName: '5 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'a_ch_6',
        dataName: '6 CH',
        dataUnit: 'A',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'v_ch_6',
        dataName: '6 CH',
        dataUnit: 'V',
        mainTitle: '접속반 채널',
      },
      {
        dataKey: 'sumAmp',
        dataName: '전류 총합',
        dataUnit: 'A',
        mainTitle: '종합',
      },
      {
        dataKey: 'avgVol',
        dataName: '전압 평균',
        dataUnit: 'V',
        mainTitle: '종합',
      },
    ];
  }

  /**
   * 계측 현황 생성 정보
   * @return {blockViewMakeOption[]}
   */
  get statusSalternTable() {
    return [
      {
        dataKey: 'seb_name',
        mainTitle: '장소',
        cssWidthPer: 25,
        classList: ['text-center'],
      },
      {
        dataKey: 'water_level',
        dataUnit: 'cm',
        mainTitle: '수위',
      },
      {
        dataKey: 'salinity',
        dataUnit: '%',
        mainTitle: '염도',
      },
      {
        dataKey: 'module_rear_temp',
        dataUnit: '℃',
        mainTitle: '모듈 후면 온도',
      },
      {
        dataKey: 'brine_temp',
        dataUnit: '℃',
        mainTitle: '모듈 수온',
      },
    ];
  }

  /**
   *  TODO: 기상 환경 정보 테이블
   * @return {blockViewMakeOption[]}
   */
  get statusWeatherCastTable() {
    return [
      {
        dataKey: 'applydate',
        mainTitle: '시각',
      },
      {
        dataKey: 'wf',
        mainTitle: '날씨',
      },
      {
        dataKey: 'pop',
        dataUnit: '%',
        mainTitle: '강수율',
      },
      {
        dataKey: 'temp',
        dataUnit: '℃',
        mainTitle: '기온',
      },
      {
        dataKey: 'wd',
        mainTitle: '풍향',
      },
      {
        dataKey: 'ws',
        dataUnit: 'm/s',
        mainTitle: '풍속',
      },
      {
        dataKey: 'reh',
        dataUnit: '%',
        mainTitle: '습도',
      },
    ];
  }

  /**
   * 차트 생성 정보
   * @param {string} blockId
   * @return {blockTableInfo}
   */
  getBlockChart(blockId) {
    switch (blockId) {
      case 'connector':
        return this.blockConnectorChart;
      case 'inverter':
        return this.blockInverterChart;
      case 'saltern':
        return this.blockSalternChart;
      case 'weatherDevice':
        return this.blockWeatherDeviceChart;
      default:
        break;
    }
  }

  /**
   * 접속반 생성 정보
   * @return {blockTableInfo}
   */
  get blockConnectorChart() {
    return {
      blockTableName: 'pw_connector_data',
      baseTableInfo: {
        tableName: 'pw_connector',
        idKey: 'target_id',
        placeKey: 'place_seq',
        fromToKeyTableList: [
          {
            fromKey: 'connector_seq',
            toKey: 'connector_seq',
          },
        ],
      },
      blockChartList: [
        {
          domId: 'connector_vol_chart',
          title: '전압',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_SENSOR_KEY.volCh1,
                  toKey: 'v_ch_1',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh2,
                  toKey: 'v_ch_2',
                  mixColor: '#087f5b',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh3,
                  toKey: 'v_ch_3',
                  mixColor: '#e67700',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh4,
                  toKey: 'v_ch_4',
                  mixColor: '#212529',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh5,
                  toKey: 'v_ch_5',
                  mixColor: '#862e9c',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh6,
                  toKey: 'v_ch_6',
                  mixColor: '#1864ab',
                  toFixed: 4,
                },
              ],
              // dataUnit: 'V',
              yTitle: '전압 (V)',
            },
          ],
        },
        {
          domId: 'connector_amp_chart',
          title: '전류',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_SENSOR_KEY.ampCh1,
                  toKey: 'a_ch_1',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.ampCh2,
                  toKey: 'a_ch_2',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.ampCh3,
                  toKey: 'a_ch_3',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.ampCh4,
                  toKey: 'a_ch_4',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.ampCh5,
                  toKey: 'a_ch_5',
                  toFixed: 4,
                },
                {
                  fromKey: BASE_SENSOR_KEY.ampCh6,
                  toKey: 'a_ch_6',
                  toFixed: 4,
                },
              ],
              // dataUnit: 'A',
              yTitle: '전류 (A)',
            },
          ],
        },
        {
          domId: 'connector_power_chart',
          title: '전력',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_SENSOR_KEY.volCh1,
                  toKey: 'p_ch_1',
                  convertName: '1CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_1) * AVG(v_ch_1)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_1',
                  },
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh2,
                  toKey: 'p_ch_2',
                  convertName: '2CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_2) * AVG(v_ch_2)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_2',
                  },
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh3,
                  toKey: 'p_ch_3',
                  convertName: '3CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_3) * AVG(v_ch_3)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_3',
                  },
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh4,
                  toKey: 'p_ch_4',
                  convertName: '4CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_4) * AVG(v_ch_4)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_4',
                  },
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh5,
                  toKey: 'p_ch_5',
                  convertName: '5CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_5) * AVG(v_ch_5)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_5',
                  },
                },
                {
                  fromKey: BASE_SENSOR_KEY.volCh6,
                  toKey: 'p_ch_6',
                  convertName: '6CH 전력',
                  expressionInfo: {
                    firstExpression: 'AVG(a_ch_6) * AVG(v_ch_6)',
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_ch_6',
                  },
                },
              ],
              // dataUnit: 'A',
              yTitle: '전력 (kW)',
            },
            {
              blockConfigList: [
                {
                  fromKey: BASE_SENSOR_KEY.volCh6,
                  toKey: 'p_total',
                  mixColor: '#eeeeee',
                  convertName: '총합 전력',
                  expressionInfo: {
                    firstExpression: `(AVG(a_ch_1) + AVG(a_ch_2) + AVG(a_ch_3) + AVG(a_ch_4)+ AVG(a_ch_5) + AVG(a_ch_6))
                     * (AVG(v_ch_1) + AVG(v_ch_2) + AVG(v_ch_3) + AVG(v_ch_4) + AVG(v_ch_5) + AVG(v_ch_6)) / 6`,
                    scale: 0.001,
                    toFixed: 5,
                    columnId: 'p_total',
                  },
                },
              ],
              // dataUnit: 'A',
              yTitle: '전력 (kW)',
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
          domId: 'inverter_power_chart',
          title: 'AC 출력',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_INV_KEY.powerGridKw,
                  toKey: 'power_kw',
                  convertName: '',
                  toFixed: 4,
                },
              ],
              // dataUnit: 'kW',
              yTitle: '전력(kW)',
            },
          ],
        },
        {
          domId: 'inverter_pv_chart',
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
              // dataUnit: 'V',
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
              // dataUnit: 'A',
              yTitle: '전류(A)',
            },
          ],
        },
        {
          domId: 'inverter_grid_chart',
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
              // dataUnit: 'V',
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
              // dataUnit: 'A',
              yTitle: '전류(A)',
            },
          ],
        },
        {
          domId: 'interval_power_chart',
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
                  toFixed: 4,
                },
              ],
              // dataUnit: 'kWh',
              yTitle: '전력(kWh)',
            },
          ],
        },
        {
          domId: 'max_c_mwh_chart',
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
              // dataUnit: 'MWh',
              yTitle: '전력(MWh)',
            },
          ],
        },
      ],
    };
  }

  /**
   * 염전 생성 정보
   * @return {blockTableInfo}
   */
  get blockSalternChart() {
    return {
      blockTableName: 'saltern_sensor_data',
      baseTableInfo: {
        tableName: 'v_dv_place',
        idKey: 'place_real_id',
        placeKey: 'place_seq',
        fromToKeyTableList: [
          {
            fromKey: 'place_seq',
            toKey: 'place_seq',
          },
        ],
      },
      blockChartList: [
        {
          domId: 'water_level_chart',
          title: '수위',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_UPSAS_KEY.waterLevel,
                  toKey: 'water_level',
                },
              ],
              // dataUnit: 'cm',
              yTitle: '수위(cm)',
            },
          ],
        },
        {
          domId: 'salinity_chart',
          title: '염도 현황',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_UPSAS_KEY.salinity,
                  toKey: 'salinity',
                },
              ],
              // dataUnit: '%',
              yTitle: '염도(%)',
            },
          ],
        },
        {
          domId: 'module_rear_temp_chart',
          title: '온도',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: BASE_UPSAS_KEY.moduleRearTemperature,
                  toKey: 'module_rear_temp',
                },
                {
                  fromKey: BASE_UPSAS_KEY.brineTemperature,
                  toKey: 'brine_temp',
                },
              ],
              // dataUnit: '℃',
              yTitle: '온도(℃)',
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
  get blockWeatherDeviceChart() {
    return {
      blockTableName: 'weather_device_data',
      baseTableInfo: {
        tableName: 'main',
        // idKey: 'target_id',
        // placeKey: 'place_seq',
        fromToKeyTableList: [
          {
            fromKey: 'main_seq',
            toKey: 'main_seq',
          },
        ],
      },
      blockChartList: [
        {
          domId: 'weather_device_chart',
          title: '일사량',
          chartOptionList: [
            {
              blockConfigList: [
                {
                  fromKey: 'solar',
                  toKey: 'solar',
                  convertName: '',
                },
              ],
              // dataUnit: 'kW',
              yTitle: '전력(kW)',
            },
          ],
        },
      ],
    };
  }

  /**
   * 레포트 생성 정보
   * @param {string} blockId
   * @return {reportTableInfo}
   */
  getBlockReport(blockId) {
    switch (blockId) {
      case 'inverter':
        return this.blockInverterReport;
      case 'connector':
        return this.blockConnectorChart;
      case 'saltern':
        return this.blockSalternChart;
      default:
        break;
    }
  }

  /**
   *
   * @return {reportTableInfo}
   */
  get blockInverterReport() {
    return {
      dbTableInfo: {
        blockTableName: 'pw_inverter_data',
        baseTableInfo: {
          tableName: 'pw_inverter',
          idKey: 'target_id',
          placeKey: 'place_seq',
          writeDateKey: 'writedate',
          fromToKeyTableList: [
            {
              fromKey: 'inverter_seq',
              toKey: 'inverter_seq',
            },
          ],
        },
        dbTableDynamicSqlConfig: {
          avgColumnList: ['pv_v', 'grid_rs_v', 'line_f'],
          avgSumColumnList: ['pv_a', 'pv_kw', 'grid_r_a', 'power_kw'],
          maxSumColumnList: ['power_cp_kwh'],
          intervalColumnList: ['power_cp_kwh'],
          amountColumnList: ['power_kw'],
          expressionList: [
            {
              columnId: 'avg_power_f',
              firstExpression: 'AVG(power_kw) / AVG(pv_kw)',
              secondExpression: 'AVG(avg_power_f)',
              scale: 100,
              toFixed: 1,
            },
          ],
        },
      },
      domTableColConfigs: [
        {
          mainTitle: '일시',
          dataKey: 'group_date',
          isAddComma: false,
          cssWidthPer: 15,
          classList: ['text-center'],
        },
        {
          mainTitle: '태양광',
          dataKey: 'avg_pv_v',
          dataName: 'DC 전압',
          dataUnit: 'V',
        },
        {
          mainTitle: '태양광',
          dataKey: 'avg_sum_pv_a',
          dataName: 'DC 전류',
          dataUnit: 'A',
        },
        {
          mainTitle: '태양광',
          dataKey: 'avg_sum_pv_kw',
          dataName: 'DC 전력',
          dataUnit: 'kW',
        },
        {
          mainTitle: '인버터',
          dataKey: 'avg_grid_rs_v',
          dataName: 'AC 전압',
          dataUnit: 'V',
        },
        {
          mainTitle: '인버터',
          dataKey: 'avg_sum_grid_r_a',
          dataName: 'AC 전류',
          dataUnit: 'A',
        },
        {
          mainTitle: '인버터',
          dataKey: 'avg_sum_power_kw',
          dataName: 'AC 전력',
          dataUnit: 'kW',
        },
        {
          mainTitle: '인버터',
          dataKey: 'avg_line_f',
          dataName: '주파수',
          dataUnit: 'Hz',
        },
        {
          mainTitle: '인버터',
          dataKey: 'avg_power_f',
          dataName: '효율',
          dataUnit: '%',
        },
        {
          mainTitle: '발전 현황',
          dataKey: 'interval_power_cp_kwh',
          dataName: '발전량',
          dataUnit: 'kWh',
          toFixed: 4,
        },
        {
          mainTitle: '발전 현황',
          dataKey: 'max_sum_power_cp_kwh',
          dataName: '누적 발전량',
          dataUnit: 'MWh',
          scale: 0.001,
          toFixed: 4,
        },
      ],
    };
  }
}

module.exports = UpsasDP;
