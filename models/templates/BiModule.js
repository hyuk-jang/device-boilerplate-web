const _ = require('lodash');
const moment = require('moment');
const { BM } = require('base-model-jh');
const { BU } = require('base-util-jh');

/**
 * @typedef {Object[]} weatherRowDataPacketList
 * @property {string} view_date 차트에 표현할 Date Format
 * @property {string} group_date 그룹 처리한 Date Format
 * @property {number} avg_sky 평균 운량
 */

class BiModule extends BM {
  /** @param {dbInfo} dbInfo */
  constructor(dbInfo) {
    super(dbInfo);

    this.dbInfo = dbInfo;
  }

  /**
   * DB Table 정보 조회
   * @param {string} dbName DB
   * @param {string} tableName TABLE
   * @param {string=} schema 조회 타입 (tables, columns, ...)
   */
  getTableSchema(dbName, tableName, schema = 'columns') {
    const sql = `
      SELECT * FROM information_schema.${schema} 
      WHERE table_schema = '${dbName}' 
      AND table_name = '${tableName}'
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 접속반 기준 Module 최신 데이터 가져옴
   *
   * @param {number|Array} photovoltaic_seq Format => Number or Array or undefinded
   * @return {Promise} 최신 데이터 리스트
   */
  async getModuleStatus(photovoltaic_seq) {
    let returnValue = [];
    if (_.isNumber(photovoltaic_seq) || _.isArray(photovoltaic_seq)) {
      returnValue = await this.getTable('v_module_status', { photovoltaic_seq }, false);
      return returnValue;
    }
    returnValue = await this.getTable('v_module_status');
    return returnValue;

    // let sql = `
    //   SELECT
    //     pv.*,
    //     ru.connector_ch,
    //   curr_data.*
    //     FROM
    //     photovoltaic pv
    //     JOIN relation_power ru
    //       ON ru.photovoltaic_seq = pv.photovoltaic_seq
    //     LEFT JOIN v_dv_place vdp
    //       ON vdp.place_seq = ru.place_seq
    //     LEFT OUTER JOIN
    //     (
    //     SELECT
    //         md.photovoltaic_seq,
    //       ROUND(md.amp / 10, 1) AS amp,
    //       ROUND(md.vol / 10, 1) AS vol,
    //       md.writedate
    //   FROM module_data md
    //   INNER JOIN
    //     (
    //       SELECT MAX(module_data_seq) AS module_data_seq
    //       FROM module_data
    //       GROUP BY photovoltaic_seq
    //     ) b
    //   ON md.module_data_seq = b.module_data_seq
    //     ) curr_data
    //       ON curr_data.photovoltaic_seq = pv.photovoltaic_seq
    // `;
    // if (Number.isInteger(photovoltatic_seq)) {
    //   sql += `WHERE pv.photovoltaic_seq = (${photovoltatic_seq})`;
    // } else if (Array.isArray(photovoltatic_seq)) {
    //   sql += `WHERE pv.photovoltaic_seq IN (${photovoltatic_seq})`;
    // }
    // sql += 'ORDER BY pv.target_id';

    // return this.db.single(sql, '', false);
  }

  /**
   * 접속반 메뉴 에서 쓸 데이터
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} moduleSeqList null, String, Array
   * @return {Promise} SQL 실행 결과
   */
  getConnectorPower(searchRange, moduleSeqList) {
    searchRange = searchRange || this.createSearchRange();
    const dateFormat = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    const sql = `
      SELECT
        md.photovoltaic_seq,
        ROUND(AVG(amp / 10), 1) AS amp,
        ROUND(AVG(vol / 10), 1) AS vol,
        ROUND(AVG(amp) * AVG(vol) / 100, 1) AS wh,
        DATE_FORMAT(writedate,'%H') AS hour_time,
        ${dateFormat.selectViewDate},
        pv.chart_color,
        pv.chart_sort_rank
        FROM module_data md
        LEFT OUTER JOIN photovoltaic pv
        ON pv.photovoltaic_seq = md.photovoltaic_seq        
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${moduleSeqList.length ? ` AND md.photovoltaic_seq IN (${moduleSeqList})` : ''}
          GROUP BY ${dateFormat.firstGroupByFormat}, md.photovoltaic_seq
          ORDER BY md.photovoltaic_seq, writedate
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 검색 종류와 검색 기간에 따라 계산 후 검색 조건 객체 반환
   * @param {searchRangeConfig} searchRangeConfig
   * @return {searchRange} 검색 범위
   */
  createSearchRange(searchRangeConfig = {}) {
    const BASE_SEARCH_TYPE = 'days';
    const BASE_SEARCH_INTERVAL = 'hour';
    // BU.CLI(searchRangeConfig);

    const {
      searchOption = 'merge',
      strStartDate = moment().format('YYYY-MM-DD'),
      strEndDate = '',
    } = searchRangeConfig;

    let {
      searchType = BASE_SEARCH_TYPE,
      searchInterval = BASE_SEARCH_INTERVAL,
    } = searchRangeConfig;
    // commonUtil.applyHasNumbericReqToNumber(req)를 사용할 경우 2018 년도 경우 숫자형으로 반환되버리므로 string 형으로 변환

    const allowSearchTypes = ['days', 'months', 'years', 'range'];

    // 지정한 조회 조건에서 벗어날 경우 기본값 지정
    if (!allowSearchTypes.includes(searchType)) {
      searchType = BASE_SEARCH_TYPE;
    }

    const allowIntervalDays = ['min', 'min10', 'hour', 'day'];
    const allowIntervalMonths = ['min', 'min10', 'hour', 'day', 'month'];
    const allowIntervalYears = ['hour', 'day', 'month'];

    const allowList = [
      ['days', allowIntervalDays],
      ['months', allowIntervalMonths],
      ['years', allowIntervalYears],
    ];
    // 허용하는 조회 조건에서 허용하는 조회간격을 벗어날 경우 기본 값 지정
    allowList.forEach(allows => {
      if (allows[0] === searchType && !allows[1].includes(searchInterval)) {
        searchInterval = BASE_SEARCH_TYPE;
      }
    });

    // 종료 날짜를 설정하기 위한 단위. 기본으로 1일을 더함
    let addUnit = 'days';
    let initDateInfo = { hour: 0, minute: 0, second: 0 };
    const convertDateFormat = 'YYYY-MM-DD 00:00:00';
    // Web 상에 나타낼 Date Format
    let baseViewDateFormat = 'YYYY-MM-DD';
    let korViewDateFormat = 'YYYY년 MM월 DD일';

    // 검색 기간에 따른 Data Format 변환
    // 1. 검색 타입에 따라 월,년,시,분,초를 초기화 함
    // 2. endDate가 명시되지 않을 경우 검색 타입을 포함하는 시간을 더하기 위해 addUnit을 정의
    // 3. 사용자에게 보여질 시간 형태(en, kr)를 정의
    switch (searchType) {
      case 'days':
        addUnit = 'days';
        baseViewDateFormat = 'YYYY-MM-DD';
        korViewDateFormat = 'YYYY년 MM월 DD일';
        break;
      case 'months':
        initDateInfo = { date: 1, hour: 0, minute: 0, second: 0 };
        addUnit = 'months';
        baseViewDateFormat = 'YYYY-MM';
        korViewDateFormat = 'YYYY년 MM월';
        break;
      case 'years':
        initDateInfo = { month: 0, date: 1, hour: 0, minute: 0, second: 0 };
        addUnit = 'years';
        baseViewDateFormat = 'YYYY';
        korViewDateFormat = 'YYYY년';
        break;
      case 'range':
        addUnit = 'days';
        baseViewDateFormat = 'YYYY-MM-DD';
        korViewDateFormat = 'YYYY년 MM월 DD일';
        break;
      default:
        addUnit = 'days';
        baseViewDateFormat = 'YYYY-MM-DD';
        korViewDateFormat = 'YYYY년 MM월 DD일';
        break;
    }
    // 날짜 형식 Format 지정
    const mStartDate = moment(strStartDate, baseViewDateFormat).set(initDateInfo);

    let mEndDate;
    let realSearchType = '';
    // 기간 검색이라면 실제 구간 사이를 계산하여 정의
    if (searchType === 'range') {
      realSearchType = this.convertSearchTypeWithCompareDate(strEndDate, strStartDate);
      mEndDate = moment(strEndDate, baseViewDateFormat);

      const rangeDiffDay = mEndDate.diff(mStartDate, 'days');
      // BU.CLI(rangeDiffDay);

      // 기간 검색이 100일을 초과할 경우 10분 단위로 변경
      if (rangeDiffDay > 100 && searchInterval === 'min') {
        searchInterval = 'min10';
      }

      // 기간 검색이 300일을 초과할 경우 1시간 단위로 변경
      if (
        rangeDiffDay > 300 &&
        (searchInterval === 'min' || searchInterval === 'min10')
      ) {
        searchInterval = 'hour';
      }
      // BU.CLI(searchInterval);
    } else {
      // 기본 종료 기간은 검색일을 기준으로 함
      realSearchType = searchType;
      mEndDate = mStartDate;
    }

    // BU.CLI(mEndDate.format('YYYY-MM-DD 00:00:00'));

    // 시작 날짜를 검색 기간에 따라서 변환.
    // example --> searchType: months, mStartDate: 2018-11-13 --> 2018-11
    // mStartDate = moment(mStartDate.format(baseViewDateFormat));

    // 검색 시간이 금일을 기준으로 얼마나 경과했는지 체크. 0이면 당일. textFormat에 따라서 시분초가 0으로 초기화되므로 현재 시간 설정
    const diffDay = moment().diff(mEndDate, 'days');
    // 검색 인터벌이 1시간 이내이고 금일 발전량 및 일사량 등 양을 환산할 경우 완전한 기간이 아니면 마지막 검색 구간에 오차가 생기기 때문에 변환
    let todayStrEndDateFormat = 'YYYY-MM-DD HH:00:00';
    // 검색 종료일이 오늘 일 경우
    if (_.includes(['min', 'min10', 'hour'], searchInterval) && diffDay === 0) {
      mEndDate = moment();

      switch (searchInterval) {
        case 'min':
          todayStrEndDateFormat = 'YYYY-MM-DD HH:mm:00';
          diffDay === 0 &&
            mEndDate.set({ minute: _.subtract(mEndDate.get('minute'), 1) });
          break;
        case 'min10':
          todayStrEndDateFormat = 'YYYY-MM-DD HH:mm:00';
          diffDay === 0 && mEndDate.set({ minute: _.floor(mEndDate.get('minute'), -1) });
          break;
        case 'hour':
          todayStrEndDateFormat = 'YYYY-MM-DD HH:00:00';
          break;
        default:
          break;
      }
    }

    /** @type {searchRange} */
    const searchRangeInfo = {
      realSearchType,
      searchType,
      searchInterval,
      searchOption,
      resultGroupType: null, // 최종으로 묶는 타입
      strStartDate: null, // sql writedate range 사용
      strEndDate: null, // sql writedate range 사용
      rangeStart: '', // Chart 위에 표시될 시작 날짜
      rangeEnd: '', // Chart 위에 표시될 종료 날짜
      strStartDateInputValue: '', // input에 표시될 시작 날짜
      strEndDateInputValue: '', // input에 표시될 종료 날짜
      strBetweenStart: '', // 구간 날짜 산출을 위한 str Date
      strBetweenEnd: '',
    };

    // 조회기간이 기간 선택일 경우
    if (searchType === 'range') {
      searchRangeInfo.rangeEnd = mEndDate.format(korViewDateFormat);
      searchRangeInfo.strEndDateInputValue = mEndDate.format(baseViewDateFormat);
    }

    // BU.CLIS(mEndDate, addUnit);
    // 기간을 검색하기 위해 endDate 증가
    const mAddEndDate = _.cloneDeep(mEndDate).add(1, addUnit);

    // 사용자 화면에 보여주기 위한 날짜
    searchRangeInfo.rangeStart = mStartDate.format(korViewDateFormat);
    searchRangeInfo.strStartDateInputValue = mStartDate.format(baseViewDateFormat);

    // SQL 문에 사용될 str Date
    searchRangeInfo.strStartDate = mStartDate.format(convertDateFormat);
    searchRangeInfo.strEndDate =
      _.includes(['min', 'min10', 'hour'], searchInterval) && diffDay === 0
        ? mEndDate.format(todayStrEndDateFormat)
        : mAddEndDate.format(convertDateFormat);

    // 구간 날짜 산출을 위한 str Date
    searchRangeInfo.strBetweenStart = mStartDate.format(convertDateFormat);
    searchRangeInfo.strBetweenEnd = mAddEndDate.format(convertDateFormat);

    // BU.CLI(searchRangeInfo);
    return searchRangeInfo;
  }

  /**
   * 장치 타입 종류 가져옴
   * @param {number[]} inverterSeqList 장치 타입
   */
  async getInverterList(inverterSeqList) {
    const returnValue = [];
    // deviceType = deviceType || 'all';
    // if (deviceType === 'all' || deviceType === 'inverter') {
    /** @type {PW_INVERTER[]} */
    let inverterList = await this.getTable('pw_inverter', {
      inverter_seq: inverterSeqList,
    });
    inverterList = _.sortBy(inverterList, 'chart_sort_rank');
    _.forEach(inverterList, info => {
      returnValue.push({
        type: 'inverter',
        seq: info.inverter_seq,
        target_name: info.target_name,
      });
    });
    // }
    // 인버터 이름순으로 정렬
    // returnValue = _.sortBy(returnValue, 'target_name');

    // if (deviceType === 'all' || deviceType === 'connector') {
    //   let connectorList = await this.getTable('connector');
    //   connectorList = _.sortBy(connectorList, 'chart_sort_rank');
    //   _.forEach(connectorList, info => {
    //     returnValue.push({
    //       type: 'connector',
    //       seq: info.connector_seq,
    //       target_name: info.target_name,
    //     });
    //   });
    // }
    // 모든 셀렉트 박스 정리 끝낸 후 최상단에 보일 셀렉트 박스 정의
    returnValue.unshift({
      type: 'all',
      seq: 'all',
      target_name: '전체',
    });
    return returnValue;
  }

  /**
   * 종료일과 시작일 사이의 간격을 기준으로 조회 Interval Text 구함
   * @param {String} strEndDate
   * @param {String} strStartDate
   * @return {String} searchType
   */
  convertSearchTypeWithCompareDate(strEndDate, strStartDate) {
    let searchType = '';
    const gapDate = BU.calcDateInterval(strEndDate, strStartDate);
    const sumValues = Object.values(gapDate).sum();
    if (gapDate.remainDay >= 365) {
      searchType = 'year';
    } else if (gapDate.remainDay > 29) {
      searchType = 'month';
    } else if (gapDate.remainDay > 0 && sumValues > 1) {
      searchType = 'day';
    } else {
      searchType = 'hour';
    }
    return searchType;
  }

  /**
   * strDateType 받아 dateFormat String 변환하여 반환
   * @param {string} strDateType
   * @return {string} dateFormat
   */
  convertDateTypeToDBFormat(strDateType) {
    let dateFormat = '';
    switch (strDateType) {
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'hour':
        dateFormat = '%Y-%m-%d %H';
        break;
      case 'min10':
      case 'min':
        dateFormat = '%Y-%m-%d %H:%i';
        break;
      default:
        dateFormat = '%Y-%m-%d %H';
        break;
    }
    return dateFormat;
  }

  /**
   * 인버터 총 누적 발전량을 구함
   * @param {number[]=} inverterSeqList
   */
  getInverterCumulativePower(inverterSeqList) {
    let sql = `
      SELECT
        inverter_seq,
        ROUND(MAX(power_cp_kwh), 1) AS max_c_kwh
      FROM pw_inverter_data
      `;
    if (typeof inverterSeqList === 'number' || Array.isArray(inverterSeqList)) {
      sql += ` WHERE inverter_seq IN (${inverterSeqList})`;
    }
    sql += `        
    GROUP BY inverter_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 통계치 출력
   * @desc getInverterTrend 간소화 버젼
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} inverterSeqList
   * @return {{inverter_seq: number, interval_power: number, max_c_kwh: number, min_c_kwh: number, target_id: string }[]}
   */
  getInverterStatistics(searchRange = this.createSearchRange(), inverterSeqList) {
    // const dateFormat = this.convertDateTypeToDBFormat(searchRange.searchType);
    const { groupByFormat, selectGroupDate } = this.convertSearchRangeToDBFormat(
      searchRange,
      'writedate',
    );

    const sql = `
        SELECT
              main.*,
              ivt.target_id, ivt.chart_color, ivt.chart_sort_rank
        FROM
          (
          SELECT
                inverter_seq,
                ${selectGroupDate},
                MAX(power_cp_kwh) AS max_c_kwh,
                MIN(power_cp_kwh) AS min_c_kwh,       
                ROUND((MAX(power_cp_kwh) - MIN(power_cp_kwh)), 1) AS interval_power
          FROM pw_inverter_data
          WHERE
            ${inverterSeqList.length ? `inverter_seq IN (${inverterSeqList}) AND ` : ''}
            writedate >= "${searchRange.strStartDate}" 
           AND writedate < "${searchRange.strEndDate}"
          GROUP BY ${groupByFormat}, inverter_seq
          ) AS main
        LEFT OUTER JOIN pw_inverter ivt
         ON ivt.inverter_seq = main.inverter_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 발전량 구해옴
   * @desc getInverterTrend 간소화 버젼
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]=} inverterSeqList
   * @return {{inverter_seq: number, interval_power: number, target_id: string }[]}
   */
  getInverterPower(searchRange = this.createSearchRange(), inverterSeqList) {
    // let dateFormat = this.convertSearchType2DateFormat(searchRange.searchType);
    const dateFormat = this.convertSearchRangeToDBFormat(searchRange, 'writedate');
    // BU.CLI(dateFormat);
    const sql = `
    SELECT
          main.*,
          ivt.target_id, ivt.chart_color, ivt.chart_sort_rank
    FROM
      (
      SELECT
            inverter_seq,
            writedate, 
            ${dateFormat.selectViewDate},
            ${dateFormat.selectGroupDate},
            ROUND(AVG(power_kw), 5)  AS avg_grid_kw,
            MAX(power_cp_kwh) AS max_c_kwh,
            MIN(power_cp_kwh) AS min_c_kwh,       
            ROUND((MAX(power_cp_kwh) - MIN(power_cp_kwh)), 5) AS interval_power
        FROM pw_inverter_data
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${inverterSeqList.length ? ` AND inverter_seq IN (${inverterSeqList})` : ''}
    GROUP BY ${dateFormat.groupByFormat}, inverter_seq
    ) AS main
    LEFT OUTER JOIN pw_inverter ivt
    ON ivt.inverter_seq = main.inverter_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 인버터 발전량 구해옴
   * @param {searchRange} searchRange  검색 옵션
   * @param {number[]} inverterSeqList
   * @return {{}[]}
   */
  getInverterTrend(searchRange = this.createSearchRange(), inverterSeqList) {
    // BU.CLI(searchRange);
    const {
      selectGroupDate,
      selectViewDate,
      firstGroupByFormat,
      groupByFormat,
    } = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    // BU.CLI(searchRange);
    const sql = `
    SELECT 
          id_group.inverter_seq,
          ${selectViewDate},
          ${selectGroupDate},
          ROUND(AVG(avg_pv_v), 2) AS avg_pv_v,
          ROUND(AVG(avg_pv_a), 2) AS avg_pv_a,
          ROUND(AVG(avg_pv_kw), 2) AS avg_pv_kw,
          ROUND(AVG(avg_grid_rs_v), 2) AS avg_grid_rs_v,
          ROUND(AVG(avg_grid_st_v), 2) AS avg_grid_st_v,
          ROUND(AVG(avg_grid_tr_v), 2) AS avg_grid_tr_v,
          ROUND(AVG(avg_grid_r_a), 2) AS avg_grid_r_a,
          ROUND(AVG(avg_grid_s_a), 2) AS avg_grid_s_a,
          ROUND(AVG(avg_grid_t_a), 2) AS avg_grid_t_a,
          ROUND(AVG(avg_line_f), 2) AS avg_line_f,
          ROUND(AVG(avg_power_kw) / AVG(avg_pv_kw), 3) AS avg_p_f,
          ROUND(AVG(avg_power_kw), 2) AS avg_power_kw,
          ROUND(MIN(min_c_kwh), 3) AS min_c_kwh,
          ROUND(MAX(max_c_kwh), 3) AS max_c_kwh,
          ROUND(MAX(max_c_kwh) - MIN(min_c_kwh), 3) AS interval_power,
          ivt.chart_color, ivt.chart_sort_rank,
          SUM(first_count) as total_count
    FROM
      (SELECT 
              id.inverter_seq,
              writedate,
              DATE_FORMAT(writedate,"%H") AS hour_time,
              AVG(pv_v) AS avg_pv_v,
              AVG(pv_a) AS avg_pv_a,
              AVG(pv_kw) AS avg_pv_kw,
              AVG(grid_rs_v) AS avg_grid_rs_v,
              AVG(grid_st_v) AS avg_grid_st_v,
              AVG(grid_tr_v) AS avg_grid_tr_v,
              AVG(grid_r_a) AS avg_grid_r_a,
              AVG(grid_s_a) AS avg_grid_s_a,
              AVG(grid_t_a) AS avg_grid_t_a,
              AVG(line_f) AS avg_line_f,
              AVG(CASE WHEN power_kw > 0 THEN power_kw END) AS avg_power_kw,
              MIN(power_cp_kwh) AS min_c_kwh,
              MAX(power_cp_kwh) AS max_c_kwh,
              COUNT(*) AS first_count
      FROM pw_inverter_data id
      WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
    ${inverterSeqList.length ? ` AND id.inverter_seq IN (${inverterSeqList})` : ''}
      GROUP BY ${firstGroupByFormat}, id.inverter_seq
      ORDER BY id.inverter_seq, writedate
      ) AS id_group
      LEFT OUTER JOIN pw_inverter ivt
      ON ivt.inverter_seq = id_group.inverter_seq
    GROUP BY id_group.inverter_seq, ${groupByFormat}
    `;

    return this.db.single(sql, '', false);
  }

  /**
   * 모듈 Seq List와 SearchRange 객체를 받아 Report 생성 및 반환
   * @param {Array} moduleSeqList [photovoltaic_seq]
   * @param {searchRange} searchRange createSearchRange() Return 객체
   * @return {Object[]} {betweenDatePointObj, gridPowerInfo}
   */
  getConnectorTrend(moduleSeqList, searchRange) {
    // TEST
    // endtDate = new Date('2017-11-16');
    // strEndDate = BU.convertDateToText(endtDate)
    // TEST

    // 기간 검색일 경우 시작일과 종료일의 날짜 차 계산하여 searchType 정의
    if (searchRange.searchType === 'range') {
      searchRange.searchType = this.convertSearchTypeWithCompareDate(
        searchRange.strEndDate,
        searchRange.strStartDate,
      );
    }

    const dateFormat = this.convertSearchRangeToDBFormat(searchRange, 'writedate');

    const sql = `
      SELECT
        md_group.photovoltaic_seq,
        ${dateFormat.selectViewDate},
        ${dateFormat.selectGroupDate},
        ROUND(SUM(avg_amp), 1) AS total_amp,
        ROUND(AVG(avg_vol), 1) AS avg_vol,
        ROUND(SUM(avg_amp) * AVG(avg_vol), 1) AS total_wh,
        pv.chart_color, pv.chart_sort_rank
        FROM
        (
        SELECT
          md.photovoltaic_seq,
          writedate,
          ROUND(AVG(amp / 10), 1) AS avg_amp,
          ROUND(AVG(vol / 10), 1) AS avg_vol,
          DATE_FORMAT(writedate,"%H") AS hour_time
          FROM module_data md
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${moduleSeqList.length ? ` AND photovoltaic_seq IN (${moduleSeqList})` : ''}
        GROUP BY ${dateFormat.firstGroupByFormat}, photovoltaic_seq
        ORDER BY photovoltaic_seq, writedate
      ) md_group
      LEFT OUTER JOIN photovoltaic pv
        ON pv.photovoltaic_seq = md_group.photovoltaic_seq	
      GROUP BY ${dateFormat.groupByFormat}, md_group.photovoltaic_seq
    `;
    return this.db.single(sql, '', false);
  }

  /**
   * 레포트 Date Format 자동 작성
   * @param {searchRange} searchRange
   * @param {string} dateName
   * @return {dateFormatWithSearchRange}
   */
  convertSearchRangeToDBFormat(searchRange, dateName = 'writedate') {
    // BU.CLI(searchRange);

    const { searchType, searchInterval, resultGroupType } = searchRange;

    // BU.CLI(returnValue.selectViewDate);

    let divideTimeNumber = 1;
    let firstGroupByFormat = '';
    let selectGroupDate = '';
    let selectViewDate = '';
    let groupByFormat = '';
    let viewFormat = '';
    // BU.CLI(searchRange);

    // BU.CLI(dateFormat);

    // 검색 간격에 따라서 첫번째 Group Format을 정함
    if (searchInterval === 'min') {
      divideTimeNumber = 60;
      firstGroupByFormat = `DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i")`;
    } else if (searchInterval === 'min10') {
      divideTimeNumber = 6;
      firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    } else if (searchInterval === 'hour') {
      divideTimeNumber = 1;
      firstGroupByFormat = `DATE_FORMAT(${dateName},"%Y-%m-%d %H")`;
    } else {
      firstGroupByFormat = `DATE_FORMAT(${dateName},"%Y-%m-%d")`;
    }

    // 최종 묶는 타입을 지정 안했다면 조회 간격으로 dateFormat 생성
    let dateFormat = '';
    let finalGroupingType = '';
    if (searchRange.resultGroupType == null) {
      finalGroupingType = searchInterval;
      dateFormat = this.convertDateTypeToDBFormat(searchInterval);
    } else {
      finalGroupingType = resultGroupType;
      dateFormat = this.convertDateTypeToDBFormat(resultGroupType);
    }

    // 최종적으로 묶을 데이터 형태를 정의하였다면 정의한 형태로 따라가고 아니라면 검색 간격에 따라감

    if (finalGroupingType === 'min10') {
      selectGroupDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15), "0")  AS group_date`;
      selectViewDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%H:%i"), 4), "0")  AS view_date`;
      // firstGroupByFormat = dateFormat;
      // firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
      groupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    } else {
      selectGroupDate = `DATE_FORMAT(${dateName},"${dateFormat}") AS group_date`;

      viewFormat = dateFormat;
      // let firstGroupFormat = '%Y-%m-%d %H';
      switch (searchInterval) {
        case 'min':
        case 'min10':
          viewFormat = viewFormat.slice(9, 14);
          // firstGroupFormat = '%Y-%m-%d %H:%i';
          break;
        case 'hour':
          viewFormat = viewFormat.slice(9, 11);
          break;
        case 'day':
          viewFormat = viewFormat.slice(6, 8);
          break;
        case 'month':
          viewFormat = viewFormat.slice(3, 5);
          break;
        default:
          break;
      }
      selectViewDate = `DATE_FORMAT(${dateName},"${viewFormat}") AS view_date`;
      groupByFormat = `DATE_FORMAT(${dateName},"${dateFormat}")`;
    }

    const returnValue = {
      groupByFormat,
      firstGroupByFormat,
      selectGroupDate,
      selectViewDate,
      divideTimeNumber,
    };
    // BU.CLI(returnValue)
    return returnValue;
  }

  /**
   * 레포트 Date Format 자동 작성
   * @param {searchRange} searchRange
   * @param {string} dateName
   * @return {dateFormatWithSearchRange}
   */
  makeDateFormatForReport(searchRange, dateName = 'writedate') {
    // BU.CLI(searchRange);
    const returnValue = {
      groupByFormat: '',
      firstGroupByFormat: '',
      selectGroupDate: '',
      selectViewDate: '',
      divideTimeNumber: 1, // 1시간
    };
    // BU.CLI(returnValue.selectViewDate);

    // BU.CLI(searchRange);

    // BU.CLI(dateFormat);

    // 검색 간격에 따라서 첫번째 Group Format을 정함
    if (searchRange.searchInterval === 'min') {
      returnValue.divideTimeNumber = 60;
      returnValue.firstGroupByFormat = `DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i")`;
    } else {
      returnValue.divideTimeNumber = 6;
      returnValue.firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    }

    // 최종 묶는 타입을 지정 안했다면
    let dateFormat = '';
    let finalGroupingType = '';
    if (searchRange.resultGroupType == null) {
      finalGroupingType = searchRange.searchInterval;
      dateFormat = this.convertDateTypeToDBFormat(searchRange.searchInterval);
    } else {
      finalGroupingType = searchRange.resultGroupType;
      dateFormat = this.convertDateTypeToDBFormat(searchRange.resultGroupType);
    }

    // 최종적으로 묶을 데이터 형태를 정의하였다면 정의한 형태로 따라가고 아니라면 검색 간격에 따라감

    if (finalGroupingType === 'min10') {
      returnValue.divideTimeNumber = 6;
      returnValue.selectGroupDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15), "0")  AS group_date`;
      returnValue.selectViewDate = `CONCAT(LEFT(DATE_FORMAT(${dateName},"%H:%i"), 4), "0")  AS view_date`;
      // returnValue.firstGroupByFormat = dateFormat;
      // returnValue.firstGroupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
      returnValue.groupByFormat = `LEFT(DATE_FORMAT(${dateName},"%Y-%m-%d %H:%i"), 15)`;
    } else {
      returnValue.selectGroupDate = `DATE_FORMAT(${dateName},"${dateFormat}") AS group_date`;

      let viewFormat = dateFormat;
      // let firstGroupFormat = '%Y-%m-%d %H';
      switch (searchRange.searchInterval) {
        case 'min':
        case 'min10':
          viewFormat = viewFormat.slice(9, 14);
          // firstGroupFormat = '%Y-%m-%d %H:%i';
          break;
        case 'hour':
          viewFormat = viewFormat.slice(9, 11);
          break;
        case 'day':
          viewFormat = viewFormat.slice(6, 8);
          break;
        case 'month':
          viewFormat = viewFormat.slice(3, 5);
          break;
        default:
          break;
      }
      returnValue.selectViewDate = `DATE_FORMAT(${dateName},"${viewFormat}") AS view_date`;
      // returnValue.firstGroupByFormat = `DATE_FORMAT(${dateName},"${firstGroupFormat}")`;
      returnValue.groupByFormat = `DATE_FORMAT(${dateName},"${dateFormat}")`;
    }
    // BU.CLI(returnValue)
    return returnValue;
  }

  /**
   * 인버터 Report
   * @param {searchRange} searchRange createSearchRange() Return 객체
   * @param {{page: number, pageListCount: number}} pageInfo
   * @param {number=|Array=} inverterSeqList [inverter_seq]
   * @return {{totalCount: number, reportRows: []}} 총 갯수, 검색 결과 목록
   */
  async getInverterReport(searchRange, pageInfo, inverterSeqList) {
    const dateFormat = this.convertSearchRangeToDBFormat(searchRange, 'writedate');
    let { page = 1, pageListCount = 10 } = pageInfo;
    page = Number(page);
    pageListCount = Number(pageListCount);

    const sql = `
    SELECT
        group_date,
        ROUND(AVG(avg_pv_v), 1) AS avg_pv_v,
        ROUND(AVG(avg_pv_a), 1) AS avg_pv_a,
        ROUND(SUM(avg_pv_a), 1) AS sum_avg_pv_a,
        ROUND(AVG(avg_pv_kw), 1) AS avg_pv_kw,
        ROUND(SUM(avg_pv_kw), 1) AS sum_avg_pv_kw,
        ROUND(AVG(avg_grid_rs_v), 1) AS avg_grid_rs_v,
        ROUND(AVG(avg_grid_st_v), 1) AS avg_grid_st_v,
        ROUND(AVG(avg_grid_tr_v), 1) AS avg_grid_tr_v,
        ROUND(AVG(avg_grid_r_a), 1) AS avg_grid_r_a,
        ROUND(SUM(avg_grid_r_a), 1) AS sum_avg_grid_r_a,
        ROUND(AVG(avg_grid_s_a), 1) AS avg_grid_s_a,
        ROUND(SUM(avg_grid_s_a), 1) AS sum_avg_grid_s_a,
        ROUND(AVG(avg_grid_t_a), 1) AS avg_grid_t_a,
        ROUND(SUM(avg_grid_t_a), 1) AS sum_avg_grid_t_a,
        ROUND(AVG(avg_line_f), 1) AS avg_line_f,
        ROUND(AVG(avg_p_f), 1) AS avg_p_f,
        ROUND(AVG(avg_power_kw), 1) AS avg_power_kw,
        ROUND(SUM(avg_power_kw), 1) AS sum_avg_power_kw,
        ROUND(SUM(interval_power), 2) AS interval_power,
        ROUND(SUM(max_c_kwh), 3) AS max_c_kwh
    FROM
      (SELECT
            inverter_seq,
            ${dateFormat.selectViewDate},
            ${dateFormat.selectGroupDate},
            AVG(avg_pv_v) AS avg_pv_v,
            AVG(avg_pv_a) AS avg_pv_a,
            AVG(avg_pv_kw) AS avg_pv_kw,
            AVG(avg_grid_rs_v) AS avg_grid_rs_v,
            AVG(avg_grid_st_v) AS avg_grid_st_v,
            AVG(avg_grid_tr_v) AS avg_grid_tr_v,
            AVG(avg_grid_r_a) AS avg_grid_r_a,
            AVG(avg_grid_s_a) AS avg_grid_s_a,
            AVG(avg_grid_t_a) AS avg_grid_t_a,
            AVG(avg_line_f) AS avg_line_f,
            AVG(avg_p_f) AS avg_p_f,
            AVG(avg_power_kw) AS avg_power_kw,
            MIN(min_c_kwh) AS min_c_kwh,
            MAX(max_c_kwh) AS max_c_kwh,
            MAX(max_c_kwh) - MIN(min_c_kwh) AS interval_power
      FROM
        (SELECT
          id.inverter_seq,
          writedate,
          DATE_FORMAT(writedate,"%H") AS hour_time,
          AVG(pv_v) AS avg_pv_v,
          AVG(pv_a) AS avg_pv_a,
          AVG(pv_kw) AS avg_pv_kw,
          AVG(grid_rs_v) AS avg_grid_rs_v,
          AVG(grid_st_v) AS avg_grid_st_v,
          AVG(grid_tr_v) AS avg_grid_tr_v,
          AVG(grid_r_a) AS avg_grid_r_a,
          AVG(grid_s_a) AS avg_grid_s_a,
          AVG(grid_t_a) AS avg_grid_t_a,
          AVG(line_f) AS avg_line_f,
          AVG(CASE WHEN power_f > 0 THEN power_f END) AS avg_p_f,
          AVG(CASE WHEN power_kw >= 0 THEN power_kw END) AS avg_power_kw,
          MIN(power_cp_kwh) AS min_c_kwh,
          MAX(power_cp_kwh) AS max_c_kwh
        FROM pw_inverter_data id
        WHERE writedate>= "${searchRange.strStartDate}" and writedate<"${
      searchRange.strEndDate
    }"
        ${inverterSeqList.length ? ` AND inverter_seq IN (${inverterSeqList})` : ''}
        GROUP BY ${dateFormat.firstGroupByFormat}, inverter_seq
        ORDER BY inverter_seq, writedate) AS id_group
      GROUP BY inverter_seq, ${dateFormat.groupByFormat}) AS id_report
    GROUP BY group_date
    ORDER BY group_date ASC
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성
    const mainQuery = `${sql}\n LIMIT ${(page - 1) * pageListCount}, ${pageListCount}`;

    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      reportRows: resMainQuery,
    };
  }

  /**
   * 경보 페이지. 인버터 접속반 둘다 가져옴.
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} inverterSeqList 인버터 seq 목록
   * @param {number[]} connectorSeqList 접속반 seq 목록
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReport(errorStatus, searchRange, inverterSeqList, connectorSeqList) {
    let sql = `
      SELECT trouble_list.* 
        FROM
        ( 
          SELECT itd_list.*
          FROM
            (SELECT 
                itd.inverter_seq AS device_seq,
                itd.is_error AS is_error,
                itd.code AS code,
                itd.msg AS msg,
                itd.occur_date AS occur_date,
                itd.fix_date AS fix_date,
                ivt.target_name AS target_name,
                'inverter' AS device_e_name,
                '인버터' AS device_k_name
            FROM
              (SELECT * FROM inverter_trouble_data
                WHERE inverter_seq IN (${inverterSeqList})
                  AND occur_date>= "${searchRange.strStartDate}" 
                  AND occur_date<"${searchRange.strEndDate}"
                `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
              ) AS itd
            JOIN inverter ivt
              ON ivt.inverter_seq = itd.inverter_seq ) AS itd_list
          UNION
          SELECT ctd_list.*
          FROM
            (SELECT 
                ctd.connector_seq AS device_seq,
                ctd.is_error AS is_error,
                ctd.code AS code,
                ctd.msg AS msg,
                ctd.occur_date AS occur_date,
                ctd.fix_date AS fix_date,
                cnt.target_name AS target_name,
                'connector' AS device_e_name,
                '접속반' AS device_k_name
            FROM
              (SELECT * FROM connector_trouble_data
                WHERE connector_seq IN (${connectorSeqList})
                  AND occur_date>= "${searchRange.strStartDate}" 
                  AND occur_date<"${searchRange.strEndDate}"
                `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
              ) AS ctd
            JOIN connector cnt
              ON cnt.connector_seq = ctd.connector_seq 
            ) AS ctd_list
        ) AS trouble_list
        ORDER BY trouble_list.occur_date DESC
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${
      (searchRange.page - 1) * searchRange.pageListCount
    }, ${searchRange.pageListCount}`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 인버터 에러만 가져옴
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} inverterSeqList
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReportForInverter(errorStatus, searchRange, inverterSeqList) {
    let sql = `
        SELECT 
            itd.inverter_seq AS device_seq,
            itd.is_error AS is_error,
            itd.code AS code,
            itd.msg AS msg,
            itd.occur_date AS occur_date,
            itd.fix_date AS fix_date,
            ivt.target_name AS target_name,
            'inverter' AS device_e_name,
            '인버터' AS device_k_name
        FROM
          (SELECT * FROM inverter_trouble_data
            WHERE inverter_seq IN (${inverterSeqList})
              AND occur_date>= "${searchRange.strStartDate}"
              AND occur_date<"${searchRange.strEndDate}"
            `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
            ) AS itd
        JOIN inverter ivt
          ON ivt.inverter_seq = itd.inverter_seq
        ORDER BY itd.occur_date DESC	
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${
      (searchRange.page - 1) * searchRange.pageListCount
    }, ${searchRange.pageListCount}`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 인버터 에러만 가져옴
   * @param {string} errorStatus 오류 상태 (all, deviceError, systemError)
   * @param {searchRange} searchRange
   * @param {number[]} connectorSeqList 접속반 Seq 목록
   * @return {{totalCount: number, report: []}} 총 갯수, 검색 결과 목록
   */
  async getAlarmReportForConnector(errorStatus, searchRange, connectorSeqList) {
    let sql = `
        SELECT 
            ctd.connector_seq AS device_seq,
            ctd.is_error AS is_error,
            ctd.code AS code,
            ctd.msg AS msg,
            ctd.occur_date AS occur_date,
            ctd.fix_date AS fix_date,
            cnt.target_name AS target_name,
            'connector' AS device_e_name,
            '접속반' AS device_k_name
        FROM
            (SELECT * FROM connector_trouble_data
              WHERE connector_seq IN (${connectorSeqList})
                AND occur_date>= "${searchRange.strStartDate}" 
                AND occur_date<"${searchRange.strEndDate}"
              `;
    if (errorStatus === 'deviceError') {
      sql += 'AND is_error = "0"';
    } else if (errorStatus === 'systemError') {
      sql += 'AND is_error = "1"';
    }
    sql += `
            ) AS ctd
        JOIN connector cnt
          ON cnt.connector_seq = ctd.connector_seq 
        ORDER BY ctd.occur_date DESC	
    `;

    // 총 갯수 구하는 Query 생성
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM (${sql}) AS count_tbl`;
    // Report 가져오는 Query 생성

    const mainQuery = `${sql}\n LIMIT ${
      (searchRange.page - 1) * searchRange.pageListCount
    }, ${searchRange.pageListCount}`;
    const resTotalCountQuery = await this.db.single(totalCountQuery, '', false);
    const totalCount = resTotalCountQuery[0].total_count;
    const resMainQuery = await this.db.single(mainQuery, '', false);

    return {
      totalCount,
      report: resMainQuery,
    };
  }

  /**
   * 접속반, Relation, trend를 융합하여 chart data 를 뽑아냄
   * @param {Object} connectorInfo
   * @param {Array} upsasProfile
   * @param {Array} moduleReportList
   */
  processModuleReport(upsasProfile, moduleReportList, searchRange) {
    // BU.CLI('processTrendByConnector', searchRange)
    // 트렌드를 구할 모듈 정보 초기화
    const trendReportList = [];

    // 모듈 기본정보 입력
    _.forEach(moduleReportList.gridPowerInfo, (moduleDataList, moduleSeq) => {
      // BU.CLI(moduleSeq)
      const findProfile = _.find(upsasProfile, {
        photovoltaic_seq: Number(moduleSeq),
      });
      // BU.CLI(findProfile)
      const trendReportObj = {};
      trendReportObj.id = `id_${moduleSeq}`;
      trendReportObj.name = `CH_${findProfile.connector_ch} ${findProfile.pv_target_name}`;
      trendReportObj.group_date = moduleReportList.betweenDatePointObj.fullTxtPoint;
      trendReportObj.data = [];

      moduleReportList.betweenDatePointObj.fullTxtPoint.forEach(strDateFormat => {
        // BU.CLIS(strDateFormat, moduleDataList)
        const findGridObj = _.find(moduleDataList, {
          group_date: strDateFormat,
        });

        // BU.CLI(findGridObj)
        const data = _.isEmpty(findGridObj)
          ? ''
          : this.convertValueBySearchType(searchRange.searchType, findGridObj.total_wh);
        trendReportObj.data.push(data);
      });
      trendReportList.push(trendReportObj);
    });

    // BU.CLI(trendReportList);

    const chartDecorationInfo = this.makeChartDecorator(searchRange);
    // BU.CLI('moudlePowerReport', moudlePowerReport);
    return {
      hasData: !_.isEmpty(moduleReportList.gridPowerInfo),
      columnList: moduleReportList.betweenDatePointObj.shortTxtPoint,
      chartDecorationInfo,
      series: trendReportList,
    };
  }

  /**
   *
   * @param {String} searchType
   * @param {Number} number
   */
  convertValueBySearchType(searchType, number) {
    // BU.CLI('convertValueBySearchType', searchType, number)
    let returnValue = 0;
    switch (searchType) {
      case 'year':
        returnValue = (number / 1000 / 1000).toFixed(4);
        break;
      case 'month':
        returnValue = (number / 1000).toFixed(3);
        break;
      case 'day':
        returnValue = (number / 1000).toFixed(3);
        break;
      case 'hour':
      default:
        returnValue = number;
        break;
    }
    return Number(returnValue);
  }

  makeChartDecorator(searchRange) {
    let mainTitle = '';
    let xAxisTitle = '';
    let yAxisTitle = '';
    switch (searchRange.searchType) {
      case 'year':
        xAxisTitle = '시간(년)';
        yAxisTitle = '발전량(MWh)';
        break;
      case 'month':
        xAxisTitle = '시간(월)';
        yAxisTitle = '발전량(kWh)';
        break;
      case 'day':
        xAxisTitle = '시간(일)';
        yAxisTitle = '발전량(kWh)';
        break;
      case 'hour':
        xAxisTitle = '시간(시)';
        yAxisTitle = '발전량(wh)';
        break;
      default:
        break;
    }

    if (searchRange.rangeEnd !== '') {
      mainTitle = `[ ${searchRange.rangeStart} ~ ${searchRange.rangeEnd} ]`;
    } else {
      mainTitle = `[ ${searchRange.rangeStart} ]`;
    }
    return {
      mainTitle,
      xAxisTitle,
      yAxisTitle,
    };
  }
}
module.exports = BiModule;
