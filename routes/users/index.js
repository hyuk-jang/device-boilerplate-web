const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const main = require('./main');
const trend = require('./trend');
const users = require('./users');

const webUtil = require('../../models/templates/web.util');

router.use('/main', main);
router.use('/trend', trend);

router.use('/users', users);

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     const user = _.get(req, 'user', {});
//     next();
//   }),
// );

// router.use((req, res, next) => {
//   BU.CLI('hi');
//   // res.send('respond with a resource');
//   next();
// });

/* GET users listing. */
router.get('/', (req, res, next) => {
  BU.CLI(process.env.DEV_PAGE);
  if (_.isString(process.env.DEV_PAGE)) {
    res.redirect(`/${process.env.DEV_PAGE}`);
  } else {
    res.redirect('/main');
  }
});

module.exports = router;
