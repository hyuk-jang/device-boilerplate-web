const gaugeOptions = {
  chart: {
    type: 'solidgauge',
    backgroundColor: 'none',
  },
  title: null,
  pane: {
    center: ['50%', '85%'],
    size: '140%',
    startAngle: -90,
    endAngle: 90,
    background: {
      backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#fff',
      innerRadius: '60%',
      outerRadius: '100%',
      shape: 'arc',
    },
  },
  tooltip: {
    enabled: false,
  },
  // the value axis
  yAxis: {
    stops: [
      [0.1, '#55BF3B'], // green
      [0.5, '#DDDF0D'], // yellow
      [0.9, '#DF5353'], // red
    ],
    lineWidth: 0,
    minorTickInterval: null,
    tickAmount: 2,
    title: {
      y: -70,
    },
    labels: {
      y: 16,
    },
  },
  plotOptions: {
    solidgauge: {
      dataLabels: {
        y: 10,
        borderWidth: 0,
        useHTML: true,
      },
    },
  },
};

/**
 *
 * @param {{domId: string, yAxis: {min: number=, max: number, title: string}, series: {name: string, data: number[], tooltip: {valueSuffix: string}} }} gaugeData
 */
function makeGaugeChart(
  gaugeData = {
    domId: '',
    yAxis: {
      min: 0,
      max: null,
      title: '',
    },
    series: {
      name: '',
      data: [],
      tooltip: {
        valueSuffix: '',
      },
    },
  },
) {
  const { domId, yAxis, series } = gaugeData;

  Highcharts.chart(
    domId,
    Highcharts.merge(gaugeOptions, {
      yAxis: {
        min: yAxis.min,
        max: yAxis.max,
        tickPositioner() {
          return [this.min, this.max];
        },
        title: {
          text: yAxis.title,
        },
      },
      credits: {
        enabled: false,
      },
      series: [
        {
          name: series.name,
          data: [series.data],
          dataLabels: {
            format: `<div style="text-align:center"><span style="font-size:25px;color:${(Highcharts.theme &&
              Highcharts.theme.contrastTextColor) ||
              'black'}">{y}</span><br/>
              <span style="font-size:12px;color:silver">${series.tooltip.valueSuffix}</span></div>`,
          },
          tooltip: {
            valueSuffix: series.tooltip.valueSuffix,
          },
        },
      ],
    }),
  );
}


/**
 * 
 * @param {*} powerGenerationInfo 
 * @param {*} domId 
 */
function makeGaugeChart2(powerGenerationInfo, domId) {
  // console.dir(powerGenerationInfo);

  let currKw = _.get(powerGenerationInfo, 'out_kw', '');
  let currKwYaxisMax = _.get(powerGenerationInfo, 'amount',);
  let percentageKw = _.round(_.multiply(_.divide(currKw, currKwYaxisMax), 100), 2);
  let maxKw = _.round(_.subtract(100, percentageKw), 2);

  // let todayMaxKw = _.multiply(currKwYaxisMax, 6);
  // let dailyPower = _.round(_.get(powerGenerationInfo, 'dailyPower'), 2);

  // let percentageDailyPower = _.round(_.multiply(_.divide(dailyPower, todayMaxKw), 100), 2);
  // let remainDailyPower = _.round(_.subtract(100, percentageDailyPower), 2);

  // var powerGenerationInfo = mainData.powerGenerationInfo;
  Highcharts.chart(domId, {
    chart: {
      plotBackgroundColor: null,
      plotBorderWidth: 0,
      plotShadow: false,
      backgroundColor: 'none',
      // Edit chart spacing
      spacingBottom: 15,
      spacingTop: 10,
      spacingLeft: -100,
      spacingRight: 10,
    },
    title: {
      text: `발전<br/>${currKw} kW`,
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
        center: ['50%', '50%'],
      }
    },
    colors: ['#f45b5b', '#8085e9', '#8d4654', '#7798BF', '#aaeeee',
      '#ff0066', '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],    
    series: [{
      type: 'pie',
      name: 'Browser share',
      innerSize: '50%',
      data: [
        [`${percentageKw}%`, percentageKw],
        ['', maxKw],
        
      ]
    }],
    credits: {
      enabled: false,
    }
  });

  // Highcharts.chart('chart_div_2', {
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