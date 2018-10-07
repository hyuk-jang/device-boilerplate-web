const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const { BU } = require('base-util-jh');

const users = require('./users/users');

router.use('/users', users);

// server middleware
router.use(
  asyncHandler(async (req, res, next) => {
    BU.CLI('middile Ware');
    next();
  }),
);

/* GET home page. */
router.get('/', (req, res) => {
  BU.CLI(global.app.get('dbInfo'));
  res.render('index', { title: 'Express' });
});

router.get(
  '/main',
  asyncHandler(async (req, res) => {
    console.log(global.app.get('dbInfo'));
    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/ess',
  asyncHandler(async (req, res) => {
    console.log(global.app.get('dbInfo'));
    return res.render('./templates/ESS/index.ejs', req.locals);
  }),
);

module.exports = router;
