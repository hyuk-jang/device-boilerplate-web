/**
 * @typedef {Object} blockTableInfo DB Table 정보
 * @property {string} blockTableName 데이터를 가져올 DB Table Name
 * @property {baseTableInfo} baseTableInfo
 * @property {blockDomConfig[]} blockChartList
 */

/**
 * @typedef {Object} baseTableInfo DB Table 간 이전 Table 컬럼명을 반영할 Table 컬럼 명으로 변환
 * @property {string} tableName 참조할 Table 명
 * @property {string} idKey Table Row 당 ID로 사용할 컬럼 명
 * @property {string} placeKey Table Row와 연결되어 있는 place seq 컬럼 명
 * @property {string[]=} placeClassKeyList dv_class를 참조할 경우 filtering 할 place_class target_id List
 * @property {fromToKeyTableInfo[]} fromToKeyTableList tableName에 지정한 table에서 추출할 Param 값 목록
 */

/**
 * @typedef {Object} fromToKeyTableInfo DB Table 간 이전 Table 컬럼명을 반영할 Table 컬럼 명으로 변환
 * @property {string} fromKey 이전 DB Column Key
 * @property {string} toKey 이후 DB Column Key
 */

/**
 * @typedef {Object} blockDomConfig 센서 트렌드 페이지를 생성하기 위한 차트별 설정 정보
 * @property {string} domId Dom Element ID
 * @property {string} title 차트 메인 제목
 * @property {string} subtitle 차트 서브 제목
 * @property {Object[]} chartOptionList 생성할 차트 내용 목록 index 0: 왼쪽, index 1: 오른쪽
 * @property {blockConfig[]} chartOptionList.blockConfigList
 * @property {string} chartOptionList.yTitle Y축 제목
 * @property {string} chartOptionList.dataUnit 마우스 오버시 나타날 단위
 */

/**
 * @typedef {Object} blockConfig 라인 차트 정보
 * @property {string} fromKey Node Def Id. Node의 원천 정보를 알기 위함
 * @property {string} toKey table Column
 * @property {string=} convertKey default: toKey
 * @property {string=} convertName default: Place Relation Node Def Name
 * @property {number=} calculate 데이터 곱셈 배율. default: 1
 * @property {number=} toFixed 가공을 통해 나온 값의 소수점 처리 자리 수. default: 1
 * @property {string=} calcType 데이터 가공 값, 기본 AVG
 * @property {string=} mixColor 원 색에 조합할 색상
 * @example
 * calcType AVG 평균 = 합산 평균 default
 * calcType SUB 평균 = 구간 Max - Min
 * calcType AMO 시간당 단위 량 = 해당 구간에 얻은 량(시간 대비 환산)
 */

/**
 * @typedef {Object} trendSensorDomConfig 센서 트렌드 페이지를 생성하기 위한 차트별 설정 정보
 * @property {string} domId Dom Element ID
 * @property {string} title 차트 메인 제목
 * @property {string} subtitle 차트 서브 제목
 * @property {Object[]} chartOptionList 생성할 차트 내용 목록
 * @property {string[]} chartOptionList.keys ND ID List
 * @property {string[]} chartOptionList.mixColors ND ID List에 대응하는 index Line Color에 Mixing 할 색상
 * @property {string} chartOptionList.yTitle Y축 제목
 * @property {string} chartOptionList.dataUnit 마우스 오버시 나타날 단위
 */

/**
 * @typedef {Object} trendInverterDomConfig 인버터 트렌드 페이지를 생성하기 위한 차트별 설정 정보
 * @property {string} domId Dom Element ID
 * @property {string} title 차트 메인 제목
 * @property {Object[]} yAxisList
 * @property {string} yAxisList.dataUnit
 * @property {string} yAxisList.yTitle
 * @property {string} dataKey 가져올 데이터 Key
 * @property {number=} scale 배율
 * @property {number=} toFixed 소수점 자리수
 */

/**
 * Block 단위로 만들 EWS
 * @typedef {Object} blockViewMakeOption 장소 단위로 만들 엑셀
 * @property {string} mainTitle dataName을 묶는 이름. Table.TH 1행 이름. 동일 숫자만큼 셀 병합 처리
 * @property {string} dataKey 가져올 데이터 Key
 * @property {string} dataName 데이터 Key 이름
 * @property {string=} dataUnit 데이터 단위
 * @property {number=} scale 배율
 * @property {number=} toFixed 소수점 자리수
 */

module;
