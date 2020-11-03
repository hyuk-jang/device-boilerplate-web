module.exports = {
  mainInfo: {
    mainId: 'HS',
    subId: '',
    viewInfo: {
      titleInfo: {
        titleName: '농가 보급형 태양광',
        faviconPath: 's2w.ico',
      },
      homeInfo: {
        homeName: '농가 보급형 태양광',
        homeImgPath: 's2w_logo.png',
      },
      contentsInfo: {
        bgImgPath: 'bg_fp.jpg',
      },
    },
    naviList: [
      {
        href: 'main',
        name: '메인',
      },
      {
        href: 'control',
        name: '제어',
      },
      {
        href: 'inverter',
        name: '인버터',
      },
      {
        href: 'sensor',
        name: '생육환경',
      },
      {
        href: 'trend',
        name: '트렌드',
      },
      {
        href: 'report',
        name: '레포트',
      },
      {
        href: 'admin',
        name: '관리',
        grade: ['admin'],
      },
    ],
  },
};
