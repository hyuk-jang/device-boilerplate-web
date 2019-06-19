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
