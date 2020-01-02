// process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'development';

process.env.NODE_ENV === 'development' && require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');

const app = express();

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const favicon = require('serve-favicon');

const { BU } = require('base-util-jh');

const indexRouter = require('./routes/index');

const authRouter = require('./routes/auth');

const appIndexRouter = require('./routes/app/index');
const appAuthRouter = require('./routes/app/appAuth');

const passport = require('./bin/passport');
const {
  dbInfo,
  projectInfo: { projectMainId },
} = require('./bin/config');

const BiAuth = require('./models/templates/auth/BiAuth');
const BiModule = require('./models/templates/BiModule');
const BiDevice = require('./models/templates/BiDevice');
const PowerModel = require('./models/templates/PowerModel');
const WeatherModel = require('./models/templates/WeatherModel');
const BlockModel = require('./models/templates/BlockModel');
const RefineModel = require('./models/templates/RefineModel');

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    limit: 1024 * 1024 * 1, // 1mb 까지 허용
    extended: true,
  }),
);
app.use(methodOverride('_method'));

app.use(flash());

/**
 * Set Customize
 */

let faviPath = '';
switch (projectMainId) {
  case 'FP':
    faviPath = 'fp.ico';
    break;
  case 'S2W':
  case 'HS':
    faviPath = 's2w.ico';
    break;
  case 'UPSAS':
    faviPath = 'kepco.ico';
    break;
  default:
    faviPath = 'favicon.ico';
    break;
}

app.use(favicon(path.resolve('public/image/icon', faviPath)));
app.set('dbInfo', dbInfo);
app.set('biAuth', new BiAuth(dbInfo));
app.set('biModule', new BiModule(dbInfo));
app.set('biDevice', new BiDevice(dbInfo));
app.set('powerModel', new PowerModel(dbInfo));
app.set('weatherModel', new WeatherModel(dbInfo));
app.set('blockModel', new BlockModel(dbInfo));
app.set('refineModel', new RefineModel(dbInfo));

app.use(helmet());
const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
app.use(
  session({
    secret: BU.GUID(),
    store: new MySQLStore(dbInfo),
    resave: false,
    saveUninitialized: true,
    cookie: {
      // maxAge: 1000 * 60 * 60 * 24, // 1일
      // expires - 지속적 쿠키에 대한 만기 날짜를 설정하는 데 사용됩니다.
      expires: expiryDate,
      // // secure - 브라우저가 HTTPS를 통해서만 쿠키를 전송하도록 합니다.
      // secure: true,
      // // httpOnly - 쿠키가 클라이언트 JavaScript가 아닌 HTTP(S)를 통해서만 전송되도록 하며, 이를 통해 XSS(Cross-site scripting) 공격으로부터 보호할 수 있습니다.
      // httpOnly: true,
    },
  }),
);

app.set('passport', passport(app, dbInfo));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.engine('html', require('ejs').renderFile);

if (app.get('env') === 'development') {
  // app.use(logger('dev'));
  // app.use(
  //   logger('dev'),
  //   logger(':method :url :status :response-time ms - :res[content-length]'),
  //   (req, res, next) => {
  //     next();
  //   },
  // );
}

app.use(express.json());
// app.use(express.urlencoded({extended: `fa`lse}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// cctv 카메라 스냅샷 저장 경로
app.use(
  '/snapshot',
  express.static(path.join(__dirname, 'snapshot'), {
    extensions: ['jpg'],
  }),
);
// 맵 이미지 저장 경로
app.use(
  '/map',
  express.static(path.join(__dirname, 'map'), {
    extensions: ['jpg', 'png', 'gif'],
  }),
);

app.use('/auth', authRouter);
app.use('/', indexRouter);
app.use('/app/auth', appAuthRouter);
app.use('/app', appIndexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
