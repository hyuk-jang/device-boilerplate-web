/**
 * vip default img setting
 */
function vipInit() {
  var svgCanvas = SVG.get('#svgCanvas');
  console.log(svgCanvas);

  // 저수지 물결
  svgCanvas
    .image('../../image/vip/resorviorWave.gif')
    .move(1258, 30)
    .attr({ id: 'resorviorWave', opacity: 0.2 });

  // 증발지 1 물결
  svgCanvas
    .image('../../image/vip/normalEvaporationAWave.gif')
    .move(922, 26)
    .attr({ id: 'normalEvaporationAWave', opacity: 0.2 });

  // 증발지2 물결
  svgCanvas
    .image('../../image/vip/normalEvaporationBWave.gif')
    .move(762, 27)
    .attr({ id: 'normalEvaporationBWave', opacity: 0.2 });

  // 해주1 물결
  svgCanvas
    .image('../../image/vip/brineWarehouseAWave.gif')
    .move(605, 29)
    .attr({ id: 'brineWarehouseAWave', opacity: 0.2 });

  // 모듈 물결
  svgCanvas
    .image('../../image/vip/moduleWave.gif')
    .move(228, 23)
    .backward()
    .attr({ id: 'moduleWave', opacity: 0.2 });

  // 해주2 물결
  svgCanvas
    .image('../../image/vip/brineWarehouseBWave.gif')
    .move(81, 300)
    .attr({ id: 'brineWarehouseBWave', opacity: 0.2 });

  // 레인 모드 폭포
  svgCanvas
    .image('../../image/vip/rainModeWaterfull.gif')
    .move(4, 10)
    .attr({ id: 'rainModeWaterfull', opacity: 0 });

  // 증발지1 폭포
  svgCanvas
    .image('../../image/vip/waterfallRight.gif')
    .move(1146, 30)
    .attr({ id: 'normalEvaAwaterfull', opacity: 0 });

  // 증발지2 폭포
  svgCanvas
    .image('../../image/vip/waterfallRight.gif')
    .move(836, 30)
    .attr({ id: 'normalEvaBWaterfull', opacity: 0 });

  // 해주1 폭포
  svgCanvas
    .image('../../image/vip/brineWHAWaterfull.gif')
    .move(4, 10)
    .attr({ id: 'brineWHAWaterfull', opacity: 0 });

  // 결정지 폭포
  svgCanvas
    .image('../../image/vip/waterfallRight.gif')
    .move(105, 30)
    .attr({ id: 'normalCrystalWaterfull', opacity: 0 });

  // 모듈 폭포
  svgCanvas
    .image('../../image/vip/moduleWaterfull.gif')
    .move(500, 22)
    .attr({ id: 'systemAWaterfull', opacity: 0 });
  svgCanvas
    .image('../../image/vip/moduleWaterfull.gif')
    .move(500, 222)
    .attr({ id: 'systemBWaterfull', opacity: 0 });
  svgCanvas
    .image('../../image/vip/moduleWaterfull.gif')
    .move(500, 426)
    .attr({ id: 'systemCWaterfull', opacity: 0 });
  svgCanvas
    .image('../../image/vip/moduleWaterfull.gif')
    .move(500, 630)
    .attr({ id: 'systemDWaterfull', opacity: 0 });

  // 해주2 폭포
  svgCanvas
    .image('../../image/vip/waterfallRight.gif')
    .move(110, 350)
    .rotate(270)
    .scale(0.8)
    .attr({ id: 'brineWHBWaterfull', opacity: 0 });
}

// reset 모든 animation default 값으로 초기화
function resetWave() {
  SVG.get('#resorviorWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#normalEvaporationAWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#normalEvaporationBWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#brineWarehouseAWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#moduleWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#brineWarehouseBWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0.2 });

  SVG.get('#rainModeWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#normalEvaAwaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#normalEvaBWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#brineWHAWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#normalCrystalWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#systemAWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#systemBWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#systemCWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#systemDWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#normalCrystalWaterfull')
    .animate({
      duraton: 1000,
      when: 'now',
    })
    .attr({ opacity: 0 });

  SVG.get('#brineWHBWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({
      opacity: 0,
    });
}

// rain mode
function startRainMode(isTrue) {
  SVG.get('#rainModeWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#brineWarehouseAWave')
    .animate({
      duration: 6000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.5 : 0.2 });

  SVG.get('#brineWarehouseBWave')
    .animate({
      duration: 6000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.5 : 0.2 });

  SVG.get('#normalEvaporationAWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0 : 0.2 });

  SVG.get('#normalEvaporationBWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0 : 0.2 });

  SVG.get('#moduleWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0 : 0.2 });
}

// 저수지 > 증발지 1 흐름 표현
function flowToNormalEvaporationA(isTrue) {
  SVG.get('#normalEvaAwaterfull')
    .move(1146, 30)
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#normalEvaporationAWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.4 : 0.2 });
}

// 증발지1 > 증발지2  흐름 표현
function flowToNormalEvaporationB(isTrue) {
  SVG.get('#normalEvaBWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#normalEvaporationBWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.4 : 0.2 });
}

// 증발지2 > 해주1  흐름 표현
function flowToBrineWarehouseA(isTrue) {
  SVG.get('#brineWHAWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#brineWarehouseAWave')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.4 : 0.2 });
}

// 해주1 > 모듈  흐름 표현
function flowToModule(isTrue) {
  SVG.get('#systemAWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#systemBWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#systemCWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#systemDWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#moduleWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.4 : 0.2 });
}

// 모듈 > 결정지  흐름 표현
function flowToNormalCrystal(isTrue) {
  SVG.get('#normalCrystalWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });
}

// 결정지 > 해주2  흐름 표현
function flowToBrineWarehouseB(isTrue) {
  SVG.get('#brineWHBWaterfull')
    .animate({
      duration: 1000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 1 : 0 });

  SVG.get('#brineWarehouseBWave')
    .animate({
      duration: 9000,
      when: 'now',
    })
    .attr({ opacity: isTrue ? 0.4 : 0.2 });
}

// 통합 이벤트
function startFlowAnimation(stepId, isStart = true) {
  switch (stepId) {
    case 'rainMode':
      startRainMode(isStart, isStart);
      break;
    case 'flowToNormalEvaporationA':
      flowToNormalEvaporationA(isStart, isStart);
      break;
    case 'flowToNormalEvaporationB':
      flowToNormalEvaporationB(isStart, isStart);
      break;
    case 'flowToBrineWarehouseA':
      flowToBrineWarehouseA(isStart, isStart);
      break;
    case 'flowToModule':
      flowToModule(isStart, isStart);
      break;
    case 'flowToNormalCrystal':
      flowToNormalCrystal(isStart, isStart);
      break;
    case 'flowToBrineWarehouseB':
      flowToBrineWarehouseB(isStart, isStart);
      break;
    case 'flowReset':
      resetWave();
      break;
    default:
      break;
  }
}
