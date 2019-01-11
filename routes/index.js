const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const admin = require('./admin/users');
// const manager = require('./manager/users');
// const owner = require('./owner/users');
// const guest = require('./guest/users');
const users = require('./users');
const Ean = require('./Ean');

let selectedRouter;
switch (process.env.DEV_CATEGORY) {
  case 'FP':
    selectedRouter = users;
    break;
  case 'Ean':
    selectedRouter = Ean;
    break;
  default:
    selectedRouter = users;
    break;
}

// router.use('/', users);

// server middleware
router.use((req, res, next) => {
  // BU.CLI('Main Middile Ware', req.user);
  if (global.app.get('auth')) {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
  }

  next();
});

// router.get('/', (req, res) => {
//   BU.CLI(req.user);
//   res.send('default main');
// });

router.get('/intersection', (req, res) => {
  const grade = _.get(req, 'user.grade');
  switch (grade) {
    // case 'admin':
    //   router.use('/admin', admin);
    //   res.redirect('/admin');
    //   break;
    default:
      router.use('/', selectedRouter);
      _.isString(process.env.DEV_PAGE)
        ? res.redirect(`/${process.env.DEV_PAGE}`)
        : res.redirect('/main');
      break;
  }
});

/* GET home page. */
// router.get('/', (req, res) => {
//   // BU.CLI(global.app.get('dbInfo'));
//   // res.render('index', { title: 'Express' });
// });

// router.get(
//   '/main',
//   asyncHandler(async (req, res) => {
//     BU.CLIN(req.user);
//     res.render('./main/index', req.locals);
//   }),
// );

router.get(
  '/home',
  asyncHandler(async (req, res) => {
    res.render('./templates/Ean/main', req.locals);
  }),
);

module.exports = router;
