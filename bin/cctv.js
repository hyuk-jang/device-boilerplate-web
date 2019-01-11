// const { BU } = require('base-util-jh');

const RtspStream = require('node-rtsp-stream');

const stream = new RtspStream({
  name: 'test',
  streamUrl: 'rtsp://smsoft.iptime.org:30554/live.sdp',
  // streamUrl: "rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov",
  // streamUrl: "rtsp://184.72.239.149/vod/mp4:BigBuckBunny_115k.mov",
  wsPort: 9999,
  ffmpegOptions: {
    // options ffmpeg flags
    // '-stats': '', // an option with no neccessary value uses a blank string
    // '-force_fps': 30, // options with required values specify the value after the key
  },
});

module.exports = stream;
