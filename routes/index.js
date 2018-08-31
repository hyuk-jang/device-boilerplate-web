const express = require('express');
const asyncHandler = require('express-async-handler');

const router = express.Router();

const {BU} = require('base-util-jh');

// server middleware
// router.use(
//   asyncHandler(async (req, res, next) => {
//     next();
//   }),
// );
const app = express();

/* GET home page. */
router.get('/', (req, res, next) => {
  BU.CLI(app.get('dbInfo'));
  res.render('index', {title: 'Express'});
});

router.get(
  '/main',
  asyncHandler(async (req, res, next) => {
    console.log(global.app.get('dbInfo'));
    res.render('./main/index', req.locals);
  }),
);

router.get(
  '/ess',
  asyncHandler(async (req, res, next) => {
    console.log(global.app.get('dbInfo'));
    return res.render('./templates/ESS/index.ejs', req.locals);
  }),
);

module.exports = router;
