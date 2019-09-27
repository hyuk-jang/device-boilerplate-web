"use strict";

var gaugeOptions = {
  chart: {
    type: 'solidgauge',
    backgroundColor: 'none'
  },
  title: null,
  pane: {
    center: ['50%', '85%'],
    size: '135%',
    startAngle: -90,
    endAngle: 90,
    background: {
      backgroundColor: Highcharts.theme && Highcharts.theme.background2 || '#EEE',
      innerRadius: '60%',
      outerRadius: '100%',
      shape: 'arc'
    }
  },
  tooltip: {
    enabled: false
  },
  // the value axis
  yAxis: {
    stops: [[0.1, '#55BF3B'], // green
    [0.5, '#DDDF0D'], // yellow
    [0.9, '#DF5353'] // red
    ],
    lineWidth: 0,
    minorTickInterval: null,
    tickAmount: 2,
    title: {
      y: -70
    },
    labels: {
      y: 16
    }
  },
  credits: {
    enabled: false
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: 10,
        borderWidth: 0,
        useHTML: true
      }
    }
  }
};
var defaultGaugeOptions = {
  chart: {
    type: 'solidgauge'
  },
  title: null,
  pane: {
    center: ['50%', '85%'],
    size: '140%',
    startAngle: -90,
    endAngle: 90,
    background: {
      backgroundColor: Highcharts.theme && Highcharts.theme.background2 || '#EEE',
      innerRadius: '60%',
      outerRadius: '100%',
      shape: 'arc'
    }
  },
  tooltip: {
    enabled: false
  },
  // the value axis
  yAxis: {
    stops: [[0.1, '#55BF3B'], // green
    [0.5, '#DDDF0D'], // yellow
    [0.9, '#DF5353'] // red
    ],
    lineWidth: 0,
    minorTickInterval: null,
    tickAmount: 2,
    title: {
      y: -70
    },
    labels: {
      y: 16
    }
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: 5,
        borderWidth: 0,
        useHTML: true
      }
    }
  },
  credits: {
    enabled: false
  }
};
/**
 * @param {Object} gaugeOption
 * @param {string} gaugeOption.domId
 * @param {Object} gaugeOption.yAxis
 * @param {number=} gaugeOption.yAxis.min
 * @param {number} gaugeOption.yAxis.max
 * @param {string} gaugeOption.yAxis.title
 * @param {Object} gaugeOption.series
 * @param {string} gaugeOption.series.name
 * @param {number[]} gaugeOption.series.data
 * @param {Object} gaugeOption.series.tooltip
 * @param {string} gaugeOption.series.tooltip.valueSuffix
 */

function makeGaugeChart(gaugeOption) {
  var domId = gaugeOption.domId,
      yAxis = gaugeOption.yAxis,
      series = gaugeOption.series;
  Highcharts.chart(domId, Highcharts.merge(gaugeOptions, {
    yAxis: {
      min: yAxis.min,
      max: yAxis.max,
      tickPositioner: function tickPositioner() {
        return [this.min, this.max];
      },
      title: {
        text: yAxis.title
      }
    },
    series: [{
      name: series.name,
      data: [series.data],
      dataLabels: {
        format: "<div style=\"text-align:center\"><span style=\"font-size:25px;color:".concat(Highcharts.theme && Highcharts.theme.contrastTextColor || 'black', "\">{y}</span><br/>\n              <span style=\"font-size:12px;color:silver\">").concat(series.tooltip.valueSuffix, "</span></div>")
      },
      tooltip: {
        valueSuffix: series.tooltip.valueSuffix
      }
    }]
  }));
}
/**
 * @param {Object} gaugeOption
 * @param {string} gaugeOption.domId
 * @param {Object} gaugeOption.yAxis
 * @param {number=} gaugeOption.yAxis.min
 * @param {number} gaugeOption.yAxis.max
 * @param {string} gaugeOption.yAxis.title
 * @param {Object} gaugeOption.series
 * @param {string} gaugeOption.series.name
 * @param {number[]} gaugeOption.series.data
 * @param {Object} gaugeOption.series.tooltip
 * @param {string} gaugeOption.series.tooltip.valueSuffix
 */


function makeSpeedGaugeChart(gaugeOption) {
  var domId = gaugeOption.domId,
      yAxis = gaugeOption.yAxis,
      series = gaugeOption.series;
}
/**
 * @desc hichart gauge 가 안먹힐때 사용함.
 * @param {*} powerGenerationInfo
 * @param {*} domId
 */


function makeGaugeChart2(powerGenerationInfo, domId) {
  // console.dir(powerGenerationInfo);
  var currKw = _.get(powerGenerationInfo, 'out_kw', 30);

  var currKwYaxisMax = _.get(powerGenerationInfo, 'amount', 100);

  var percentageKw = _.round(_.multiply(_.divide(currKw, currKwYaxisMax), 100), 2);

  var maxKw = _.round(_.subtract(100, percentageKw), 2); // let todayMaxKw = _.multiply(currKwYaxisMax, 6);
  // let dailyPower = _.round(_.get(powerGenerationInfo, 'dailyPower'), 2);
  // let percentageDailyPower = _.round(_.multiply(_.divide(dailyPower, todayMaxKw), 100), 2);
  // let remainDailyPower = _.round(_.subtract(100, percentageDailyPower), 2);
  // var powerGenerationInfo = mainData.powerGenerationInfo;


  Highcharts.chart(domId, {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: 0,
      plotShadow: false,
      backgroundColor: 'none' // Edit chart spacing
      // spacingBottom: 15,
      // spacingTop: 10,
      // spacingLeft: -100,
      // spacingRight: 10,

    },
    title: {
      text: "\uBC1C\uC804<br/>".concat(currKw, " kW"),
      align: 'center',
      verticalAlign: 'middle',
      y: -20
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
      enabled: false
    },
    plotOptions: {
      pie: {
        dataLabels: {
          enabled: true,
          distance: -30,
          style: {
            fontWeight: 'bold',
            color: 'white'
          }
        },
        startAngle: -90,
        endAngle: 90,
        center: ['50%', '50%']
      }
    },
    colors: ['#f45b5b', '#8085e9', '#8d4654', '#7798BF', '#aaeeee', '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
    series: [{
      type: 'pie',
      name: 'Browser share',
      innerSize: '50%',
      data: [["".concat(percentageKw, "%"), percentageKw], ['', maxKw]],
      dataLabels: {
        format: "<div style=\"text-align:center\"><span style=\"font-size:15px;color:".concat(Highcharts.theme && Highcharts.theme.contrastTextColor || 'black', "\">{y}</span>\n            <span style=\"font-size:12px;color:silver\">%</span></div>")
      }
    }],
    credits: {
      enabled: false
    }
  }); // Highcharts.chart('chart_div_2', {
  //   chart: {
  //     plotBackgroundColor: null,
  //     plotBorderWidth: 0,
  //     plotShadow: false,
  //     backgroundColor: 'none',
  //     // Edit chart spacing
  //     spacingBottom: 15,
  //     spacingTop: 10,
  //     spacingLeft: -100,
  //     spacingRight: 10,
  //   },
  //   title: {
  //     text: `발전량<br/>${dailyPower} kW`,
  //     align: 'center',
  //     verticalAlign: 'middle',
  //     y: -20
  //   },
  //   tooltip: {
  //     pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>',
  //     enabled: false
  //   },
  //   plotOptions: {
  //     pie: {
  //       dataLabels: {
  //         enabled: true,
  //         distance: -30,
  //         style: {
  //           fontWeight: 'bold',
  //           color: 'white'
  //         }
  //       },
  //       startAngle: -90,
  //       endAngle: 90,
  //       center: ['50%', '50%'],
  //     }
  //   },
  //   legend: { //범례
  //     itemStyle: {
  //       fontWeight: 'bold',
  //       fontSize: '13px'
  //     }
  //   },
  //   colors: ['#f45b5b', '#8085e9', '#8d4654', '#7798BF', '#aaeeee',
  //     '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
  //   series: [{
  //     type: 'pie',
  //     name: 'Browser share',
  //     innerSize: '50%',
  //     data: [
  //       [`${percentageDailyPower}%`, percentageDailyPower],
  //       [`${remainDailyPower}%`, remainDailyPower],
  //     ]
  //   }],
  //   credits: {
  //     enabled: false,
  //   }
  // });
  // var dailyPowerChart = Highcharts.chart('chart_div_2', Highcharts.merge(gaugeOptions, {
  //   yAxis: {
  //     min: 0,
  //     max: powerGenerationInfo.currKwYaxisMax * 6,
  //     tickPositioner: function () {
  //       return [this.min, this.max];
  //     },
  //     title: {
  //       text: ''
  //     }
  //   },
  //   credits: {
  //     enabled: false
  //   },
  //   series: [{
  //     name: '금일 발전량',
  //     data: [Number(powerGenerationInfo.dailyPower.toFixed(2))],
  //     dataLabels: {
  //       format: '<div style="text-align:center"><span style="font-size:25px;color:' +
  //         ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y}</span><br/>' +
  //         '<span style="font-size:12px;color:silver">kWh</span></div>'
  //     },
  //     tooltip: {
  //       valueSuffix: 'kWh'
  //     }
  //   }]
  // }));
}
/**
 * @param {Object} chartOption
 * @param {string} chartOption.domId
 * @param {Object} chartOption.title
 * @param {string} chartOption.title.text
 * @param {Object} chartOption.subtitle
 * @param {string=} chartOption.subtitle.text
 * @param {Object} chartOption.xAxis
 * @param {string[]} chartOption.xAxis.categories x축 좌표 Column 값
 * @param {Object[]} chartOption.yAxis
 * @param {Object} chartOption.yAxis.labels
 * @param {string} chartOption.yAxis.labels.format '{value} °C',
 * @param {Object} chartOption.yAxis.labels.style
 * @param {string} chartOption.yAxis.labels.style.color Highcharts.getOptions().colors[1]
 * @param {number=} chartOption.yAxis.min y 축 최소값
 * @param {number} chartOption.yAxis.max
 * @param {number} chartOption.yAxis.tickInterval
 * @param {number} chartOption.yAxis.tickAmount
 * @param {Object} chartOption.yAxis.title
 * @param {string} chartOption.yAxis.title.text y축 단위
 * @param {boolean} chartOption.yAxis.opposite y축 범례 우측 여부
 * @param {Object[]} chartOption.series
 * @param {string} chartOption.series.name
 * @param {number[]} chartOption.series.data
 * @param {number} chartOption.series.yAxis 0: left, 1: right
 * @param {string=} chartOption.series.color 카테고리 색상
 * @param {Object} chartOption.series.tooltip
 * @param {string} chartOption.series.tooltip.valueSuffix Data Unit
 */


function makeColumnChart(chartOption) {
  // console.log(chartOption.yAxis);
  Highcharts.chart(chartOption.domId, {
    chart: {
      type: 'column'
    },
    title: {
      text: _.get(chartOption, 'title.text', '')
    },
    subtitle: {
      text: _.get(chartOption, 'subtitle.text', '')
    },
    xAxis: {
      categories: chartOption.xAxis.categories,
      crosshair: true
    },
    yAxis: chartOption.yAxis,
    tooltip: {
      shared: true,
      useHTML: true
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0
      },
      series: {
        threshold: -20
      }
    },
    series: chartOption.series,
    credits: {
      enabled: false
    }
  });
}

Highcharts.setOptions({
  lang: {
    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    shortMonths: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
    weekdays: ['월', '화', '수', '목', '금', '토', '일']
  }
});
/**
 * @param {Object} chartInfo
 * @param {string} chartInfo.domId
 * @param {string=} chartInfo.title
 * @param {string=} chartInfo.subtitle
 * @param {Object} chartInfo.xAxis
 * @param {string=} chartInfo.xAxis.title
 * @param {Object[]} chartInfo.yAxis
 * @param {string=} chartInfo.yAxis.title
 * @param {string=} chartInfo.yAxis.dataUnit
 * @param {Object=} chartInfo.plotSeries
 * @param {number} chartInfo.plotSeries.pointStart 시작 UTC
 * @param {number} chartInfo.plotSeries.pointInterval 시간 Interval
 * @param {Object[]} chartInfo.series
 * @param {string} chartInfo.series.name
 * @param {number[]} chartInfo.series.data
 * @param {number} chartInfo.series.yAxis 0: left, 1: right
 * @param {string=} chartInfo.series.color 카테고리 색상
 * @param {Object} chartInfo.series.tooltip
 * @param {string} chartInfo.series.tooltip.valueSuffix Data Unit
 */

function makeLineChart(chartInfo) {
  var isAreaChart = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (chartInfo.series.length) {
    var lineChartInfo = {
      chart: {
        type: 'spline',
        zoomType: 'xy'
      },
      title: {
        text: _.get(chartInfo, 'title', '')
      },
      subtitle: {
        text: _.get(chartInfo, 'subtitle', '')
      },
      xAxis: {
        title: {// text: chartDecorator.xAxisTitle
        },
        type: 'datetime',
        // tickWidth: 0,
        // gridLineWidth: 1,
        dateTimeLabelFormats: {
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M',
          day: '%m-%e',
          week: '%m-%e',
          month: '%y-%m',
          year: '%Y'
        }
      },
      yAxis: [{
        // left y axis
        title: {
          text: _.get(chartInfo, 'yAxis[0].yTitle', '')
        },
        labels: {
          align: 'left',
          x: 3,
          y: 16,
          format: "{value:.,0f}".concat(_.get(chartInfo, 'yAxis[0].dataUnit', ''))
        },
        showFirstLabel: false
      }, {
        // right y axis
        // linkedTo: 0,
        // gridLineWidth: 0,
        opposite: true,
        title: {
          text: _.get(chartInfo, 'yAxis[1].yTitle', '')
        },
        labels: {
          align: 'right',
          x: -3,
          y: 16,
          format: "{value:.,0f}".concat(_.get(chartInfo, 'yAxis[1].dataUnit', ''))
        },
        showFirstLabel: false
      }],
      legend: {
        align: 'left',
        // verticalAlign: 'top',
        borderWidth: 0
      },
      tooltip: {
        valueDecimals: 2,
        shared: true // crosshairs: true

      },
      plotOptions: {
        spline: {
          marker: {
            radius: 4,
            lineColor: '#666666',
            lineWidth: 1
          }
        },
        series: {
          turboThreshold: 0
        } // _.assign({ turboThreshold: 0 }, _.get(chartInfo, 'plotSeries', {})),

      },
      series: chartInfo.series,
      credits: {
        enabled: false
      }
    };

    if (_.isNumber(_.get(chartInfo, 'plotSeries.pointStart'))) {
      _.assign(lineChartInfo.plotOptions.spline, _.get(chartInfo, 'plotSeries'));
    }

    Highcharts.chart(chartInfo.domId, lineChartInfo);
  } else {
    $("#".concat(chartInfo.domId)).html("<h2>".concat(chartInfo.title, "</h2><h3>\uB0B4\uC5ED\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</h3>"));
  }
}
/**
 * @param {Object} chartInfo
 * @param {string} chartInfo.domId
 * @param {string=} chartInfo.title
 * @param {string=} chartInfo.subtitle
 * @param {Object} chartInfo.xAxis
 * @param {string=} chartInfo.xAxis.title
 * @param {Object[]} chartInfo.yAxis
 * @param {string=} chartInfo.yAxis.title
 * @param {string=} chartInfo.yAxis.dataUnit
 * @param {Object=} chartInfo.plotSeries
 * @param {number} chartInfo.plotSeries.pointStart 시작 UTC
 * @param {number} chartInfo.plotSeries.pointInterval 시간 Interval
 * @param {Object[]} chartInfo.series
 * @param {string} chartInfo.series.name
 * @param {number[]} chartInfo.series.data
 * @param {number} chartInfo.series.yAxis 0: left, 1: right
 * @param {string=} chartInfo.series.color 카테고리 색상
 * @param {Object} chartInfo.series.tooltip
 * @param {string} chartInfo.series.tooltip.valueSuffix Data Unit
 */


function makeAreaChart(chartInfo) {
  if (chartInfo.series.length) {
    var areaChartInfo = {
      chart: {
        type: 'area',
        zoomType: 'xy'
      },
      title: {
        text: _.get(chartInfo, 'title', '')
      },
      subtitle: {
        text: _.get(chartInfo, 'subtitle', '')
      },
      xAxis: {
        title: {// text: chartDecorator.xAxisTitle
        },
        type: 'datetime',
        // tickWidth: 0,
        // gridLineWidth: 1,
        dateTimeLabelFormats: {
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M',
          day: '%m-%e',
          week: '%m-%e',
          month: '%y-%m',
          year: '%Y'
        }
      },
      yAxis: [{
        // left y axis
        title: {
          text: _.get(chartInfo, 'yAxis[0].yTitle', '')
        },
        labels: {
          align: 'left',
          x: 3,
          y: 16,
          format: "{value:.,0f}".concat(_.get(chartInfo, 'yAxis[0].dataUnit', ''))
        },
        showFirstLabel: false
      }, {
        // right y axis
        // linkedTo: 0,
        // gridLineWidth: 0,
        opposite: true,
        title: {
          text: _.get(chartInfo, 'yAxis[1].yTitle', '')
        },
        labels: {
          align: 'right',
          x: -3,
          y: 16,
          format: "{value:.,0f}".concat(_.get(chartInfo, 'yAxis[1].dataUnit', ''))
        },
        showFirstLabel: false
      }],
      legend: {
        align: 'left',
        // verticalAlign: 'top',
        borderWidth: 0,
        enabled: false
      },
      tooltip: {
        valueDecimals: 2,
        shared: true // crosshairs: true

      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1
            },
            stops: [[0, Highcharts.getOptions().colors[0]], [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]]
          },
          marker: {
            enabled: false,
            symbol: 'circle',
            radius: 2,
            states: {
              hover: {
                enabled: true
              }
            }
          }
        } // series: _.assign({ turboThreshold: 0 }, _.get(chartInfo, 'plotSeries', {})),

      },
      series: chartInfo.series,
      credits: {
        enabled: false
      }
    };

    if (_.isNumber(_.get(chartInfo, 'plotSeries.pointStart'))) {
      _.assign(areaChartInfo.plotOptions.area, _.get(chartInfo, 'plotSeries'));
    }

    Highcharts.chart(chartInfo.domId, areaChartInfo);
  } else {
    $("#".concat(chartInfo.domId)).html("<h2>".concat(chartInfo.title, "</h2><h3>\uB0B4\uC5ED\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</h3>"));
  }
}