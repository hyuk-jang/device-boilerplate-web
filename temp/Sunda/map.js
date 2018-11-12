/**
 * @type {mDeviceMap}
 */
const map = {
  drawInfo: {
    frame: {
      mapSize: { width: 2000, height: 2000 },
      svgModelResourceList: [
        {
          id: 'invisiblePlace',
          type: 'rect',
          elementDrawInfo: { width: 80, height: 45, opacity: 0.3, color: '#3e4379' },
        },
        {
          id: 'sensor_A',
          type: 'rect',
          elementDrawInfo: { width: 87, height: 40, radius: 5, color: '#f0f0f0' },
        },
        {
          id: 'sensor_B',
          type: 'rect',
          elementDrawInfo: { width: 140, height: 43, radius: 5, color: '#f0f0f0' },
        },
      ],
    },
    positionInfo: {
      svgPlaceList: [
        {
          placeId: 'dataPlace',
          defList: [
            {
              id: 'CGT_P_1',
              name: '집광기입구온도장소_1',
              resourceId: 'invisiblePlace',
              point: [430, 1290],
            },
            {
              id: 'COT_P_1',
              name: '집광기출구온도장소_1',
              resourceId: 'invisiblePlace',
              point: [995, 605],
            },
            {
              id: 'HMST_P_1',
              name: '열매체공급온도장소_1',
              resourceId: 'invisiblePlace',
              point: [1338, 770],
            },
            {
              id: 'SAP_P_1',
              name: '태양열누적생산장소_1',
              resourceId: 'invisiblePlace',
              point: [1700, 465],
            },
            {
              id: 'TAPP_P_1',
              name: '터빈누적생산전력장소_1',
              resourceId: 'invisiblePlace',
              point: [1700, 523],
            },
            {
              id: 'STP_P_1',
              name: '스팀터빈발전량장소_1',
              resourceId: 'invisiblePlace',
              point: [1645, 810],
            },
          ],
        },
      ],
      svgNodeList: [
        {
          nodeDefId: 'condensingGateTemperature',
          is_sensor: 1,
          defList: [
            {
              id: 'CGT_001',
              name: '집광기 입구온도_001',
              placeId: 'CGT_P_1',
              resourceId: 'sensor_A',
              point: [426.5, 1292.5],
            },
          ],
        },
        {
          nodeDefId: 'condensingOutletTemperature',
          is_sensor: 1,
          defList: [
            {
              id: 'COT_001',
              name: '집광기 출구온도_001',
              placeId: 'COT_P_1',
              resourceId: 'sensor_A',
              point: [991.5, 607.5],
            },
          ],
        },
        {
          nodeDefId: 'heatMediumSupplyTemperature',
          is_sensor: 1,
          defList: [
            {
              id: 'HMST_001',
              name: '열매체 공급온도_001',
              placeId: 'HMST_P_1',
              resourceId: 'sensor_A',
              point: [1334.5, 772.5],
            },
          ],
        },
        {
          nodeDefId: 'solarAccProduction',
          is_sensor: 1,
          defList: [
            {
              id: 'SAP_001',
              name: '태양열 누적 생산_001',
              placeId: 'SAP_P_1',
              resourceId: 'sensor_B',
              point: [1670, 466],
            },
          ],
        },
        {
          nodeDefId: 'turbinAccProductionPower',
          is_sensor: 1,
          defList: [
            {
              id: 'TAPP_001',
              name: '터빈 누적 생산 전력_001',
              placeId: 'TAPP_P_1',
              resourceId: 'sensor_B',
              point: [1670, 524],
            },
          ],
        },
        {
          nodeDefId: 'steamTurbinePower',
          is_sensor: 1,
          defList: [
            {
              id: 'STP_001',
              name: '스팀 터빈 발전량_001',
              placeId: 'STP_P_1',
              resourceId: 'sensor_A',
              point: [1641.5, 812.5],
            },
          ],
        },
      ],
    },
  },
  setInfo: {
    mainInfo: { main_seq: 1, uuid: 'aaaaa' },
    dccConstructorList: [],
    dpcConstructorList: [],
    dataLoggerStructureList: [],
    nodeStructureList: [
      {
        target_id: 'temp',
        target_name: '온도',
        is_sensor: 1,
        data_unit: '℃',
        description: '섭씨',
        defList: [
          {
            target_id: 'condensingGateTemperature',
            target_prefix: 'CGT',
            target_name: '집광기 입구온도',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
          {
            target_id: 'condensingOutletTemperature',
            target_prefix: 'COT',
            target_name: '집광기 출구온도',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
          {
            target_id: 'heatMediumSupplyTemperature',
            target_prefix: 'HMST',
            target_name: '열매체 공급온도',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
          {
            target_id: 'solarAccProduction',
            target_prefix: 'SAP',
            target_name: '태양열 누적 생산',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
          {
            target_id: 'turbinAccProductionPower',
            target_prefix: 'TAPP',
            target_name: '터빈 누적 생산 전력',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
          {
            target_id: 'steamTurbinePower',
            target_prefix: 'STP',
            target_name: '스팀 터빈 발전량',
            description: null,
            nodeList: [
              { target_code: '001', data_logger_index: 0, axisScale: [0, 0], moveScale: [0, 0] },
            ],
          },
        ],
      },
    ],
  },
  realtionInfo: {
    placeRelationList: [
      {
        target_id: 'dataPlace',
        target_name: '데이터장소',
        description: null,
        defList: [
          {
            target_id: 'condensingGateTempPlace',
            target_prefix: 'CGT_P',
            target_name: '집광기 입구온도',
            placeList: [{ target_code: '1', nodeList: ['CGT_001'] }],
          },
          {
            target_id: 'condensingOutletTempPlace',
            target_prefix: 'COT_P',
            target_name: '집광기 출구온도',
            placeList: [{ target_code: '1', nodeList: ['COT_001'] }],
          },
          {
            target_id: 'heatMediumSupplyTempPlace',
            target_prefix: 'HMST_P',
            target_name: '열매체 공급온도',
            placeList: [{ target_code: '1', nodeList: ['HMST_001'] }],
          },
          {
            target_id: 'solarAccProductionPlace',
            target_prefix: 'SAP_P',
            target_name: '태양열 누적 생산',
            placeList: [{ target_code: '1', nodeList: ['SAP_001'] }],
          },
          {
            target_id: 'turbinAccProductionPowerPlace',
            target_prefix: 'TAPP_P',
            target_name: '터빈 누적 생산 전력',
            placeList: [{ target_code: '1', nodeList: ['TAPP_001'] }],
          },
          {
            target_id: 'steamTurbinePowerPlace',
            target_prefix: 'STP_P',
            target_name: '스팀 터빈 발전량',
            placeList: [{ target_code: '1', nodeList: ['STP_001'] }],
          },
        ],
      },
    ],
    svgResourceConnectionList: [
      {
        targetIdList: ['CGT_P_1', 'COT_P_1', 'HMST_P_1', 'SAP_P_1', 'TAPP_P_1', 'STP_P_1'],
        resourceIdList: ['invisiblePlace'],
      },
      { targetIdList: ['CGT_001', 'COT_001', 'HMST_001', 'STP_001'], resourceIdList: ['sensor_A'] },
      { targetIdList: ['SAP_001', 'TAPP_001'], resourceIdList: ['sensor_B'] },
    ],
    nameExclusionList: ['dataPlace'],
  },
  controlInfo: {},
};

module.exports = map;
